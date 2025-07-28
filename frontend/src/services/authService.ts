// frontend/src/services/authService.ts
import axios from 'axios';
import { LoginCredentials, User } from '../types';

// Crear una instancia específica para auth sin interceptores que puedan causar loops
const authApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
  timeout: 15000, // 15 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

export const login = async (credentials: LoginCredentials): Promise<User> => {
  console.log('🚀 authService.login iniciado');
  console.log('📋 Credenciales:', { email: credentials.email, passwordLength: credentials.password.length });
  
  try {
    console.log('🌐 Verificando conectividad...');
    
    // Primero verificar si el servidor está disponible
    try {
      const healthCheck = await authApi.get('/auth/health', { timeout: 5000 });
      console.log('✅ Servidor disponible:', healthCheck.data);
    } catch (healthError) {
      console.error('❌ Servidor no disponible:', healthError.message);
      throw new Error('No se puede conectar con el servidor. Verifica que esté ejecutándose en http://localhost:5001');
    }
    
    console.log('📡 Enviando petición de login...');
    
    const response = await authApi.post<LoginResponse>('/auth/login', credentials);
    
    console.log('📬 Respuesta recibida:', {
      status: response.status,
      success: response.data.success,
      hasUser: !!response.data.data?.user,
      hasTokens: !!response.data.data?.tokens
    });
    
    if (response.data.success && response.data.data) {
      const { user, tokens } = response.data.data;

      console.log('👤 Datos de usuario:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      });

      console.log('🔑 Tokens recibidos:', {
        hasAccessToken: !!tokens.accessToken,
        hasRefreshToken: !!tokens.refreshToken,
        accessTokenLength: tokens.accessToken?.length || 0
      });

      // Guardar tokens y usuario en localStorage
      localStorage.setItem('acuaponia_token', tokens.accessToken);
      localStorage.setItem('acuaponia_refresh_token', tokens.refreshToken);
      localStorage.setItem('acuaponia_user', JSON.stringify(user));

      console.log('💾 Datos guardados en localStorage');

      return user;
    } else {
      console.error('❌ Respuesta inválida del servidor:', response.data);
      throw new Error('La respuesta del servidor no contiene los datos esperados.');
    }
  } catch (error: any) {
    console.error('💥 Error en authService.login:', error);
    
    // Análisis detallado del error
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Timeout de conexión');
      throw new Error('La conexión tardó demasiado. Verifica tu conexión a internet.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🚫 Conexión rechazada');
      throw new Error('No se puede conectar al servidor. Verifica que esté ejecutándose.');
    } else if (error.code === 'ERR_NETWORK') {
      console.error('🌐 Error de red');
      throw new Error('Error de red. Verifica tu conexión a internet.');
    } else if (error.response) {
      // Error de la API
      console.error('📤 Error de respuesta del servidor:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
      
      const errorMessage = error.response.data?.error?.message || 
                          error.response.data?.message || 
                          `Error del servidor (${error.response.status})`;
      throw new Error(errorMessage);
    } else if (error.request) {
      console.error('📡 Error de petición (sin respuesta):', error.request);
      throw new Error('No se recibió respuesta del servidor. Verifica que esté ejecutándose.');
    } else {
      console.error('❓ Error desconocido:', error.message);
      throw new Error(error.message || 'Error inesperado al iniciar sesión');
    }
  }
};

export const logout = (): void => {
  console.log('👋 Ejecutando logout...');
  
  localStorage.removeItem('acuaponia_token');
  localStorage.removeItem('acuaponia_refresh_token');
  localStorage.removeItem('acuaponia_user');
  
  console.log('🧹 localStorage limpiado');
};

export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem('acuaponia_user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    console.log('👤 Usuario actual desde localStorage:', user ? { 
      id: user.id, 
      email: user.email, 
      name: user.name 
    } : 'No hay usuario');
    
    return user;
  } catch (error) {
    console.error('💥 Error parsing user desde localStorage:', error);
    return null;
  }
};

export const refreshToken = async (): Promise<string> => {
  const refreshTokenValue = localStorage.getItem('acuaponia_refresh_token');
  
  console.log('🔄 Intentando refresh token...', { hasRefreshToken: !!refreshTokenValue });
  
  if (!refreshTokenValue) {
    console.error('❌ No hay refresh token disponible');
    throw new Error('No hay refresh token disponible');
  }

  try {
    const response = await authApi.post('/auth/refresh', { 
      refreshToken: refreshTokenValue 
    });
    
    const newAccessToken = response.data.data.accessToken;
    
    localStorage.setItem('acuaponia_token', newAccessToken);
    
    console.log('✅ Token renovado exitosamente');
    
    return newAccessToken;
  } catch (error) {
    console.error('💥 Error en refresh token:', error);
    
    // Si falla el refresh, limpiar todo
    localStorage.removeItem('acuaponia_token');
    localStorage.removeItem('acuaponia_refresh_token');
    localStorage.removeItem('acuaponia_user');
    
    throw error;
  }
};