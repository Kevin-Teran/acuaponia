/**
 * @file GaugeChart.tsx
 * @description Componente de medidor (gauge) altamente visual para representar una métrica en tiempo real.
 * @technical_requirements Utiliza la API de Canvas para un renderizado personalizado y performante.
 * Emplea `requestAnimationFrame` para animaciones suaves y `useMemo` para optimizar cálculos.
 */
 import React, { useRef, useEffect, useState, useMemo } from 'react';
 import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
 import { Card } from '@/components/common/Card';
 
 interface GaugeChartProps {
   value: number;
   previousValue?: number | null;
   min: number;
   max: number;
   label: string;
   unit: string;
   thresholds?: { min: number; max: number };
 }
 
 /**
  * @component GaugeChart
  * @description Visualiza una métrica en un medidor semicircular, mostrando valor actual, zonas de color
  * basadas en umbrales (bajo, óptimo, alto) y una flecha de tendencia.
  */
 export const GaugeChart: React.FC<GaugeChartProps> = ({
   value,
   previousValue,
   min,
   max,
   label,
   unit,
   thresholds,
 }) => {
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const [animatedValue, setAnimatedValue] = useState(value);
   const animationFrameRef = useRef<number>();
 
   const { trend, difference } = useMemo(() => {
     if (previousValue == null || value === previousValue) {
       return { trend: 'stable', difference: null };
     }
     const diff = value - previousValue;
     return {
       trend: diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'stable',
       difference: diff,
     };
   }, [value, previousValue]);
 
   useEffect(() => {
     const animate = () => {
       setAnimatedValue(prev => {
         const diff = value - prev;
         if (Math.abs(diff) < 0.01) {
           cancelAnimationFrame(animationFrameRef.current!);
           return value;
         }
         return prev + diff * 0.1; // Suaviza la animación
       });
       animationFrameRef.current = requestAnimationFrame(animate);
     };
     animationFrameRef.current = requestAnimationFrame(animate);
     return () => cancelAnimationFrame(animationFrameRef.current!);
   }, [value]);
   
   const status = useMemo(() => {
     if (!thresholds) return { text: 'NORMAL', color: '#3B82F6', bgColor: '#EFF6FF' };
     if (animatedValue < thresholds.min) return { text: 'BAJO', color: '#007BBF', bgColor: '#DBEAFE' };
     if (animatedValue > thresholds.max) return { text: 'ALTO', color: '#EF4444', bgColor: '#FEE2E2' };
     return { text: 'ÓPTIMO', color: '#10B981', bgColor: '#D1FAE5' };
   }, [animatedValue, thresholds]);
 
   useEffect(() => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     const ctx = canvas.getContext('2d');
     if (!ctx) return;
 
     const dpr = window.devicePixelRatio || 1;
     const rect = canvas.getBoundingClientRect();
     canvas.width = rect.width * dpr;
     canvas.height = rect.height * dpr;
     ctx.scale(dpr, dpr);
     
     const centerX = rect.width / 2;
     const centerY = rect.height * 0.8;
     const radius = Math.min(rect.width / 2, rect.height) * 0.7;
     const lineWidth = radius * 0.2;
 
     const getValuePercentage = (val: number) => Math.max(0, Math.min(1, (val - min) / (max - min)));
     const percentageToAngle = (p: number) => Math.PI + (p * Math.PI);
 
     ctx.clearRect(0, 0, rect.width, rect.height);
     
     // Dibuja los arcos de umbral
     if (thresholds) {
       const lowAngle = percentageToAngle(getValuePercentage(thresholds.min));
       const highAngle = percentageToAngle(getValuePercentage(thresholds.max));
       ctx.beginPath(); ctx.arc(centerX, centerY, radius, Math.PI, lowAngle); ctx.strokeStyle = '#007BBF'; ctx.lineWidth = lineWidth; ctx.stroke();
       ctx.beginPath(); ctx.arc(centerX, centerY, radius, lowAngle, highAngle); ctx.strokeStyle = '#10B981'; ctx.lineWidth = lineWidth; ctx.stroke();
       ctx.beginPath(); ctx.arc(centerX, centerY, radius, highAngle, 2 * Math.PI); ctx.strokeStyle = '#EF4444'; ctx.lineWidth = lineWidth; ctx.stroke();
     } else {
       ctx.beginPath(); ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI); ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = lineWidth; ctx.stroke();
     }
 
     // Dibuja el fondo gris para la parte no cubierta por el valor
     const valueAngle = percentageToAngle(getValuePercentage(animatedValue));
     ctx.beginPath(); ctx.arc(centerX, centerY, radius, valueAngle, 2 * Math.PI); ctx.strokeStyle = '#E5E7EB'; ctx.stroke();
 
     // Dibuja la aguja
     const needleLength = radius;
     const needleTipX = centerX + Math.cos(valueAngle) * needleLength;
     const needleTipY = centerY + Math.sin(valueAngle) * needleLength;
     ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.lineTo(needleTipX, needleTipY); ctx.strokeStyle = '#1F2937'; ctx.lineWidth = 4; ctx.stroke();
     ctx.beginPath(); ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI); ctx.fillStyle = '#111827'; ctx.fill();
 
   }, [animatedValue, min, max, thresholds]);
 
   const renderTrendIcon = () => {
     if (trend === 'up') return <TrendingUp className="w-5 h-5 text-green-500" />;
     if (trend === 'down') return <TrendingDown className="w-5 h-5 text-red-500" />;
     return <Minus className="w-5 h-5 text-gray-500" />;
   };
 
   return (
     <Card>
       <div className="text-center mb-4">
         <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{label}</h3>
         <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: status.bgColor, color: status.color }}>
           <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: status.color }}></div>
           <span>{status.text}</span>
         </div>
       </div>
       <div className="relative flex justify-center mb-2 h-40"><canvas ref={canvasRef} className="w-full h-full" /></div>
       <div className="text-center">
         <div className="flex items-center justify-center gap-2">
           <div className="text-4xl font-bold" style={{ color: status.color }}>
             {animatedValue.toFixed(unit === '' ? 2 : 1)}
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
         
         <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-2 px-2">
           <span>{min}{unit}</span>
           {thresholds && <span className="text-green-600 dark:text-green-400 font-medium">Óptimo: {thresholds.min}-{thresholds.max}{unit}</span>}
           <span>{max}{unit}</span>
         </div>
       </div>
     </Card>
   );
 };