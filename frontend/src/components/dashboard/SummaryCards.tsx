/**
 * @file SummaryCards.tsx
 * @description Componente visual de tarjetas de resumen. Recibe los datos como props.
 * @author Kevin Mariano
 * @version 2.0.0
 */
'use client';
import React from 'react';
import { Card } from '@/components/common/Card';
import { ArrowDown, ArrowUp, Thermometer, Droplet, Wind } from 'lucide-react';

interface SummaryData {
  min: number;
  max: number;
  avg: number;
}
interface SummaryCardsProps {
  summary: {
    temperature: SummaryData;
    ph: SummaryData;
    oxygen: SummaryData;
  };
}

const SummaryCard: React.FC<{ title: string; icon: React.ReactNode; data: SummaryData; unit: string }> = ({ title, icon, data, unit }) => {
    const hasData = data && typeof data.avg === 'number' && !isNaN(data.avg);
    return (
        <Card className="p-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-white">
            <div className="flex items-center mb-2 text-gray-600 dark:text-gray-300">
            {icon}
            <h4 className="text-lg font-semibold ml-2">{title}</h4>
            </div>
            <div className="text-3xl font-bold text-primary dark:text-primary-400 mb-3">
                {hasData ? data.avg.toFixed(2) : 'N/A'} <span className="text-lg">{unit}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center"><ArrowDown className="w-4 h-4 mr-1 text-red-500" /> Mín: {hasData ? data.min.toFixed(2) : 'N/A'}</div>
            <div className="flex items-center"><ArrowUp className="w-4 h-4 mr-1 text-green-500" /> Máx: {hasData ? data.max.toFixed(2) : 'N/A'}</div>
            </div>
        </Card>
    );
};

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SummaryCard title="Temperatura" icon={<Thermometer className="text-red-500"/>} data={summary.temperature} unit="°C" />
      <SummaryCard title="pH" icon={<Droplet className="text-blue-500"/>} data={summary.ph} unit="" />
      <SummaryCard title="Oxígeno" icon={<Wind className="text-sky-500"/>} data={summary.oxygen} unit="mg/L" />
    </div>
  );
};