import React from 'react';
import { Card } from '../../common/Card'; // <-- CORRECCIÓN: Ruta relativa
import { User, Tank, Sensor } from '../../../types';

interface SelectionPanelProps {
  users: User[];
  tanks: Tank[];
  sensors: Sensor[];
  loading: { users: boolean; tanks: boolean; sensors: boolean };
  selections: { user: string; tank: string; sensor: string };
  onSelect: (type: 'user' | 'tank' | 'sensor', value: string) => void;
}

export const SelectionPanel: React.FC<SelectionPanelProps> = ({ users, tanks, sensors, loading, selections, onSelect }) => (
  <Card title="1. Selección de Objetivo">
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario</label>
        <select 
          className="w-full mt-1" 
          value={selections.user} 
          onChange={(e) => onSelect('user', e.target.value)} 
          disabled={loading.users}
        >
          <option value="">{loading.users ? "Cargando..." : "Seleccione un usuario"}</option>
          {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Tanque</label>
        <select 
          className="w-full mt-1" 
          value={selections.tank} 
          onChange={(e) => onSelect('tank', e.target.value)} 
          disabled={loading.tanks || !selections.user}
        >
          <option value="">{loading.tanks ? "Cargando..." : "Seleccione un tanque"}</option>
          {tanks.map((tank) => <option key={tank.id} value={tank.id}>{tank.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Sensor</label>
        <select 
          className="w-full mt-1" 
          value={selections.sensor} 
          onChange={(e) => onSelect('sensor', e.target.value)} 
          disabled={loading.sensors || !selections.tank}
        >
          <option value="">{loading.sensors ? "Cargando..." : "Seleccione un sensor"}</option>
          {sensors.map((sensor) => <option key={sensor.id} value={sensor.id}>{sensor.name} ({sensor.type})</option>)}
        </select>
      </div>
    </div>
  </Card>
);