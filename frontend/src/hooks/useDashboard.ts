// src/hooks/useDashboard.ts
import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import {
  fetchDashboardData,
  DashboardData,
  DashboardFilters,
} from "../services/dashboardService"; // Ajusta la ruta según tu estructura

interface UseDashboardResult {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  socket: Socket | null;
}

/**
 * Custom hook para manejar el estado del dashboard, incluyendo fetch y socket.io
 * @param initialFilters - Filtros iniciales para cargar los datos del dashboard
 * @returns UseDashboardResult
 */
export const useDashboard = (initialFilters: DashboardFilters): UseDashboardResult => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);

  /**
   * Fetch de datos del dashboard desde el backend
   */
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("🔍 Fetching dashboard data with filters:", filters);
      const result = await fetchDashboardData(filters);
      console.log("✅ Dashboard data received:", result);
      setData(result);
    } catch (err: any) {
      console.error("❌ Error fetching dashboard data:", err);
      setError(err.message || "Error al obtener los datos del dashboard");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inicializa conexión con Socket.IO
   */
  useEffect(() => {
    const newSocket = io("http://localhost:5001"); // Ajusta URL si es necesario
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Conectado al servidor Socket.IO con ID:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      console.log("🔌 Desconectado del servidor Socket.IO");
    });

    newSocket.on("dashboard:update", (updatedData: DashboardData) => {
      console.log("📡 Actualización recibida por socket:", updatedData);
      setData(updatedData);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  /**
   * Refresca los datos del dashboard manualmente
   */
  const refresh = () => {
    loadData();
  };

  /**
   * Re-fetch cuando cambian los filtros
   */
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return { data, loading, error, refresh, socket };
};
