import React, { useRef, useEffect } from 'react';

interface GaugeChartProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  thresholds?: { low: number; high: number };
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  min,
  max,
  label,
  unit,
  color,
  thresholds
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Calculate percentage and status
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  
  const getStatus = () => {
    if (thresholds) {
      if (value < thresholds.low) return { text: 'BAJO', color: '#EF4444', bgColor: '#FEE2E2' };
      if (value > thresholds.high) return { text: 'ALTO', color: '#F97316', bgColor: '#FED7AA' };
      return { text: 'ÓPTIMO', color: '#10B981', bgColor: '#D1FAE5' };
    }
    return { text: 'NORMAL', color: color, bgColor: '#F3F4F6' };
  };
  
  const status = getStatus();
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.75;
    const radius = Math.min(canvas.width, canvas.height) * 0.35;
    
    // Draw gauge background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 20;
    ctx.stroke();
    
    // Draw optimal range if thresholds exist
    if (thresholds) {
      const optimalStartPerc = Math.max(0, ((thresholds.low - min) / (max - min)) * 100);
      const optimalEndPerc = Math.min(100, ((thresholds.high - min) / (max - min)) * 100);
      
      const optimalStartAngle = Math.PI + (optimalStartPerc / 100) * Math.PI;
      const optimalEndAngle = Math.PI + (optimalEndPerc / 100) * Math.PI;
      
      // Draw optimal range background
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, optimalStartAngle, optimalEndAngle);
      ctx.strokeStyle = '#D1FAE5';
      ctx.lineWidth = 20;
      ctx.stroke();
    }
    
    // Draw value arc
    const startAngle = Math.PI;
    const endAngle = Math.PI + (percentage / 100) * Math.PI;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    // Change color based on optimal range
    if (thresholds) {
      if (value < thresholds.low || value > thresholds.high) {
        ctx.strokeStyle = value < thresholds.low ? '#EF4444' : '#F97316';
      } else {
        ctx.strokeStyle = '#10B981';
      }
    } else {
      ctx.strokeStyle = color;
    }
    ctx.lineWidth = 20;
    ctx.stroke();
    
    // Draw needle
    const needleAngle = Math.PI + (percentage / 100) * Math.PI;
    const needleLength = radius - 10;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(needleAngle);
    
    // Needle
    ctx.beginPath();
    ctx.moveTo(-needleLength + 10, 0);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fillStyle = '#374151';
    ctx.fill();
    
    ctx.restore();
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#374151';
    ctx.fill();
    
    // Draw scale marks (only major marks)
    for (let i = 0; i <= 4; i++) {
      const angle = Math.PI + (i / 4) * Math.PI;
      const x1 = centerX + Math.cos(angle) * (radius - 30);
      const y1 = centerY + Math.sin(angle) * (radius - 30);
      const x2 = centerX + Math.cos(angle) * (radius - 15);
      const y2 = centerY + Math.sin(angle) * (radius - 15);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
  }, [value, min, max, percentage, color, thresholds]);
  
  return (
    <div className="relative w-full bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
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
      
      {/* Gauge Container */}
      <div className="relative flex justify-center mb-6">
        <canvas
          ref={canvasRef}
          width={280}
          height={180}
          className="max-w-full h-auto"
        />
      </div>
      
      {/* Value Display */}
      <div className="text-center">
        <div className="text-4xl font-bold mb-2" style={{ color: color }}>
          {value.toFixed(1)}
          <span className="text-xl text-gray-500 dark:text-gray-400 ml-1">{unit}</span>
        </div>
        
      {/* Optimal Range Display */}
      {thresholds && (
        <div className="text-center mt-2">
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
            Rango Óptimo: {thresholds.low}-{thresholds.high}{unit}
          </span>
        </div>
      )}
      </div>
      
      {/* Progress Bar */}
      <div className="mt-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: color
            }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{percentage.toFixed(1)}%</span>
          <span>del rango total</span>
        </div>
      </div>
    </div>
  );
};
            backgroundColor: thresholds ? (
              value < thresholds.low ? '#EF4444' : 
              value > thresholds.high ? '#F97316' : '#10B981'
            ) : color