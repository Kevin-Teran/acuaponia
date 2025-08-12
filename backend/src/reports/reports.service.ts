import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, ReportStatus, ReportType, Report } from '@prisma/client';
import { CreateReportDto } from './dto/create-report.dto';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createReportDto: CreateReportDto, user: User) {
    const parameters = {
      tankId: createReportDto.tankId,
      sensorIds: createReportDto.sensorIds,
      startDate: createReportDto.startDate,
      endDate: createReportDto.endDate,
    };
    
    const newReport = await this.prisma.report.create({
      data: {
        title: createReportDto.title,
        type: createReportDto.type,
        userId: user.id,
        parameters: JSON.stringify(parameters),
        status: ReportStatus.PENDING,
      },
    });

    this.processReportGeneration(newReport.id);

    return newReport;
  }
  
  async findOne(id: string, user: User): Promise<Report> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Reporte no encontrado.');
    if (user.role !== 'ADMIN' && report.userId !== user.id) {
        throw new ForbiddenException('No tienes permisos para acceder a este reporte.');
    }
    return report;
  }

  async findAll(currentUser: User, targetUserId?: string) {
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

  /**
   * @method generateFileFromData
   * @description Lee los datos brutos del reporte y los convierte al formato solicitado.
   */
  async generateFileFromData(report: Report, format: string) {
    const dataFilePath = report.filePath;
    
    if (!dataFilePath || !fs.existsSync(dataFilePath)) {
        throw new NotFoundException('Los datos intermedios del reporte no existen.');
    }
    
    const rawData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

    const directoryPath = path.resolve(__dirname, '../../reports/generated');
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
    
    let outputFilePath;
    
    if (format === 'pdf') {
        outputFilePath = await this.generatePdfFile(report, rawData, directoryPath);
    } else if (format === 'xlsx') {
        outputFilePath = await this.generateExcelFile(report, rawData, directoryPath);
    } else {
        throw new NotFoundException('Formato de descarga no válido.');
    }

    return {
        filePath: outputFilePath,
        title: report.title,
    };
  }

  /**
   * @private
   * @method generateExcelFile
   * @description Genera un archivo .xlsx válido a partir de los datos.
   */
  private async generateExcelFile(report: Report, rawData: any[], outputPath: string): Promise<string> {
    const headers = ['id', 'value', 'type', 'timestamp', 'createdAt', 'sensorId', 'tankId'];
    const formattedData = rawData.map(item => {
        return {
            id: item.id,
            value: item.value,
            type: item.type,
            timestamp: format(new Date(item.timestamp), 'yyyy-MM-dd HH:mm:ss'),
            createdAt: format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm:ss'),
            sensorId: item.sensorId,
            tankId: item.tankId,
        };
    });
    const ws = XLSX.utils.json_to_sheet(formattedData, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos del Reporte");
    
    const filePath = path.join(outputPath, `report-${report.id}.xlsx`);
    XLSX.writeFile(wb, filePath);
    
    return filePath;
  }

  /**
   * @private
   * @method generatePdfFile
   * @description Genera un archivo .pdf válido a partir de los datos.
   */
  private async generatePdfFile(report: Report, rawData: any[], outputPath: string): Promise<string> {
    const doc = new jsPDF();
    
    const columns = [
        { header: 'Fecha y Hora', dataKey: 'timestamp' },
        { header: 'Valor', dataKey: 'value' },
        { header: 'Tipo', dataKey: 'type' },
        { header: 'Sensor ID', dataKey: 'sensorId' },
    ];
    
    const formattedData = rawData.map(item => ({
        timestamp: format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm', { locale: es }),
        value: item.value,
        type: item.type,
        sensorId: item.sensorId,
    }));
    
    (doc as any).autoTable({
        head: [columns.map(col => col.header)],
        body: formattedData.map(item => Object.values(item)),
        startY: 20,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [57, 169, 0] },
    });
    
    const filePath = path.join(outputPath, `report-${report.id}.pdf`);
    fs.writeFileSync(filePath, doc.output());
    
    return filePath;
  }

  private async processReportGeneration(reportId: string) {
    try {
      this.logger.log(`Iniciando generación de datos para el reporte ${reportId}...`);
      
      await this.prisma.report.update({
          where: { id: reportId },
          data: { status: 'PROCESSING' }
      });
      
      const report = await this.prisma.report.findUnique({ where: { id: reportId } });
      const parameters = JSON.parse(report.parameters as string);
      
      // -- CORRECCIÓN CRÍTICA DE FECHAS --
      // Creamos objetos de fecha explícitamente en la zona horaria del servidor
      const start = new Date(parameters.startDate);
      const end = new Date(parameters.endDate);
      const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0);
      const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
      
      this.logger.log(`Buscando datos para el rango corregido: ${startDate.toISOString()} a ${endDate.toISOString()}`);
      
      const historicalData = await this.prisma.sensorData.findMany({
          where: {
              tankId: parameters.tankId,
              sensorId: {
                  in: parameters.sensorIds
              },
              timestamp: {
                  gte: startDate,
                  lte: endDate
              }
          },
          orderBy: { timestamp: 'asc' },
      });

      if (historicalData.length === 0) {
        this.logger.warn(`No se encontraron datos para el reporte ${reportId}.`);
      }
      
      const directoryPath = path.resolve(__dirname, '../../reports/data');
      if (!fs.existsSync(directoryPath)) {
          fs.mkdirSync(directoryPath, { recursive: true });
      }
      const dataFilePath = path.join(directoryPath, `raw-${reportId}.json`);
      fs.writeFileSync(dataFilePath, JSON.stringify(historicalData));

      this.logger.log(`Datos del reporte ${reportId} generados. Guardando en DB...`);

      await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'COMPLETED',
          filePath: dataFilePath,
        },
      });
      this.logger.log(`Reporte ${reportId} completado y guardado.`);
    } catch (error) {
      this.logger.error(`Error al generar el reporte ${reportId}:`, error);
      await this.prisma.report.update({
        where: { id: reportId },
        data: { status: 'FAILED' },
      });
    }
  }
}