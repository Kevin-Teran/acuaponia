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
 * Componente GaugeChart - Muestra un medidor semicircular con aguja animada
 * que indica visualmente el valor actual dentro de un rango definido.
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

  // --- LÓGICA DE ANIMACIÓN (DEL PRIMER CÓDIGO) ---
  useEffect(() => {
    const animateValue = () => {
      setCurrentValue(prev => {
        const diff = value - prev;
        const step = diff * 0.1; // Ajusta la velocidad de la animación
        if (Math.abs(diff) < 0.1) {
          cancelAnimationFrame(animationRef.current!);
          return value;
        }
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

  // --- FUNCIONES AUXILIARES Y DE ESTADO (MEZCLA DE AMBOS) ---
  const getValuePercentage = (val: number) => {
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
  };

  const percentageToAngle = (percentage: number) => {
    return Math.PI + (percentage * Math.PI);
  };
  
  const getCurrentColor = () => {
    if (!thresholds) return color;
    if (currentValue < thresholds.low) return '#EF4444'; // Rojo para bajo
    if (currentValue > thresholds.high) return '#F97316'; // Naranja para alto
    return '#10B981'; // Verde para óptimo
  };

  const getStatus = () => {
    if (thresholds) {
      if (currentValue < thresholds.low) return { text: 'BAJO', color: '#EF4444', bgColor: '#FEE2E2' };
      if (currentValue > thresholds.high) return { text: 'ALTO', color: '#F97316', bgColor: '#FED7AA' };
      return { text: 'ÓPTIMO', color: '#10B981', bgColor: '#D1FAE5' };
    }
    return { text: 'NORMAL', color: color, bgColor: '#F3F4F6' };
  };

  const currentColor = getCurrentColor();
  const status = getStatus();

  // --- LÓGICA DE DIBUJO EN CANVAS (COMBINADA) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuración básica
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.8;
    const radius = Math.min(canvas.width, canvas.height) * 0.35;
    const lineWidth = 20;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Dibujar arcos de color basados en umbrales (método del segundo código)
    if (thresholds) {
      // Sección baja (rojo)
      const lowAngle = percentageToAngle(getValuePercentage(thresholds.low));
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, Math.PI, lowAngle);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      // Sección óptima (verde)
      const highAngle = percentageToAngle(getValuePercentage(thresholds.high));
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, lowAngle, highAngle);
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      // Sección alta (naranja)
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, highAngle, 2 * Math.PI);
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    } else {
      // Dibujo simple si no hay umbrales
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    // 2. Superponer el "progreso no alcanzado" en gris claro
    const currentAngle = percentageToAngle(getValuePercentage(currentValue));
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, currentAngle, 2 * Math.PI);
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // 3. Dibujar marcas de escala
    for (let i = 0; i <= 10; i++) {
        const angle = Math.PI + (i / 10) * Math.PI;
        const x1 = centerX + Math.cos(angle) * (radius - 10);
        const y1 = centerY + Math.sin(angle) * (radius - 10);
        const x2 = centerX + Math.cos(angle) * (radius - 20);
        const y2 = centerY + Math.sin(angle) * (radius - 20);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#6B7280';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // --- 4. DIBUJAR LA AGUJA (MÉTODO DEL SEGUNDO CÓDIGO) ---
    // Se usa 'currentAngle' que proviene del valor animado 'currentValue'
    const needleLength = radius * 0.9;
    const needleWidth = 4;
    
    // Calcular coordenadas de la punta y la base
    const needleTipX = centerX + Math.cos(currentAngle) * needleLength;
    const needleTipY = centerY + Math.sin(currentAngle) * needleLength;
    const baseAngle1 = currentAngle + Math.PI / 2;
    const baseAngle2 = currentAngle - Math.PI / 2;
    const baseX1 = centerX + Math.cos(baseAngle1) * needleWidth;
    const baseY1 = centerY + Math.sin(baseAngle1) * needleWidth;
    const baseX2 = centerX + Math.cos(baseAngle2) * needleWidth;
    const baseY2 = centerY + Math.sin(baseAngle2) * needleWidth;
    
    // Dibujar el triángulo de la aguja
    ctx.beginPath();
    ctx.moveTo(needleTipX, needleTipY);
    ctx.lineTo(baseX1, baseY1);
    ctx.lineTo(baseX2, baseY2);
    ctx.closePath();
    
    // Estilo y gradiente de la aguja
    const gradient = ctx.createLinearGradient(centerX, centerY, needleTipX, needleTipY);
    gradient.addColorStop(0, '#1F2937'); // Base oscura
    gradient.addColorStop(1, '#DC2626'); // Punta roja
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    // 5. Dibujar círculo central
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#111827';
    ctx.fill();
    
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
          {/* Se muestra el valor animado */}
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