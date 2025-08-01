import React, { useMemo } from 'react';
import { Thermometer, Droplets, Wind, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DataSummary } from '../../types';
import { Card } from '../common/Card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SummaryCardsProps {
  summary: DataSummary; // Contiene los datos en tiempo real (current, previous)
  historicalSummary: DataSummary; // Contiene los datos históricos (min, max, avg)
  lastUpdate: Date;
  onRefresh: () => void;
  loading?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  historicalSummary,
  lastUpdate,
  onRefresh,
  loading = false,
}) => {
  const cards = useMemo(() => [
    {
      title: 'Temperatura',
      icon: Thermometer,
      realtime: summary.temperature,
      historical: historicalSummary.temperature,
      unit: '°C',
      color: 'text-sena-blue',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'pH',
      icon: Droplets,
      realtime: summary.ph,
      historical: historicalSummary.ph,
      unit: '',
      color: 'text-sena-green',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Oxígeno Disuelto',
      icon: Wind,
      realtime: summary.oxygen,
      historical: historicalSummary.oxygen,
      unit: 'mg/L',
      color: 'text-sena-orange',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ], [summary, historicalSummary]);

  const getTrend = (current?: number, previous?: number) => {
    if (current === undefined || previous === undefined || current === previous) return { icon: <Minus className="w-5 h-5 text-gray-400" />, color: 'text-gray-500' };
    if (current > previous) return { icon: <TrendingUp className="w-5 h-5 text-green-500" />, color: 'text-green-500' };
    return { icon: <TrendingDown className="w-5 h-5 text-red-500" />, color: 'text-red-500' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Resumen de Variables
        </h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Última actualización: {format(lastUpdate, 'HH:mm:ss', { locale: es })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          const trendInfo = getTrend(card.realtime.current, card.realtime.previous);
          const difference = card.realtime.current && card.realtime.previous ? card.realtime.current - card.realtime.previous : null;

          return (
            <Card key={card.title} className="hover:shadow-lg transition-shadow p-0">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {card.title}
                  </h3>
                </div>
                
                <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline space-x-2">
                        <span className={`text-4xl font-bold ${card.color}`}>
                            {card.realtime.current.toFixed(1)}
                        </span>
                        <span className="text-xl text-gray-500 dark:text-gray-400">{card.unit}</span>
                    </div>
                    {difference !== null && (
                        <div className={`flex items-center font-semibold ${trendInfo.color}`}>
                            {trendInfo.icon}
                            <span>{difference.toFixed(2)}</span>
                        </div>
                    )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    Valor actual
                </div>
              </div>

              {/* Sección de datos históricos */}
              <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
                 <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Estadísticas del período seleccionado:</p>
                 <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="font-bold text-gray-800 dark:text-white">{card.historical.min.toFixed(1)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Mín</div>
                    </div>
                     <div>
                        <div className="font-bold text-gray-800 dark:text-white">{card.historical.avg.toFixed(1)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Prom</div>
                    </div>
                     <div>
                        <div className="font-bold text-gray-800 dark:text-white">{card.historical.max.toFixed(1)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Máx</div>
                    </div>
                 </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
