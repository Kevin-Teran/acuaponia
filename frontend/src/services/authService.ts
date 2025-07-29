import axios from 'axios';
import { LoginCredentials, User } from '../types';

/**
 * Axios instance configured for authentication requests
 */
const authApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
  timeout: 15000,
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

/**
 * Authenticates a user with the provided credentials
 * @param {LoginCredentials} credentials - User login credentials
 * @returns {Promise<User>} Authenticated user object
 * @throws {Error} When authentication fails
 */
export const login = async (credentials: LoginCredentials): Promise<User> => {
  try {
    // Verify server availability first
    try {
      await authApi.get('/auth/health', { timeout: 5000 });
    } catch (healthError) {
      console.error('Server not available:', healthError.message);
      throw new Error('Cannot connect to server. Verify it\'s running on http://localhost:5001');
    }

    const response = await authApi.post<LoginResponse>('/auth/login', credentials);

    if (response.data.success && response.data.data) {
      const { user, tokens } = response.data.data;

      localStorage.setItem('acuaponia_token', tokens.accessToken);
      localStorage.setItem('acuaponia_refresh_token', tokens.refreshToken);
      localStorage.setItem('acuaponia_user', JSON.stringify(user));

      return user;
    } else {
      console.error('Invalid server response:', response.data);
      throw new Error('Server response does not contain expected data.');
    }
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Connection timed out. Check your internet connection.');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to server. Verify it\'s running.');
    } else if (error.code === 'ERR_NETWORK') {
      throw new Error('Network error. Check your internet connection.');
    } else if (error.response) {
      const errorMessage = error.response.data?.error?.message || 
                         error.response.data?.message || 
                         `Server error (${error.response.status})`;
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error('No response from server. Verify it\'s running.');
    } else {
      throw new Error(error.message || 'Unexpected login error');
    }
  }
};

/**
 * Logs out the current user by clearing stored tokens
 */
export const logout = (): void => {
  localStorage.removeItem('acuaponia_token');
  localStorage.removeItem('acuaponia_refresh_token');
  localStorage.removeItem('acuaponia_user');
};

/**
 * Retrieves the currently authenticated user from localStorage
 * @returns {User | null} Current user object or null if not authenticated
 */
export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem('acuaponia_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    return null;
  }
};

/**
 * Refreshes the authentication token using the refresh token
 * @returns {Promise<string>} New access token
 * @throws {Error} When refresh fails
 */
export const refreshToken = async (): Promise<string> => {
  const refreshTokenValue = localStorage.getItem('acuaponia_refresh_token');
  
  if (!refreshTokenValue) {
    console.error('No refresh token available');
    throw new Error('No refresh token available');
  }

  try {
    const response = await authApi.post('/auth/refresh', { 
      refreshToken: refreshTokenValue 
    });
    
    const newAccessToken = response.data.data.accessToken;
    localStorage.setItem('acuaponia_token', newAccessToken);
    
    return newAccessToken;
  } catch (error) {
    console.error('Refresh token error:', error);
    
    // Clear all auth data if refresh fails
    localStorage.removeItem('acuaponia_token');
    localStorage.removeItem('acuaponia_refresh_token');
    localStorage.removeItem('acuaponia_user');
    
    throw error;
  }
};