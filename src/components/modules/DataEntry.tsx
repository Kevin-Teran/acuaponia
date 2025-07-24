import React, { useState } from 'react';
import { Save, Plus, AlertCircle } from 'lucide-react';
import { Card } from '../common/Card';

export const DataEntry: React.FC = () => {
  const [formData, setFormData] = useState({
    temperature: '',
    ph: '',
    oxygen: '',
    location: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [savedEntries, setSavedEntries] = useState<any[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Simulación de guardado
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newEntry = {
      id: Date.now(),
      ...formData,
      timestamp: new Date().toISOString(),
      temperature: parseFloat(formData.temperature),
      ph: parseFloat(formData.ph),
      oxygen: parseFloat(formData.oxygen),
    };

    setSavedEntries(prev => [newEntry, ...prev]);
    setFormData({
      temperature: '',
      ph: '',
      oxygen: '',
      location: '',
      notes: '',
    });

    setSaving(false);
  };

  const isValid = formData.temperature && formData.ph && formData.oxygen;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Recolección Manual de Datos
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Ingreso manual como respaldo cuando fallan los sensores IoT
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de entrada */}
        <Card title="Nuevo Registro" subtitle="Ingrese los datos manualmente">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Temperatura (°C) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={formData.temperature}
                  onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="24.5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  pH *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="14"
                  value={formData.ph}
                  onChange={(e) => setFormData(prev => ({ ...prev, ph: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="7.2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Oxígeno (mg/L) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={formData.oxygen}
                  onChange={(e) => setFormData(prev => ({ ...prev, oxygen: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="8.5"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ubicación/Tanque
              </label>
              <select
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Seleccionar ubicación</option>
                <option value="tanque-1">Tanque Principal 1</option>
                <option value="tanque-2">Tanque Principal 2</option>
                <option value="crecimiento">Tanque de Crecimiento</option>
                <option value="filtrado">Sistema de Filtrado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notas/Observaciones
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Observaciones adicionales, condiciones especiales, etc."
              />
            </div>

            {!isValid && (
              <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Complete todos los campos obligatorios (*)</span>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={!isValid || saving}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : 'Guardar Registro'}</span>
              </button>
            </div>
          </form>
        </Card>

        {/* Registros recientes */}
        <Card title="Registros Recientes" subtitle={`${savedEntries.length} entradas guardadas`}>
          <div className="space-y-3">
            {savedEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Plus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay registros manuales aún</p>
                <p className="text-sm">Complete el formulario para agregar datos</p>
              </div>
            ) : (
              savedEntries.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    {entry.location && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                        {entry.location}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Temp:</span>
                      <span className="font-medium text-gray-900 dark:text-white ml-1">
                        {entry.temperature}°C
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">pH:</span>
                      <span className="font-medium text-gray-900 dark:text-white ml-1">
                        {entry.ph}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">O₂:</span>
                      <span className="font-medium text-gray-900 dark:text-white ml-1">
                        {entry.oxygen} mg/L
                      </span>
                    </div>
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 italic">
                      "{entry.notes}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};