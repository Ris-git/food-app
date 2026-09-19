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
  const requestController = new AbortController();
  const requestTimeout = window.setTimeout(() => requestController.abort(), 30_000);
  if (options.signal) {
    if (options.signal.aborted) requestController.abort();
    else options.signal.addEventListener('abort', () => requestController.abort(), { once: true });
  }
  const token = localStorage.getItem('accessToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const organizationId = localStorage.getItem('activeOrganizationId');
  const restaurantId = localStorage.getItem('activeRestaurantId');
  if (organizationId) headers['X-Organization-Id'] = organizationId;
  if (restaurantId) headers['X-Restaurant-Id'] = restaurantId;

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: requestController.signal,
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
    if (error?.name === 'AbortError') throw new Error('The server took too long to respond. Please try again.');
    throw new Error(error.message || 'Network connection error. Please check your connection.');
  } finally {
    window.clearTimeout(requestTimeout);
  }
}
