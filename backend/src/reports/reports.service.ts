import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Report, ReportStatus, SensorData } from '@prisma/client';
import { CreateReportDto } from './dto/create-report.dto';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EventsGateway } from '../events/events.gateway';

// Extiende la interfaz de jsPDF para que reconozca el plugin autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * @interface ReportStats
 * @description Define la estructura de las estadísticas calculadas para el resumen del reporte.
 */
interface ReportStats {
  avg: number;
  min: number;
  max: number;
  count: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly logoBase64: string;

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {
    try {
      const logoPath = path.resolve(__dirname, '..', 'assets', 'logo-sena.png');
      if (fs.existsSync(logoPath)) {
        this.logoBase64 = fs.readFileSync(logoPath, 'base64');
      } else {
        this.logger.error(`El logo no se encontró en la ruta: ${logoPath}. Asegúrate de que el archivo exista en 'backend/src/assets/logo-sena.png' y que se copie al compilar.`);
        this.logoBase64 = '';
      }
    } catch (error) {
      this.logger.error('No se pudo cargar el logo para los reportes.', error);
      this.logoBase64 = '';
    }
  }

  async create(createReportDto: CreateReportDto, user: User): Promise<Report> {
    const newReport = await this.prisma.report.create({
      data: {
        title: createReportDto.title,
        type: createReportDto.type,
        userId: user.id,
        parameters: JSON.stringify({
          tankId: createReportDto.tankId,
          sensorIds: createReportDto.sensorIds,
          startDate: createReportDto.startDate,
          endDate: createReportDto.endDate,
        }),
        status: ReportStatus.PENDING,
      },
    });

    this.processReportGeneration(newReport.id).catch(error => {
      this.logger.error(`Fallo en el procesamiento en segundo plano del reporte ${newReport.id}:`, error);
    });

    return newReport;
  }
  
