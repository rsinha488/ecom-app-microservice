/**
 * API Client Module
 *
 * Centralized API client with enhanced error handling for all microservices
 *
 * @module lib/api
 */

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
import { createEnhancedAPIClient, type APIResponse } from './apiClient';

// API URLs from environment
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000';
const PRODUCTS_URL = process.env.NEXT_PUBLIC_PRODUCTS_URL || 'http://localhost:3001';
const CATEGORIES_URL = process.env.NEXT_PUBLIC_CATEGORIES_URL || 'http://localhost:3002';
const USERS_URL = process.env.NEXT_PUBLIC_USERS_URL || 'http://localhost:3003';
const ORDERS_URL = process.env.NEXT_PUBLIC_ORDERS_URL || 'http://localhost:3004';

// Create enhanced API clients for each service
export const authClient = createEnhancedAPIClient({
  baseURL: AUTH_URL,
  serviceName: 'Auth',
  showToastOnError: true,
});

export const productsClient = createEnhancedAPIClient({
  baseURL: PRODUCTS_URL,
  serviceName: 'Products',
  showToastOnError: true,
});

export const categoriesClient = createEnhancedAPIClient({
  baseURL: CATEGORIES_URL,
  serviceName: 'Categories',
  showToastOnError: true,
});

export const usersClient = createEnhancedAPIClient({
  baseURL: USERS_URL,
  serviceName: 'Users',
  showToastOnError: true,
});

export const ordersClient = createEnhancedAPIClient({
  baseURL: ORDERS_URL,
  serviceName: 'Orders',
  showToastOnError: true,
  retryAttempts: 2, // Retry orders API calls twice on 503 errors
});

// ============================================================================
// Auth API
// ============================================================================

export const authAPI = {
  /**
   * Login with email and password (OAuth2 Password Grant)
   * @param credentials - User credentials
   * @returns Access token and user info
   */
  login: (credentials: LoginCredentials & { client_id?: string; redirect_uri?: string; scope?: string }) =>
    authClient.post<APIResponse<{ access_token: string; refresh_token: string; user: User }>>('/v1/auth/login', {
      ...credentials,
      client_id: credentials.client_id || process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID,
      redirect_uri: credentials.redirect_uri || process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI,
      scope: credentials.scope || process.env.NEXT_PUBLIC_OAUTH_SCOPE,
    }),

  /**
   * Register a new user
   * @param data - User registration data
   * @returns Created user info
   */
  register: (data: RegisterData) =>
    authClient.post<APIResponse<{ user: User }>>('/v1/auth/register', data),

  /**
   * Get current user information
   * @returns User profile data
   */
  getUserInfo: () =>
    authClient.get<APIResponse<User>>('/v1/auth/oauth/userinfo'),

  /**
   * Refresh access token
   * @param refresh_token - Refresh token
   * @returns New access token
   */
  refreshToken: (refresh_token: string) =>
    authClient.post<APIResponse<{ access_token: string; refresh_token: string }>>('/v1/auth/oauth/token', {
      grant_type: 'refresh_token',
      refresh_token,
      client_id: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || 'ecommerce-client',
      client_secret: process.env.NEXT_PUBLIC_OAUTH_CLIENT_SECRET || 'ecommerce-secret-change-in-production',
    }),

  /**
   * Logout and revoke tokens
   */
  logout: () =>
    authClient.post<APIResponse>('/v1/auth/oauth/revoke'),

  /**
   * Get OIDC discovery configuration
   */
  getOIDCConfig: () =>
    authClient.get<any>('/.well-known/openid-configuration'),
};

// ============================================================================
// Products API
// ============================================================================

export const productsAPI = {
  /**
   * Get all products with optional filters
   * @param params - Query parameters for filtering/pagination
   * @returns Paginated list of products
   */
  getProducts: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    search?: string;
    sort?: string;
  }) =>
    productsClient.get<APIResponse<{ products: Product[]; count: number }>>('/v1/products', { params }),

  /**
   * Get a single product by ID
   * @param id - Product ID
   * @returns Product details
   */
  getProductById: (id: string) =>
    productsClient.get<APIResponse<{ product: Product }>>(`/v1/products/${id}`),

  /**
   * Search products by query
   * @param query - Search query
   * @returns Matching products
   */
  searchProducts: (query: string) =>
    productsClient.get<APIResponse<{ products: Product[]; count: number }>>('/v1/products/search', { params: { q: query } }),

  /**
   * Create a new product (Admin only)
   * @param data - Product data
   * @returns Created product
   */
  createProduct: (data: Partial<Product>) =>
    productsClient.post<APIResponse<{ product: Product }>>('/v1/products', data),

  /**
   * Update a product (Admin only)
   * @param id - Product ID
   * @param data - Updated product data
   * @returns Updated product
   */
  updateProduct: (id: string, data: Partial<Product>) =>
    productsClient.put<APIResponse<{ product: Product }>>(`/v1/products/${id}`, data),

  /**
   * Delete a product (Admin only)
   * @param id - Product ID
   * @returns Deletion confirmation
   */
  deleteProduct: (id: string) =>
    productsClient.delete<APIResponse<{ deletedProductId: string }>>(`/v1/products/${id}`),
};

