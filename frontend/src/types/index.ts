// User types
export interface User {
  _id: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email_verified: boolean;
  phone_number?: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

// Product types
export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;
  sku?: string;
  brand?: string;
  tags?: string[];
  inStock: boolean;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  compareAtPrice?: number;
  specifications?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Category types
export interface Category {
  _id: string;
  name: string;
  description: string;
  slug: string;
  parentCategory?: string | null;
  isActive: boolean;
  order: number;
  imageUrl?: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

// Order types
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Order {
  _id: string;
  userId: string;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  status: number; // Numeric status code (1-5): 1=Pending, 2=Processing, 3=Shipped, 4=Delivered, 5=Cancelled
  shippingAddress: ShippingAddress;
  paymentStatus: number; // Numeric status code (1-4): 1=Pending, 2=Paid, 3=Failed, 4=Refunded
  paymentMethod: number; // Numeric method code (1-7): 1=Credit Card, 2=Debit Card, 3=PayPal, 4=COD, 5=Bank Transfer, 6=UPI, 7=Wallet
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  metadata: { transactionId: string }
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderData {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: Order['paymentMethod'];
}

// Pagination
export interface PaginatedResponse<T> {
  results: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// API Response
export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Error
export interface APIError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}
