/**
 * @file TankDetailView.tsx
 * @route frontend/src/components/analytics/
 * @description Componente de vista para el análisis detallado de un tanque específico.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import React from 'react';
import { Container, CheckCircle } from 'lucide-react';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { KpiCards } from '@/components/analytics/KpiCards';
import { ParameterCorrelation } from '@/components/analytics/ParameterCorrelation';
import { SensorType } from '@/types'; 

interface TankDetailViewProps {
    tanks: any;
    kpis: any;
    isAnalyticsLoading: any;
    userSettings: any;
    timeSeriesData: any;
    mainSensorType: SensorType | undefined;
    secondarySensorTypes: any;
    samplingFactor: number;
    currentRange: any;
    selectedTankId: string;
    selectedUserId: string | null;
    selectedRange: string;
    correlationData: any; 
}

/**
 * @function TankDetailView
 * @description Muestra KPIs, el gráfico de series de tiempo y la correlación para un tanque específico.
 * @param {TankDetailViewProps} props - Propiedades de la vista.
 */
export const TankDetailView: React.FC<TankDetailViewProps> = ({ tanks, kpis, isAnalyticsLoading, userSettings, timeSeriesData, mainSensorType, secondarySensorTypes, samplingFactor, currentRange, selectedTankId, selectedUserId, selectedRange, correlationData }) => {
    const selectedTank = tanks?.find((t: any) => t.id === selectedTankId);
    return (
        <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl">
                <Container className="w-8 h-8 text-white" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Análisis del Tanque: {selectedTank?.name || 'Cargando...'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                Vista detallada con todos los sensores del tanque
                </p>
            </div>
            </div>
            {kpis && kpis.count > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg dark:bg-green-900/30">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                {kpis.count.toLocaleString()} datos procesados
                </span>
            </div>
            )}
        </div>

        <KpiCards kpis={kpis} loading={isAnalyticsLoading.kpis} />

        <TimeSeriesChart
            data={timeSeriesData}
            loading={isAnalyticsLoading.timeSeries}
            mainSensorType={mainSensorType || SensorType.TEMPERATURE} 
            secondarySensorTypes={secondarySensorTypes}
            samplingFactor={samplingFactor}
            userSettings={userSettings}
            dateRange={currentRange}
        />

        <ParameterCorrelation
            data={correlationData}
            loading={isAnalyticsLoading.correlation}
            filters={{
                userId: selectedUserId,
                tankId: selectedTankId,
                range: selectedRange,
                // Nota: Estas fechas pueden necesitar ser ajustadas si correlationData usa un rango diferente al principal
                startDate: currentRange.from.toISOString(),
                endDate: currentRange.to.toISOString(),
            }}
        />
        </div>
    );
};