// ============================================================================
// Categories API
// ============================================================================

export const categoriesAPI = {
  /**
   * Get all categories
   * @returns List of categories
   */
  getCategories: () =>
    categoriesClient.get<APIResponse<{ categories: Category[]; count: number }>>('/v1/categories'),

  /**
   * Get a single category by ID
   * @param id - Category ID
   * @returns Category details
   */
  getCategoryById: (id: string) =>
    categoriesClient.get<APIResponse<{ category: Category }>>(`/v1/categories/${id}`),

  /**
   * Get a category by slug
   * @param slug - Category slug
   * @returns Category details
   */
  getCategoryBySlug: (slug: string) =>
    categoriesClient.get<APIResponse<{ category: Category }>>(`/v1/categories/slug/${slug}`),

  /**
   * Create a new category (Admin only)
   * @param data - Category data
   * @returns Created category
   */
  createCategory: (data: Partial<Category>) =>
    categoriesClient.post<APIResponse<{ category: Category }>>('/v1/categories', data),

  /**
   * Update a category (Admin only)
   * @param id - Category ID
   * @param data - Updated category data
   * @returns Updated category
   */
  updateCategory: (id: string, data: Partial<Category>) =>
    categoriesClient.put<APIResponse<{ category: Category }>>(`/v1/categories/${id}`, data),

  /**
   * Delete a category (Admin only)
   * @param id - Category ID
   * @returns Deletion confirmation
   */
  deleteCategory: (id: string) =>
    categoriesClient.delete<APIResponse<{ deletedCategoryId: string }>>(`/v1/categories/${id}`),
};

// ============================================================================
// Users API
// ============================================================================

export const usersAPI = {
  /**
   * Get current user profile
   * @returns User profile
   */
  getCurrentUser: () =>
    usersClient.get<APIResponse<{ user: User }>>('/v1/users/me'),

  /**
   * Get a user by ID (Admin only)
   * @param id - User ID
   * @returns User details
   */
  getUserById: (id: string) =>
    usersClient.get<APIResponse<{ user: User }>>(`/v1/users/${id}`),

  /**
   * Update user profile
   * @param id - User ID
   * @param data - Updated user data
   * @returns Updated user
   */
  updateUser: (id: string, data: Partial<User>) =>
    usersClient.put<APIResponse<{ user: User }>>(`/v1/users/${id}`, data),

  /**
   * Delete a user (Admin only)
   * @param id - User ID
   * @returns Deletion confirmation
   */
  deleteUser: (id: string) =>
    usersClient.delete<APIResponse<{ deletedUserId: string }>>(`/v1/users/${id}`),
};

// ============================================================================
// Orders API
// ============================================================================

export const ordersAPI = {
  /**
   * Get all orders for a user
   * @param userId - User ID
   * @returns List of user's orders
   */
  getUserOrders: (userId: string) =>
    ordersClient.get<APIResponse<{ orders: Order[]; count: number; userId: string }>>(`/v1/orders/user/${userId}`),

  /**
   * Get a single order by ID
   * @param id - Order ID
   * @returns Order details
   */
  getOrderById: (id: string) =>
    ordersClient.get<APIResponse<{ order: Order }>>(`/v1/orders/${id}`),

  /**
   * Create a new order
   * @param data - Order data
   * @returns Created order
   */
  createOrder: (data: CreateOrderData) =>
    ordersClient.post<APIResponse<{ order: Order }>>('/v1/orders', data),

  /**
   * Update order status (Admin only)
   * @param id - Order ID
   * @param status - New status code (1-5)
   * @returns Updated order with status labels
   */
  updateOrderStatus: (id: string, status: number) =>
    ordersClient.patch<APIResponse<{
      order: Order;
      oldStatus: number;
      oldStatusLabel: string;
      newStatus: number;
      newStatusLabel: string;
    }>>(`/v1/orders/${id}/status`, { status }),

  /**
   * Get all available order statuses
   * @returns List of status codes with metadata
   */
  getOrderStatuses: () =>
    ordersClient.get<APIResponse<{
      statuses: Array<{
        code: number;
        string: string;
        label: string;
        color: string;
      }>;
    }>>('/v1/orders/statuses'),

  /**
   * Cancel an order
   * @param id - Order ID
   * @returns Updated order
   */
  cancelOrder: (id: string) =>
    ordersClient.patch<APIResponse<{ order: Order }>>(`/v1/orders/${id}/cancel`),
};
