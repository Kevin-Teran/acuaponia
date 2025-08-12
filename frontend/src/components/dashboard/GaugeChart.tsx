import React, { useRef, useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * @interface GaugeChartProps
 * @description Define las propiedades del componente.
 * @technical_requirements **CORRECCIÓN**: Se cambiaron las propiedades de `thresholds` de `low`/`high` a `min`/`max` para ser consistente con el resto de la aplicación (ej. `SummaryCards`).
 */
interface GaugeChartProps {
  value: number;
  previousValue?: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  thresholds?: { min: number; max: number };
  color?: string;
}

/**
 * @component GaugeChart
 * @description Componente de medidor que visualiza una métrica. Muestra el valor actual, zonas de color basadas en umbrales y una flecha de tendencia.
 */
export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  previousValue,
  min,
  max,
  label,
  unit,
  thresholds,
  color = '#3B82F6'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentValue, setCurrentValue] = useState(min);
  const animationRef = useRef<number>();

  const { trend, difference } = useMemo(() => {
    if (previousValue === undefined || value === previousValue) {
      return { trend: 'stable', difference: null };
    }
    const diff = value - previousValue;
    return {
      trend: diff > 0 ? 'up' : 'down',
      difference: diff,
    };
  }, [value, previousValue]);

  useEffect(() => {
    const animateValue = () => {
      setCurrentValue(prev => {
        const diff = value - prev;
        const step = diff * 0.1;
        if (Math.abs(diff) < 0.05) {
          cancelAnimationFrame(animationRef.current!);
          return value;
        }
        return prev + step;
      });
      animationRef.current = requestAnimationFrame(animateValue);
    };
    animationRef.current = requestAnimationFrame(animateValue);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [value]);

  const getValuePercentage = (val: number) => Math.max(0, Math.min(1, (val - min) / (max - min)));
  const percentageToAngle = (percentage: number) => Math.PI + (percentage * Math.PI);
  
  const getCurrentColor = () => {
    if (!thresholds) return color;
    // CORRECCIÓN: Usar `min` y `max`
    if (currentValue < thresholds.min) return '#007BBF'; // Azul para 'Bajo'
    if (currentValue > thresholds.max) return '#EF4444'; // Rojo para 'Alto'
    return '#10B981'; // Verde para 'Óptimo'
  };

  const getStatus = () => {
    if (thresholds) {
      // CORRECCIÓN: Usar `min` y `max`
      if (currentValue < thresholds.min) return { text: 'BAJO', color: '#007BBF', bgColor: '#DBEAFE' };
      if (currentValue > thresholds.max) return { text: 'ALTO', color: '#EF4444', bgColor: '#FEE2E2' };
      return { text: 'ÓPTIMO', color: '#10B981', bgColor: '#D1FAE5' };
    }
    return { text: 'NORMAL', color: color, bgColor: '#F3F4F6' };
  };

  const currentColor = getCurrentColor();
  const status = getStatus();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.8;
    const radius = Math.min(canvas.width, canvas.height) * 0.35;
    const lineWidth = 20;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (thresholds) {
      // CORRECCIÓN: Usar `min` y `max` para dibujar los arcos
      const lowAngle = percentageToAngle(getValuePercentage(thresholds.min));
      ctx.beginPath(); ctx.arc(centerX, centerY, radius, Math.PI, lowAngle); ctx.strokeStyle = '#007BBF'; ctx.lineWidth = lineWidth; ctx.stroke();
      const highAngle = percentageToAngle(getValuePercentage(thresholds.max));
      ctx.beginPath(); ctx.arc(centerX, centerY, radius, lowAngle, highAngle); ctx.strokeStyle = '#10B981'; ctx.lineWidth = lineWidth; ctx.stroke();
      ctx.beginPath(); ctx.arc(centerX, centerY, radius, highAngle, 2 * Math.PI); ctx.strokeStyle = '#EF4444'; ctx.lineWidth = lineWidth; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI); ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke();
    }
    const currentAngle = percentageToAngle(getValuePercentage(currentValue));
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, currentAngle, 2 * Math.PI); ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = lineWidth; ctx.stroke();
    for (let i = 0; i <= 10; i++) { const angle = Math.PI + (i / 10) * Math.PI; const x1 = centerX + Math.cos(angle) * (radius - 10); const y1 = centerY + Math.sin(angle) * (radius - 10); const x2 = centerX + Math.cos(angle) * (radius - 20); const y2 = centerY + Math.sin(angle) * (radius - 20); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = '#6B7280'; ctx.lineWidth = 2; ctx.stroke(); }
    const needleLength = radius * 0.9; const needleWidth = 4; const needleTipX = centerX + Math.cos(currentAngle) * needleLength; const needleTipY = centerY + Math.sin(currentAngle) * needleLength; const baseAngle1 = currentAngle + Math.PI / 2; const baseAngle2 = currentAngle - Math.PI / 2; const baseX1 = centerX + Math.cos(baseAngle1) * needleWidth; const baseY1 = centerY + Math.sin(baseAngle1) * needleWidth; const baseX2 = centerX + Math.cos(baseAngle2) * needleWidth; const baseY2 = centerY + Math.sin(baseAngle2) * needleWidth; ctx.beginPath(); ctx.moveTo(needleTipX, needleTipY); ctx.lineTo(baseX1, baseY1); ctx.lineTo(baseX2, baseY2); ctx.closePath();
    const gradient = ctx.createLinearGradient(centerX, centerY, needleTipX, needleTipY); gradient.addColorStop(0, '#1F2937'); gradient.addColorStop(1, '#DC2626'); ctx.fillStyle = gradient; ctx.strokeStyle = '#111827'; ctx.lineWidth = 1; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI); ctx.fillStyle = '#111827'; ctx.fill();
  }, [currentValue, min, max, thresholds, color]);

  const renderTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-5 h-5 text-red-500" />;
    return <Minus className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="relative w-full bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{label}</h3>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium`} style={{ backgroundColor: status.bgColor, color: status.color }}>
          <div className={`w-2 h-2 rounded-full mr-2`} style={{ backgroundColor: status.color }}></div>
          <span>{status.text}</span>
        </div>
      </div>
      <div className="relative flex justify-center mb-6"><canvas ref={canvasRef} width={320} height={200} className="max-w-full h-auto" /></div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="text-4xl font-bold" style={{ color: currentColor }}>
            {currentValue.toFixed(unit === '' ? 2 : 1)}
            <span className="text-xl text-gray-500 dark:text-gray-400 ml-1">{unit}</span>
          </div>
        </div>
        
        <div className="h-6 mt-1 flex items-center justify-center gap-1 text-sm">
          {difference !== null && (
            <>
              {renderTrendIcon()}
              <span className={trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'}>
                {difference > 0 ? '+' : ''}{difference.toFixed(unit === '' ? 2 : 1)} {unit}
              </span>
              <span className="text-gray-400">vs. anterior</span>
            </>
          )}
        </div>
        
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-2">
          <span>{min}{unit}</span>
          {/* CORRECCIÓN: Usar `min` y `max` para la etiqueta */}
          {thresholds && <span className="text-green-600 dark:text-green-400 font-medium">Óptimo: {thresholds.min}-{thresholds.max}{unit}</span>}
          <span>{max}{unit}</span>
        </div>
      </div>
    </div>
  );
};