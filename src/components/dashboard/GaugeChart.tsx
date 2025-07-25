import React, { useRef, useEffect, useState } from 'react';

/**
 * Props para el componente GaugeChart
 */
interface GaugeChartProps {
  /** Valor actual a mostrar en el gauge */
  value: number;
  /** Valor mínimo del rango */
  min: number;
  /** Valor máximo del rango */
  max: number;
  /** Etiqueta descriptiva del gauge */
  label: string;
  /** Unidad de medida */
  unit: string;
  /** Umbrales opcionales para determinar estados (bajo/óptimo/alto) */
  thresholds?: { low: number; high: number };
  /** Color por defecto cuando no hay umbrales */
  color?: string;
}

/**
 * Componente GaugeChart - Muestra un medidor semicircular con aguja
 * que indica visualmente el valor actual dentro de un rango definido
 */
export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
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

  /**
   * Determina el color actual basado en los umbrales y el valor actual
   */
  const getCurrentColor = () => {
    if (!thresholds) return color;
    
    if (currentValue < thresholds.low) return '#EF4444'; // Rojo para bajo
    if (currentValue > thresholds.high) return '#F97316'; // Naranja para alto
    return '#10B981'; // Verde para óptimo
  };

  const currentColor = getCurrentColor();

  /**
   * Obtiene el estado textual y colores asociados
   */
  const getStatus = () => {
    if (thresholds) {
      if (currentValue < thresholds.low) return { text: 'BAJO', color: '#EF4444', bgColor: '#FEE2E2' };
      if (currentValue > thresholds.high) return { text: 'ALTO', color: '#F97316', bgColor: '#FED7AA' };
      return { text: 'ÓPTIMO', color: '#10B981', bgColor: '#D1FAE5' };
    }
    return { text: 'NORMAL', color: color, bgColor: '#F3F4F6' };
  };

  const status = getStatus();

  /**
   * Anima suavemente el cambio de valor
   */
  useEffect(() => {
    const animateValue = () => {
      setCurrentValue(prev => {
        const diff = value - prev;
        const step = diff * 0.1;
        if (Math.abs(diff) < 0.1) return value;
        return prev + step;
      });
      animationRef.current = requestAnimationFrame(animateValue);
    };
    
    animationRef.current = requestAnimationFrame(animateValue);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value]);

  /**
   * Dibuja el gauge en el canvas
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.8;
    const radius = Math.min(canvas.width, canvas.height) * 0.4;
    
    // Calcular porcentaje y ángulo basado en el valor actual animado
    const percentage = Math.max(0, Math.min(100, ((currentValue - min) / (max - min)) * 100));
    const needleAngle = Math.PI + (percentage / 100) * Math.PI;
    
    // Dibujar arco de fondo completo (gris claro)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 20;
    ctx.stroke();

    // Dibujar secciones coloreadas basadas en umbrales o progreso simple
    if (thresholds) {
      // Sección baja (rojo)
      const lowEndAngle = Math.PI + ((thresholds.low - min) / (max - min)) * Math.PI;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, Math.PI, lowEndAngle);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 20;
      ctx.stroke();
      
      // Sección óptima (verde)
      const highEndAngle = Math.PI + ((thresholds.high - min) / (max - min)) * Math.PI;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, lowEndAngle, highEndAngle);
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 20;
      ctx.stroke();
      
      // Sección alta (naranja)
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, highEndAngle, 2 * Math.PI);
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = 20;
      ctx.stroke();
      
      // Dibujar superposición blanca desde la posición actual hasta el final
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, needleAngle, 2 * Math.PI);
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 20;
      ctx.stroke();
    } else {
      // Sin umbrales, solo dibujar el progreso con color por defecto
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, Math.PI, needleAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 20;
      ctx.stroke();
      
      // Dibujar arco restante en gris claro
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, needleAngle, 2 * Math.PI);
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 20;
      ctx.stroke();
    }
    
    // Dibujar aguja con ángulo preciso apuntando al valor exacto
    const needleLength = radius * 0.9;
    const needleWidth = 4;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(needleAngle);
    
    // Aguja con punta afilada
    ctx.beginPath();
    ctx.moveTo(-needleWidth, 0);
    ctx.lineTo(0, -needleLength);
    ctx.lineTo(needleWidth, 0);
    ctx.closePath();
    
    // Estilo de la aguja
    const needleGradient = ctx.createLinearGradient(0, -needleLength, 0, 0);
    needleGradient.addColorStop(0, '#DC2626'); // Punta roja
    needleGradient.addColorStop(1, '#1F2937'); // Base oscura
    ctx.fillStyle = needleGradient;
    ctx.fill();
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    ctx.restore();
    
    // Dibujar círculo central
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#111827';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    
    // Dibujar marcas de escala (divisiones principales)
    for (let i = 0; i <= 10; i++) {
      const markAngle = Math.PI + (i / 10) * Math.PI;
      const x1 = centerX + Math.cos(markAngle) * (radius - 10);
      const y1 = centerY + Math.sin(markAngle) * (radius - 10);
      const x2 = centerX + Math.cos(markAngle) * (radius - 20);
      const y2 = centerY + Math.sin(markAngle) * (radius - 20);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [currentValue, min, max, thresholds, color]);

  return (
    <div className="relative w-full bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
          {label}
        </h3>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium`} 
             style={{ backgroundColor: status.bgColor, color: status.color }}>
          <div className={`w-2 h-2 rounded-full mr-2`} style={{ backgroundColor: status.color }}></div>
          <span>{status.text}</span>
        </div>
      </div>
      
      <div className="relative flex justify-center mb-6">
        <canvas
          ref={canvasRef}
          width={320}
          height={200}
          className="max-w-full h-auto"
        />
      </div>
      
      <div className="text-center">
        <div className="text-4xl font-bold mb-2" style={{ color: currentColor }}>
          {currentValue.toFixed(1)}
          <span className="text-xl text-gray-500 dark:text-gray-400 ml-1">{unit}</span>
        </div>
        
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-4">
          <span>{min}{unit}</span>
          {thresholds && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              Óptimo: {thresholds.low}-{thresholds.high}{unit}
            </span>
          )}
          <span>{max}{unit}</span>
        </div>
      </div>
    </div>
  );
};