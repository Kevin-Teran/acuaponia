import React from 'react';
import { Thermometer, Droplets, Wind, RefreshCw } from 'lucide-react';
import { DataSummary } from '../../types';
import { Card } from '../common/Card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SummaryCardsProps {
  summary: DataSummary;
  lastUpdate: Date;
  onRefresh: () => void;
  loading?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  lastUpdate,
  onRefresh,
  loading = false,
}) => {
  const cards = [
    {
      title: 'Temperatura',
      icon: Thermometer,
      current: summary.temperature.current,
      unit: '°C',
      min: summary.temperature.min,
      max: summary.temperature.max,
      avg: summary.temperature.avg,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'pH',
      icon: Droplets,
      current: summary.ph.current,
      unit: '',
      min: summary.ph.min,
      max: summary.ph.max,
      avg: summary.ph.avg,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Oxígeno Disuelto',
      icon: Wind,
      current: summary.oxygen.current,
      unit: 'mg/L',
      min: summary.oxygen.min,
      max: summary.oxygen.max,
      avg: summary.oxygen.avg,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

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
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className={`p-2 rounded-lg ${card.bgColor}`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {card.title}
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {card.current.toFixed(1)}
                        <span className="text-lg text-gray-500 dark:text-gray-400 ml-1">
                          {card.unit}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Valor actual
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {card.min.toFixed(1)}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Mín</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {card.max.toFixed(1)}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Máx</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {card.avg.toFixed(1)}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Prom</div>
                      </div>
                    </div>
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