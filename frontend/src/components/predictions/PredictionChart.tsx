/**
 * @file PredictionChart.tsx
 * @route frontend/src/components/predictions
 * @description Gráfica con umbrales visibles y línea de predicción punteada.
 * @author Kevin Mariano
 * @version 1.1.0
 * @since 1.0.0
 * @copyright SENA 2025
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Threshold } from '@/types';

interface PredictionChartProps {
  data: { time: string; value: number }[];
  thresholds?: Threshold | null;
  lineColor?: string;
}

/**
 * @description Calcula el dominio (min/max) del eje Y para asegurar que todos los datos y umbrales sean visibles.
 */
const getChartDomain = (data: { value: number }[], thresholds?: Threshold | null): [number, number] => {
  const dataValues = data.map(d => d.value);
  let allValues = [...dataValues];

  if (thresholds) {
    allValues = [...allValues, thresholds.minCritical, thresholds.maxCritical];
  }

  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  
  // Añadimos un pequeño margen (padding) para que no queden pegados a los bordes
  const padding = (max - min) * 0.1 || 1; // || 1 para evitar padding de 0

  return [Math.floor(min - padding), Math.ceil(max + padding)];
};

export const PredictionChart = ({ data, thresholds, lineColor = '#006FEE' }: PredictionChartProps) => {
  const domain = getChartDomain(data, thresholds);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: -10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={domain} />
        <Tooltip
          contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', borderColor: '#334155', borderRadius: '0.5rem' }}
          labelStyle={{ color: '#cbd5e1' }}
        />
        
        {/* Líneas de Umbrales */}
        {thresholds && (
          <>
            <ReferenceLine y={thresholds.maxCritical} stroke="#F31260" strokeDasharray="4 4" strokeWidth={2} />
            <ReferenceLine y={thresholds.maxWarning} stroke="#F5A524" strokeDasharray="4 4" strokeWidth={2} />
            <ReferenceLine y={thresholds.minWarning} stroke="#F5A524" strokeDasharray="4 4" strokeWidth={2} />
            <ReferenceLine y={thresholds.minCritical} stroke="#F31260" strokeDasharray="4 4" strokeWidth={2} />
          </>
        )}
        
        {/* Línea de predicción punteada */}
        <Line type="monotone" dataKey="value" name="Predicción" stroke={lineColor} strokeWidth={3} strokeDasharray="5 5" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};