import { Injectable } from '@nestjs/common';
import { TanksService } from '../tanks/tanks.service';
import { DateRange } from '../common/types';

/**
 * @typedef {Object} DashboardData
 * @property {any[]} tanks - Lista de tanques
 * @property {any} selectedTank - Tanque seleccionado
 * @property {any[]} sensorData - Datos de sensores
 * @property {any[]} alerts - Alertas activas
 */
interface DashboardData {
  tanks: any[];
  selectedTank: any;
  sensorData: any[];
  alerts: any[];
}

/**
 * @typedef {Object} DashboardFilters
 * @property {string} [userId] - ID del usuario (solo para admins)
 * @property {string} [tankId] - ID del tanque específico
 * @property {DateRange} dateRange - Rango de fechas
 */
interface DashboardFilters {
  userId?: string;
  tankId?: string;
  dateRange: DateRange;
}

/**
 * Servicio del dashboard
 * @class DashboardService
 * @description Maneja la lógica del dashboard principal
 */
@Injectable()
export class DashboardService {
  /**
   * Constructor del servicio del dashboard
   * @param {TanksService} tanksService - Servicio de tanques
   */
  constructor(
    private readonly tanksService: TanksService,
  ) {}

  /**
   * Obtiene los datos del dashboard para un usuario
   * @async
   * @param {string} userId - ID del usuario
   * @param {DashboardFilters} filters - Filtros aplicados
   * @returns {Promise<DashboardData>} Datos del dashboard
   * @example
   * const dashboardData = await dashboardService.getDashboardData('user-uuid', {
   *   dateRange: { startDate: new Date(), endDate: new Date() }
   * });
   */
  async getDashboardData(userId: string, filters: DashboardFilters): Promise<DashboardData> {
    // Obtener tanques del usuario
    const tanks = await this.tanksService.findByUserId(userId);
    
    // Seleccionar tanque (el más reciente si no se especifica)
    let selectedTank;
    if (filters.tankId) {
      selectedTank = await this.tanksService.findById(filters.tankId);
    } else {
      selectedTank = await this.tanksService.findLatestByUserId(userId);
    }

    // Simular datos de sensores (en implementación real vendría de SensorDataService)
    const sensorData = this.generateMockSensorData(filters.dateRange);
    
    // Simular alertas (en implementación real vendría de AlertsService)
    const alerts = this.generateMockAlerts();

    return {
      tanks,
      selectedTank,
      sensorData,
      alerts,
    };
  }

  /**
   * Genera datos simulados de sensores para pruebas
   * @private
   * @param {DateRange} dateRange - Rango de fechas
   * @returns {any[]} Datos simulados de sensores
   * @example
   * const mockData = this.generateMockSensorData({
   *   startDate: new Date('2024-01-01'),
   *   endDate: new Date('2024-01-31')
   * });
   */
  private generateMockSensorData(dateRange: DateRange): any[] {
    const data = [];
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    
    for (let d = new Date(start); d <= end; d.setHours(d.getHours() + 1)) {
      data.push({
        timestamp: new Date(d),
        temperature: 22 + Math.random() * 6, // 22-28°C
        ph: 6.5 + Math.random() * 1.5, // 6.5-8.0
        oxygen: 5 + Math.random() * 3, // 5-8 mg/L
      });
    }
    
    return data;
  }

  /**
   * Genera alertas simuladas para pruebas
   * @private
   * @returns {any[]} Alertas simuladas
   * @example
   * const mockAlerts = this.generateMockAlerts();
   */
  private generateMockAlerts(): any[] {
    return [
      {
        id: '1',
        type: 'TEMPERATURE_HIGH',
        severity: 'MEDIUM',
        message: 'Temperatura alta detectada en Tanque Principal',
        timestamp: new Date(),
        resolved: false,
      },
      {
        id: '2',
        type: 'PH_LOW',
        severity: 'LOW',
        message: 'Nivel de pH bajo en Tanque Secundario',
        timestamp: new Date(Date.now() - 3600000), // 1 hora atrás
        resolved: false,
      },
    ];
  }
}