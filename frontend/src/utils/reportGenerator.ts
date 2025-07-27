import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { SensorData } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const generatePDFReport = (data: SensorData[], filters: any) => {
  const doc = new jsPDF();
  
  // SENA Header with institutional colors
  doc.setFillColor(255, 103, 31); // SENA Orange
  doc.rect(0, 0, 210, 25, 'F');
  
  // SENA Logo placeholder (text-based)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SENA', 15, 12);
  doc.setFontSize(10);
  doc.text('Servicio Nacional de Aprendizaje', 15, 18);
  
  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE MONITOREO ACUÁTICO', 105, 40, { align: 'center' });
  
  // Subtitle with date range
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const dateRange = `${format(new Date(filters.startDate || Date.now()), 'dd/MM/yyyy', { locale: es })} - ${format(new Date(filters.endDate || Date.now()), 'dd/MM/yyyy', { locale: es })}`;
  doc.text(`Período: ${dateRange}`, 105, 50, { align: 'center' });
  
  // Statistics summary
  const stats = calculateStatistics(data);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN ESTADÍSTICO', 15, 70);
  
  // Statistics table
  const statsData = [
    ['Parámetro', 'Promedio', 'Mínimo', 'Máximo', 'Desv. Estándar'],
    ['Temperatura (°C)', stats.temperature.avg.toFixed(2), stats.temperature.min.toFixed(2), stats.temperature.max.toFixed(2), stats.temperature.std.toFixed(2)],
    ['pH', stats.ph.avg.toFixed(2), stats.ph.min.toFixed(2), stats.ph.max.toFixed(2), stats.ph.std.toFixed(2)],
    ['Oxígeno (mg/L)', stats.oxygen.avg.toFixed(2), stats.oxygen.min.toFixed(2), stats.oxygen.max.toFixed(2), stats.oxygen.std.toFixed(2)]
  ];
  
  autoTable(doc, {
    startY: 80,
    head: [statsData[0]],
    body: statsData.slice(1),
    theme: 'grid',
    headStyles: { 
      fillColor: [255, 103, 31], // SENA Orange
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 10 },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });
  
  // Data table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DETALLADOS', 15, (doc as any).lastAutoTable.finalY + 20);
  
  const tableData = data.slice(0, 50).map(item => [
    format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm', { locale: es }),
    `${item.temperature.toFixed(1)}°C`,
    item.ph.toFixed(2),
    `${item.oxygen.toFixed(1)} mg/L`
  ]);
  
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 30,
    head: [['Fecha/Hora', 'Temperatura', 'pH', 'Oxígeno Disuelto']],
    body: tableData,
    theme: 'striped',
    headStyles: { 
      fillColor: [57, 169, 0], // SENA Green
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });
  
  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(0, 123, 191); // SENA Blue
    doc.rect(0, 285, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('Sistema de Monitoreo Acuático - SENA', 15, 292);
    doc.text(`Página ${i} de ${pageCount}`, 195, 292, { align: 'right' });
    doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 105, 292, { align: 'center' });
  }
  
  // Download the PDF
  doc.save(`reporte-acuatico-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const generateExcelReport = (data: SensorData[], filters: any) => {
  const wb = XLSX.utils.book_new();
  
  // Statistics sheet
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
  
  // Style the header
  statsWs['A1'] = { v: 'REPORTE DE MONITOREO ACUÁTICO - SENA', t: 's', s: { font: { bold: true, sz: 16 }, fill: { fgColor: { rgb: 'FF671F' } } } };
  
  XLSX.utils.book_append_sheet(wb, statsWs, 'Resumen');
  
  // Data sheet
  const dataForExcel = [
    ['Fecha/Hora', 'Temperatura (°C)', 'pH', 'Oxígeno Disuelto (mg/L)'],
    ...data.map(item => [
      format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm'),
      item.temperature.toFixed(1),
      item.ph.toFixed(2),
      item.oxygen.toFixed(1)
    ])
  ];
  
  const dataWs = XLSX.utils.aoa_to_sheet(dataForExcel);
  
  // Style the data sheet header
  const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: '39A900' } } };
  ['A1', 'B1', 'C1', 'D1'].forEach(cell => {
    if (dataWs[cell]) dataWs[cell].s = headerStyle;
  });
  
  XLSX.utils.book_append_sheet(wb, dataWs, 'Datos');
  
  // Download the Excel file
  XLSX.writeFile(wb, `reporte-acuatico-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

const calculateStatistics = (data: SensorData[]) => {
  if (data.length === 0) {
    return {
      temperature: { avg: 0, min: 0, max: 0, std: 0 },
      ph: { avg: 0, min: 0, max: 0, std: 0 },
      oxygen: { avg: 0, min: 0, max: 0, std: 0 }
    };
  }

  const temperatures = data.map(d => d.temperature);
  const phs = data.map(d => d.ph);
  const oxygens = data.map(d => d.oxygen);
  
  const calculateStats = (values: number[]) => {
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