  async findOne(id: string, user: User): Promise<Report> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }
    if (user.role !== 'ADMIN' && report.userId !== user.id) {
        throw new ForbiddenException('No tienes permisos para acceder a este reporte.');
    }
    return report;
  }

  async findAll(currentUser: User, targetUserId?: string): Promise<Report[]> {
    const whereClause: { userId?: string } = {};
    if (currentUser.role !== 'ADMIN') {
      whereClause.userId = currentUser.id;
    } else if (targetUserId) {
      whereClause.userId = targetUserId;
    }
    return this.prisma.report.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
      },
    });
  }


  async generateFileFromData(report: Report, format: 'pdf' | 'xlsx'): Promise<{ filePath: string, title: string }> {
    const dataFilePath = report.filePath;
    if (!dataFilePath || !fs.existsSync(dataFilePath)) {
      this.logger.error(`Archivo de datos no encontrado para el reporte ${report.id} en la ruta: ${dataFilePath}`);
      throw new InternalServerErrorException('Los datos del reporte no existen o están corruptos.');
    }
    
    const rawData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    const parameters = JSON.parse(report.parameters as string);
    const [tank, sensors] = await Promise.all([
      this.prisma.tank.findUnique({ where: { id: parameters.tankId } }),
      this.prisma.sensor.findMany({ where: { id: { in: parameters.sensorIds } } })
    ]);

    if (!tank) {
        throw new NotFoundException(`El tanque con ID ${parameters.tankId} asociado al reporte ya no existe.`);
    }

    const reportContext = { tank, sensors };

    const directoryPath = path.resolve(__dirname, '../../reports/generated');
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
    
    let outputFilePath;
    if (format === 'pdf') {
        outputFilePath = await this.generatePdfFile(report, rawData, directoryPath, reportContext);
    } else if (format === 'xlsx') {
        outputFilePath = await this.generateExcelFile(report, rawData, directoryPath, reportContext);
    } else {
        throw new NotFoundException('Formato de descarga no válido.');
    }

    return { filePath: outputFilePath, title: report.title };
  }
  
  private calculateStatistics(rawData: SensorData[]): Map<string, ReportStats> {
    const statsMap = new Map<string, { sum: number; min: number; max: number; count: number }>();
    
    rawData.forEach(item => {
      if (!statsMap.has(item.type)) {
        statsMap.set(item.type, { sum: 0, min: Infinity, max: -Infinity, count: 0 });
      }
      const stats = statsMap.get(item.type)!;
      stats.sum += item.value;
      stats.count++;
      if (item.value < stats.min) stats.min = item.value;
      if (item.value > stats.max) stats.max = item.value;
    });

    const finalStats = new Map<string, ReportStats>();
    statsMap.forEach((value, key) => {
      finalStats.set(key, {
        count: value.count,
        avg: value.count > 0 ? value.sum / value.count : 0,
        min: value.count > 0 ? value.min : 0,
        max: value.count > 0 ? value.max : 0,
      });
    });

    return finalStats;
  }
  
  private async generateExcelFile(report: Report, rawData: SensorData[], outputPath: string, context: any): Promise<string> {
    const wb = XLSX.utils.book_new();
    const parameters = JSON.parse(report.parameters as string);
    
    const summaryHeader = [
      "Reporte de Monitoreo Acuático - SENA",
      `Título: ${report.title}`,
      `Tanque: ${context.tank?.name || 'N/A'}`,
      `Período: ${format(new Date(parameters.startDate + 'T00:00:00'), 'dd/MM/yyyy')} - ${format(new Date(parameters.endDate + 'T00:00:00'), 'dd/MM/yyyy')}`,
      `Generado el: ${format(new Date(), "dd/MM/yyyy HH:mm")}`
    ];
    
    const stats = this.calculateStatistics(rawData);
    const statsData = [
      ["Tipo de Sensor", "Nº Registros", "Promedio", "Mínimo", "Máximo"]
    ];
    stats.forEach((s, type) => {
      statsData.push([type, s.count, s.avg.toFixed(2), s.min.toFixed(2), s.max.toFixed(2)]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet([summaryHeader, [], ...statsData]);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

    const formattedData = rawData.map(item => ({
        'Fecha y Hora': format(new Date(item.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        'Valor': item.value,
        'Tipo': item.type,
        'Sensor': context.sensors.find(s => s.id === item.sensorId)?.name || item.sensorId,
    }));
    const wsData = XLSX.utils.json_to_sheet(formattedData);
    
    // Añadir AutoFiltro
    wsData['!autofilter'] = { ref: XLSX.utils.encode_range(XLSX.utils.decode_range(wsData['!ref'])) };
    wsData['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsData, "Datos Crudos");
    
    const filePath = path.join(outputPath, `reporte-${report.id}.xlsx`);
    XLSX.writeFile(wb, filePath);
    return filePath;
  }

  private async generatePdfFile(report: Report, rawData: SensorData[], outputPath: string, context: any): Promise<string> {
    const doc = new jsPDF();
    const parameters = JSON.parse(report.parameters as string);
    const pageHeight = doc.internal.pageSize.height;
    
    if (this.logoBase64) {
      doc.addImage(`data:image/png;base64,${this.logoBase64}`, 'PNG', 15, 12, 20, 20);
    }
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Monitoreo Acuático', 105, 20, { align: 'center' });
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text('Servicio Nacional de Aprendizaje - SENA', 105, 27, { align: 'center' });
    
    doc.setFontSize(12); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
    doc.text('Título:', 15, 45); doc.setFont('helvetica', 'normal');
    doc.text(report.title, 40, 45, { maxWidth: 150 });
    doc.setFont('helvetica', 'bold');
    doc.text('Período:', 15, 52); doc.setFont('helvetica', 'normal');
    doc.text(`${format(new Date(parameters.startDate + 'T00:00:00'), 'dd/MM/yyyy')} al ${format(new Date(parameters.endDate + 'T00:00:00'), 'dd/MM/yyyy')}`, 40, 52);
    
    const stats = this.calculateStatistics(rawData);
    const statsBody = Array.from(stats.entries()).map(([type, s]) => [type, s.count, s.avg.toFixed(2), s.min.toFixed(2), s.max.toFixed(2)]);
    
    autoTable(doc, { startY: 60, head: [['Tipo de Sensor', 'Nº Registros', 'Promedio', 'Mínimo', 'Máximo']], body: statsBody, theme: 'grid', headStyles: { fillColor: [57, 169, 0] }, });

    const tableBody = rawData.slice(0, 500).map(item => [
        format(new Date(item.timestamp), 'dd/MM/yy HH:mm', { locale: es }),
        item.type,
        item.value.toFixed(2),
        context.sensors.find(s => s.id === item.sensorId)?.name || 'N/A'
    ]);

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Fecha/Hora', 'Tipo', 'Valor', 'Sensor']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [255, 103, 31] },
    });

    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        const text = `Página ${i} de ${pageCount} | Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`;
        doc.text(text, doc.internal.pageSize.width / 2, pageHeight - 10, { align: 'center' });
    }
    
    const filePath = path.join(outputPath, `reporte-${report.id}.pdf`);
    const pdfBuffer = doc.output('arraybuffer');
    fs.writeFileSync(filePath, Buffer.from(pdfBuffer));
    return filePath;
  }

  private async processReportGeneration(reportId: string): Promise<void> {
    let updatedReport: Report;
    try {
      this.logger.log(`Iniciando generación de reporte ${reportId}...`);
      
      updatedReport = await this.prisma.report.update({
          where: { id: reportId },
          data: { status: 'PROCESSING' }
      });
      this.eventsGateway.broadcastReportUpdate(updatedReport);
      
      const parameters = JSON.parse(updatedReport.parameters as string);
      
      const startDate = new Date(`${parameters.startDate}T00:00:00`);
      const endDate = new Date(`${parameters.endDate}T23:59:59.999`);
      
      const historicalData = await this.prisma.sensorData.findMany({
          where: {
              tankId: parameters.tankId,
              sensorId: { in: parameters.sensorIds },
              timestamp: { gte: startDate, lte: endDate }
          },
          orderBy: { timestamp: 'asc' },
      });

      const directoryPath = path.resolve(__dirname, '../../reports/data');
      if (!fs.existsSync(directoryPath)) {
          fs.mkdirSync(directoryPath, { recursive: true });
      }
      const dataFilePath = path.join(directoryPath, `raw-${reportId}.json`);
      fs.writeFileSync(dataFilePath, JSON.stringify(historicalData));

      updatedReport = await this.prisma.report.update({
        where: { id: reportId },
        data: { status: 'COMPLETED', filePath: dataFilePath },
      });
      this.eventsGateway.broadcastReportUpdate(updatedReport);
      this.logger.log(`✅ Reporte ${reportId} completado.`);

    } catch (error) {
      this.logger.error(`Error generando el reporte ${reportId}:`, error);
      updatedReport = await this.prisma.report.update({
        where: { id: reportId },
        data: { status: 'FAILED' },
      });
      this.eventsGateway.broadcastReportUpdate(updatedReport);
    }
  }
}