const BASE_URL = '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  accessToken?: string;
  user?: any;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('accessToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    let data: any = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      const errorMessage =
        data.message || data.error || (response.status === 401 ? 'Invalid credentials or unauthorized' : `Server returned status ${response.status}: ${response.statusText}`);
      throw new Error(errorMessage);
    }


    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Network connection error. Please check your connection.');
  }
}
