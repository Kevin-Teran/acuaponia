import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ProcessedDataPoint } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * @typedef {object} ReportFilters
 * @property {string} startDate
 * @property {string} endDate
 * @property {string} selectedParameter
 */
interface ReportFilters {
  startDate: string;
  endDate: string;
  selectedParameter: string;
}

/**
 * @param {ProcessedDataPoint[]} data
 * @returns {{temperature: object, ph: object, oxygen: object}}
 */
const calculateStatistics = (data: ProcessedDataPoint[]) => {
  if (data.length === 0) {
    return {
      temperature: { avg: 0, min: 0, max: 0, std: 0 },
      ph: { avg: 0, min: 0, max: 0, std: 0 },
      oxygen: { avg: 0, min: 0, max: 0, std: 0 }
    };
  }

  const temperatures = data.map(d => d.temperature).filter((v): v is number => v !== null);
  const phs = data.map(d => d.ph).filter((v): v is number => v !== null);
  const oxygens = data.map(d => d.oxygen).filter((v): v is number => v !== null);
  
  const calculateStats = (values: number[]) => {
    if (values.length === 0) return { avg: 0, min: 0, max: 0, std: 0 };
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    
    return { avg, min, max, std };
  };
  
  return {
    temperature: calculateStats(temperatures),
    ph: calculateStats(phs),
    oxygen: calculateStats(oxygens)
  };
};

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
const toBase64 = (url: string): Promise<string> => fetch(url)
  .then(response => response.blob())
  .then(blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  }));

/**
 * @param {ProcessedDataPoint[]} data
 * @param {ReportFilters} filters
 */
export const generatePDFReport = async (data: ProcessedDataPoint[], filters: ReportFilters) => {
  const doc = new jsPDF();
  
  try {
    const logoBase64 = await toBase64('/logo-sena.png');
    doc.addImage(logoBase64, 'PNG', 15, 12, 20, 20);
  } catch (error) {
    console.error("No se pudo cargar el logo para el PDF", error);
  }
  
  doc.setFillColor(255, 103, 31);
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SENA', 15, 12);
  doc.setFontSize(10);
  doc.text('Servicio Nacional de Aprendizaje', 15, 18);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE MONITOREO ACUÁTICO', 105, 40, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const dateRange = `${format(new Date(filters.startDate || Date.now()), 'dd/MM/yyyy', { locale: es })} - ${format(new Date(filters.endDate || Date.now()), 'dd/MM/yyyy', { locale: es })}`;
  doc.text(`Período: ${dateRange}`, 105, 50, { align: 'center' });
  
  const stats = calculateStatistics(data);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN ESTADÍSTICO', 15, 70);
  
  const statsData = [
    ['Parámetro', 'Promedio', 'Mínimo', 'Máximo', 'Desv. Estándar'],
    ['Temperatura (°C)', stats.temperature.avg.toFixed(2), stats.temperature.min.toFixed(2), stats.temperature.max.toFixed(2), stats.temperature.std.toFixed(2)],
    ['pH', stats.ph.avg.toFixed(2), stats.ph.min.toFixed(2), stats.ph.max.toFixed(2), stats.ph.std.toFixed(2)],
    ['Oxígeno (mg/L)', stats.oxygen.avg.toFixed(2), stats.oxygen.min.toFixed(2), stats.oxygen.max.toFixed(2), stats.oxygen.std.toFixed(2)]
  ];
  
  (autoTable as any)(doc, {
    startY: 80,
    head: [statsData[0]],
    body: statsData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [255, 103, 31], textColor: [255, 255, 255], fontStyle: 'bold' },
    bodyStyles: { fontSize: 10 },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  (doc as any).text('DATOS DETALLADOS', 15, (doc as any).lastAutoTable.finalY + 20);
  
  const tableData = data.slice(0, 50).map(item => [
    format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm', { locale: es }),
    item.temperature?.toFixed(1) + '°C',
    item.ph?.toFixed(2),
    item.oxygen?.toFixed(1) + ' mg/L'
  ]);
  
  (autoTable as any)(doc, {
    startY: (doc as any).lastAutoTable.finalY + 30,
    head: [['Fecha/Hora', 'Temperatura', 'pH', 'Oxígeno Disuelto']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [57, 169, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });
  
  doc.save(`reporte-acuatico-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

/**
 * @param {ProcessedDataPoint[]} data
 * @param {ReportFilters} filters
 */
export const generateExcelReport = (data: ProcessedDataPoint[], filters: ReportFilters) => {
  const wb = XLSX.utils.book_new();
  
  const stats = calculateStatistics(data);
  const statsData = [
    ['REPORTE DE MONITOREO ACUÁTICO - SENA'],
    [`Período: ${format(new Date(filters.startDate || Date.now()), 'dd/MM/yyyy')} - ${format(new Date(filters.endDate || Date.now()), 'dd/MM/yyyy')}`],
    [''],
    ['RESUMEN ESTADÍSTICO'],
    ['Parámetro', 'Promedio', 'Mínimo', 'Máximo', 'Desviación Estándar'],
    ['Temperatura (°C)', stats.temperature.avg.toFixed(2), stats.temperature.min.toFixed(2), stats.temperature.max.toFixed(2), stats.temperature.std.toFixed(2)],
    ['pH', stats.ph.avg.toFixed(2), stats.ph.min.toFixed(2), stats.ph.max.toFixed(2), stats.ph.std.toFixed(2)],
    ['Oxígeno Disuelto (mg/L)', stats.oxygen.avg.toFixed(2), stats.oxygen.min.toFixed(2), stats.oxygen.max.toFixed(2), stats.oxygen.std.toFixed(2)]
  ];
  
  const statsWs = XLSX.utils.aoa_to_sheet(statsData);
  XLSX.utils.book_append_sheet(wb, statsWs, 'Resumen');
  
  const dataForExcel = [
    ['Fecha/Hora', 'Temperatura (°C)', 'pH', 'Oxígeno Disuelto (mg/L)'],
    ...data.map(item => [
      format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm'),
      item.temperature?.toFixed(1),
      item.ph?.toFixed(2),
      item.oxygen?.toFixed(1)
    ])
  ];
  
  const dataWs = XLSX.utils.aoa_to_sheet(dataForExcel);
  XLSX.utils.book_append_sheet(wb, dataWs, 'Datos');
  
  XLSX.writeFile(wb, `reporte-acuatico-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};