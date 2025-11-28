
export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  description: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  photoUrl?: string; // Added product image
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  bio: string;
  // Private info (Admin only)
  address?: string;
  phone?: string;
  cpf?: string;
  // Public info
  photoUrl?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string; // Used as ID for login
  birthDate: string;
  password?: string; // Optional
  createdAt: number;
}

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  type: 'percent' | 'fixed';
  active: boolean;
  usageCount: number;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: 'service' | 'product' | 'operational' | 'salary' | 'other';
  status: 'pending' | 'paid';
  date: string; // YYYY-MM-DD
  relatedAppointmentId?: string;
}

export interface Appointment {
  id: string;
  serviceId: string;
  serviceName: string;
  employeeId: string | null;
  employeeName: string;
  employeePhotoUrl?: string;
  products?: Product[]; // Added: products included in the appointment
  clientId?: string; // Link to registered client
  clientName?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  price: number; // Service price
  discount?: number; // Coupon discount amount
  couponCode?: string;
  totalPrice: number; // (Service + Products) - Discount
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: number;
}

export interface ShopSettings {
  shopName: string;
  address: string;
  phone: string;
  slotDuration: number; // base grid slot size in minutes (e.g., 30, 40, 60)
  openTime: string; // "09:00"
  closeTime: string; // "19:00"
  currency: string;
  views: number; // Page views count
}

// New interface for the Marketplace listing
export interface SalonMetadata {
  id: string;
  slug: string; // used for URL (e.g., barbearia-vintage)
  name: string;
  category: string;
  coverUrl: string;
  rating: number;
  location: string;
}

export enum ViewState {
  // Platform Views
  MARKETPLACE = 'MARKETPLACE',
  
  // Public Views
  PUBLIC_SALON = 'PUBLIC_SALON',
  CLIENT_AUTH = 'CLIENT_AUTH',
  CLIENT_STORE = 'CLIENT_STORE', // New Store View

  // Admin Views
  DASHBOARD = 'DASHBOARD', 
  SERVICES = 'SERVICES',
  PRODUCTS = 'PRODUCTS',
  TEAM = 'TEAM',
  FINANCE = 'FINANCE',
  COUPONS = 'COUPONS',
  SETTINGS = 'SETTINGS',
  CLIENT_PREVIEW = 'CLIENT_PREVIEW' // Admin previewing client view
}
