import { apiRequest } from '../../../services/api';
import type { User } from '../../../types';

export type LoginCredentials = {
  username?: string;
  email?: string;
  password?: string;
};

export type SignupData = {
  name: string;
  email: string;
  username: string;
  password: string;
  phone: string;
};

export const authService = {
  async signup(data: SignupData) {
    return await apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(credentials: LoginCredentials) {
    const response = await apiRequest<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.accessToken) {
      localStorage.setItem('accessToken', response.accessToken);
    }

    return response;
  },

  async verifyEmail(token: string) {
    return await apiRequest(`/auth/verify-email?token=${token}`, {
      method: 'GET',
    });
  },

  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('accessToken');
    }
  },
};
