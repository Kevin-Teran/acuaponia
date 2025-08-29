'use client';
import { useDashboard } from '@/hooks/useDashboard';

// --- IMPORTACIONES CORREGIDAS Y VERIFICADAS ---
// Componentes con exportación NOMBRADA (usan llaves {})
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Card } from '@/components/common/Card';
import { GaugeChart } from '@/components/dashboard/GaugeChart';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { LineChart } from '@/components/dashboard/LineChart';

// Componente con exportación POR DEFECTO (NO usa llaves)
import DashboardFilters from '@/components/dashboard/DashboardFilters'; // CORRECCIÓN APLICADA AQUÍ

const DashboardPage = () => {
  const {
    loading,
    users,
    tanks,
    filters,
    handleFilterChange,
    latestData,
    historicalData,
    summary,
    thresholds,
    currentUser,
  } = useDashboard();

  if (loading.base) {
    return <LoadingSpinner fullScreen message="Cargando datos iniciales..." />;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Dashboard de Monitoreo
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Visualización de datos en tiempo real e históricos.
        </p>
      </header>

      <DashboardFilters
        users={users}
        tanks={tanks}
        filters={filters}
        onFilterChange={handleFilterChange}
        currentUser={currentUser}
        isLoading={loading.data} // Se añade la prop isLoading que espera el componente
      />

      {loading.data && (
        <div className="flex justify-center py-8">
          <LoadingSpinner message="Actualizando datos..." />
        </div>
      )}

      {!loading.data && !filters.tankId && (
        <Card>
          <div className="text-center p-8">
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
              Sin Tanques Disponibles
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              El usuario seleccionado no tiene tanques. Por favor, asigne uno o
              seleccione otro usuario.
            </p>
          </div>
        </Card>
      )}

      {!loading.data && filters.tankId && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
              Mediciones en Tiempo Real
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GaugeChart
                label="Temperatura"
                value={latestData?.temperature ?? 0}
                unit="°C"
                threshold={thresholds?.temperatureThreshold}
              />
              <GaugeChart
                label="pH"
                value={latestData?.ph ?? 0}
                unit=""
                threshold={thresholds?.phThreshold}
              />
              <GaugeChart
                label="Oxígeno Disuelto"
                value={latestData?.oxygen ?? 0}
                unit="mg/L"
                threshold={thresholds?.oxygenThreshold}
              />
            </div>
          </Card>

          <SummaryCards summary={summary} />

          <Card>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
              Histórico de Datos del {filters.startDate} al {filters.endDate}
            </h2>
            <LineChart historicalData={historicalData} />
          </Card>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;