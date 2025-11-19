import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  Product,
  Category,
  Order,
  User,
  LoginCredentials,
  RegisterData,
  CreateOrderData,
  PaginatedResponse,
} from '@/types';

// API URLs from environment
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000';
const PRODUCTS_URL = process.env.NEXT_PUBLIC_PRODUCTS_URL || 'http://localhost:3001';
const CATEGORIES_URL = process.env.NEXT_PUBLIC_CATEGORIES_URL || 'http://localhost:3002';
const USERS_URL = process.env.NEXT_PUBLIC_USERS_URL || 'http://localhost:3003';
const ORDERS_URL = process.env.NEXT_PUBLIC_ORDERS_URL || 'http://localhost:3004';

// Create axios instance with interceptors
const createAPIClient = (baseURL: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add auth token
  client.interceptors.request.use(
    (config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If 401 and not already retried, try to refresh token
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const response = await axios.post(`${AUTH_URL}/api/v1/oauth/token`, {
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
              client_id: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID,
            });

            const { access_token } = response.data;
            localStorage.setItem('accessToken', access_token);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return client(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

// API clients for each service
const authClient = createAPIClient(AUTH_URL);
const productsClient = createAPIClient(PRODUCTS_URL);
const categoriesClient = createAPIClient(CATEGORIES_URL);
const usersClient = createAPIClient(USERS_URL);
const ordersClient = createAPIClient(ORDERS_URL);

// Auth API
export const authAPI = {
  // OAuth2 flow
  login: (credentials: LoginCredentials & { client_id?: string; redirect_uri?: string; scope?: string }) =>
    authClient.post('/api/v1/auth/login', {
      ...credentials,
      client_id: credentials.client_id || process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID,
      redirect_uri: credentials.redirect_uri || process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI,
      scope: credentials.scope || process.env.NEXT_PUBLIC_OAUTH_SCOPE,
    }),

  register: (data: RegisterData) => authClient.post('/api/v1/auth/register', data),

  getUserInfo: () => authClient.get('/api/v1/oauth/userinfo'),

  refreshToken: (refresh_token: string) =>
    authClient.post('/api/v1/oauth/token', {
      grant_type: 'refresh_token',
      refresh_token,
      client_id: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID,
    }),

  logout: () => authClient.post('/api/v1/oauth/revoke'),

  getOIDCConfig: () => authClient.get('/.well-known/openid-configuration'),
};

// Products API
export const productsAPI = {
  getProducts: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    search?: string;
    sort?: string;
  }) => productsClient.get<PaginatedResponse<Product>>('/api/v1/products', { params }),

  getProductById: (id: string) => productsClient.get<Product>(`/api/v1/products/${id}`),

  searchProducts: (query: string) =>
    productsClient.get<Product[]>('/api/v1/products/search', { params: { q: query } }),

  createProduct: (data: Partial<Product>) => productsClient.post<Product>('/api/v1/products', data),

  updateProduct: (id: string, data: Partial<Product>) =>
    productsClient.put<Product>(`/api/v1/products/${id}`, data),

  deleteProduct: (id: string) => productsClient.delete(`/api/v1/products/${id}`),
};

// Categories API
export const categoriesAPI = {
  getCategories: () => categoriesClient.get<Category[]>('/api/v1/categories'),

  getCategoryById: (id: string) => categoriesClient.get<Category>(`/api/v1/categories/${id}`),

  getCategoryBySlug: (slug: string) =>
    categoriesClient.get<Category>(`/api/v1/categories/slug/${slug}`),

  createCategory: (data: Partial<Category>) =>
    categoriesClient.post<Category>('/api/v1/categories', data),

  updateCategory: (id: string, data: Partial<Category>) =>
    categoriesClient.put<Category>(`/api/v1/categories/${id}`, data),

  deleteCategory: (id: string) => categoriesClient.delete(`/api/v1/categories/${id}`),
};

// Users API
export const usersAPI = {
  getCurrentUser: () => usersClient.get<User>('/api/v1/users/me'),

  getUserById: (id: string) => usersClient.get<User>(`/api/v1/users/${id}`),

  updateUser: (id: string, data: Partial<User>) =>
    usersClient.put<User>(`/api/v1/users/${id}`, data),

  deleteUser: (id: string) => usersClient.delete(`/api/v1/users/${id}`),
};

// Orders API
export const ordersAPI = {
  getUserOrders: (userId: string) => ordersClient.get<Order[]>(`/api/v1/orders/user/${userId}`),

  getOrderById: (id: string) => ordersClient.get<Order>(`/api/v1/orders/${id}`),

  createOrder: (data: CreateOrderData) => ordersClient.post<Order>('/api/v1/orders', data),

  updateOrderStatus: (id: string, status: Order['status']) =>
    ordersClient.patch<Order>(`/api/v1/orders/${id}/status`, { status }),

  cancelOrder: (id: string) => ordersClient.patch<Order>(`/api/v1/orders/${id}/cancel`),
};

// Export all
export {
  authClient,
  productsClient,
  categoriesClient,
  usersClient,
  ordersClient,
};
