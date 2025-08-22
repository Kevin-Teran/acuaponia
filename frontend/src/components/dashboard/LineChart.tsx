"use client";

/**
 * @file LineChart.tsx
 * @description Componente para renderizar gráficos de líneas para datos históricos de sensores.
 * @technical_requirements Utiliza `react-chartjs-2` y el plugin `chartjs-plugin-annotation` para
 * dibujar zonas de umbral óptimo. Incluye un tooltip HTML personalizado para una mejor experiencia de usuario.
 */
import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ScriptableContext } from 'chart.js';
import { Line } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';
import { ProcessedDataPoint } from '@/types';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/common/Card';
import { CheckCircle, AlertTriangle } from 'lucide-react';

ChartJS.register( CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, annotationPlugin );

interface Thresholds {
  temperature: { min: number; max: number };
  ph: { min: number; max: number };
  oxygen: { min: number; max: number };
}

interface LineChartProps {
  data: ProcessedDataPoint[];
  thresholds: Thresholds;
  startDate: string;
  endDate: string;
  height?: number;
}

const getDynamicYAxis = (thresholds?: { min: number; max: number }) => {
  if (!thresholds || typeof thresholds.min !== 'number' || typeof thresholds.max !== 'number') return {};
  const range = thresholds.max - thresholds.min;
  if (range <= 0) return { min: thresholds.min - 1, max: thresholds.max + 1 };
  const padding = range * 0.75;
  return {
    min: Math.floor(thresholds.min - padding),
    max: Math.ceil(thresholds.max + padding),
  };
};

const getOrCreateTooltip = (chart: ChartJS) => {
  let tooltipEl = chart.canvas.parentNode?.querySelector('div[data-tooltip="true"]');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.setAttribute('data-tooltip', 'true');
    Object.assign(tooltipEl.style, {
      background: 'rgba(31, 41, 55, 0.8)',
      borderRadius: '0.5rem',
      color: 'white',
      opacity: '0',
      pointerEvents: 'none',
      position: 'absolute',
      transform: 'translate(-50%, -100%)',
      transition: 'opacity 0.2s ease',
      padding: '0.75rem',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      border: '1px solid rgba(75, 85, 99, 0.5)',
      width: '200px',
      zIndex: '10'
    });
    chart.canvas.parentNode?.appendChild(tooltipEl);
  }
  return tooltipEl as HTMLDivElement;
};

export const LineChart: React.FC<LineChartProps> = ({ data, thresholds, startDate, endDate, height = 300 }) => {
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

  // Manejo de datos vacíos o sin fechas
  if (!data || data.length === 0 || !startDate || !endDate) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        No hay datos para mostrar en este gráfico.
      </div>
    );
  }

  const daysDiff = differenceInDays(parseISO(endDate), parseISO(startDate));
  let labelFormat = 'HH:mm';
  if (daysDiff > 0 && daysDiff <= 7) { labelFormat = 'dd/MM HH:mm'; } 
  else if (daysDiff > 7) { labelFormat = 'dd/MM/yy'; }
  const labels = data.map(item => format(new Date(item.timestamp), labelFormat, { locale: es }));
  
  const chartConfigs = [
    { key: 'temperature' as const, label: 'Temperatura (°C)', unit: '°C', color: '#3B82F6', data: data.map(d => d.temperature), threshold: thresholds.temperature },
    { key: 'oxygen' as const, label: 'Oxígeno Disuelto (mg/L)', unit: 'mg/L', color: '#F97316', data: data.map(d => d.oxygen), threshold: thresholds.oxygen },
    { key: 'ph' as const, label: 'Nivel de pH', unit: '', color: '#10B981', data: data.map(d => d.ph), threshold: thresholds.ph },
  ];

  return (
    <div className="space-y-6">
      {chartConfigs.map(config => {
        if (!config.data.some(d => d !== null) || !config.threshold) return null;

        const yAxisBounds = getDynamicYAxis(config.threshold);
        
        return (
          <Card key={config.key}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-0">{config.label}</h3>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-700 rounded-md px-2 py-1">
                {format(parseISO(startDate), 'dd MMM yyyy', { locale: es })} - {format(parseISO(endDate), 'dd MMM yyyy', { locale: es })}
              </div>
            </div>
            <div style={{ height: `${height}px`, position: 'relative' }}>
              <Line
                data={{
                  labels,
                  datasets: [{ 
                    label: `Valor`, data: config.data, borderColor: config.color, borderWidth: 2.5, tension: 0.4,
                    pointRadius: data.length < 100 ? 4 : 0, pointHoverRadius: 6,
                    pointBackgroundColor: isDark ? '#1f2937' : '#ffffff', pointBorderColor: config.color,
                    fill: 'start',
                    backgroundColor: (context: ScriptableContext<'line'>) => {
                      const ctx = context.chart.ctx;
                      const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
                      gradient.addColorStop(0, `${config.color}40`);
                      gradient.addColorStop(1, `${config.color}00`);
                      return gradient;
                    },
                  }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  scales: { 
                    x: { grid: { color: isDark ? '#374151' : '#f3f4f6' }, ticks: { color: isDark ? '#9ca3af' : '#6b7280' } }, 
                    y: { grid: { color: isDark ? '#374151' : '#f3f4f6' }, ticks: { color: isDark ? '#9ca3af' : '#6b7280' }, ...yAxisBounds }, 
                  },
                  plugins: { 
                    legend: { display: false },
                    tooltip: {
                      enabled: false,
                      external: (context) => {
                        const tooltipEl = getOrCreateTooltip(context.chart);
                        if (context.tooltip.opacity === 0) { tooltipEl.style.opacity = '0'; return; }
                        
                        const tooltipModel = context.tooltip;
                        if (tooltipModel.body) {
                          const dataPointIndex = tooltipModel.dataPoints[0].dataIndex;
                          const rawValue = config.data[dataPointIndex];
                          if (rawValue === null) return;
                          
                          const timestamp = data[dataPointIndex].timestamp;
                          let status = 'Óptimo';
                          let statusColor = '#10B981';
                          if (rawValue < config.threshold.min) { status = 'Bajo'; statusColor = '#007BBF'; }
                          if (rawValue > config.threshold.max) { status = 'Alto'; statusColor = '#EF4444'; }
                          
                          const iconHTML = status === 'Óptimo' ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${statusColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${statusColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`;
                          
                          tooltipEl.innerHTML = `
                            <div style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 4px;">${format(new Date(timestamp), 'dd MMM yyyy, HH:mm:ss', { locale: es })}</div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                              ${iconHTML}
                              <span style="font-weight: 600; color: ${statusColor};">${status}</span>
                              <span style="font-size: 1.125rem; font-weight: 700; color: white; margin-left: auto;">${rawValue.toFixed(2)} ${config.unit}</span>
                            </div>`;
                        }
                        const { offsetLeft: positionX, offsetTop: positionY } = context.chart.canvas;
                        tooltipEl.style.opacity = '1';
                        tooltipEl.style.left = positionX + tooltipModel.caretX + 'px';
                        tooltipEl.style.top = positionY + tooltipModel.caretY + 'px';
                      },
                    },
                    annotation: {
                      annotations: {
                        optimalZone: {
                          type: 'box',
                          yMin: config.threshold.min,
                          yMax: config.threshold.max,
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          borderColor: 'rgba(16, 185, 129, 0.3)',
                          borderWidth: 1,
                          borderDash: [6, 6],
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
};