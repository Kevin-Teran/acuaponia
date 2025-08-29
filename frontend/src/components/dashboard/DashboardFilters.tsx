'use client';
import { UserFromApi, Tank } from '@/types';

interface Props {
  users: UserFromApi[];
  tanks: Tank[];
  filters: { userId: string; tankId: string; startDate: string; endDate: string };
  onFilterChange: (field: string, value: string) => void;
  currentUser: any;
}

const DashboardFilters = ({ users, tanks, filters, onFilterChange, currentUser }: Props) => {
  const handleDateChange = (field: string, value: string) => {
    const otherField = field === 'startDate' ? 'endDate' : 'startDate';
    const otherDate = new Date(filters[otherField]);
    const newDate = new Date(value);

    if (field === 'startDate' && newDate > otherDate) {
        // Opcional: alertar al usuario o ajustar la otra fecha
        return;
    }
    if (field === 'endDate' && newDate < otherDate) {
        return;
    }
    if (newDate > new Date()) { // No permitir fechas futuras
        return;
    }

    onFilterChange(field, value);
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6 flex items-center space-x-4">
      {currentUser?.role === 'ADMIN' && (
        <select
          value={filters.userId}
          onChange={(e) => onFilterChange('userId', e.target.value)}
          className="p-2 border rounded"
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      )}
      <select
        value={filters.tankId}
        onChange={(e) => onFilterChange('tankId', e.target.value)}
        className="p-2 border rounded"
      >
        {tanks.map((tank) => (
          <option key={tank.id} value={tank.id}>
            {tank.name}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={filters.startDate}
        onChange={(e) => handleDateChange('startDate', e.target.value)}
        className="p-2 border rounded"
      />
      <input
        type="date"
        value={filters.endDate}
        onChange={(e) => handleDateChange('endDate', e.target.value)}
        className="p-2 border rounded"
      />
    </div>
  );
};

export default DashboardFilters;