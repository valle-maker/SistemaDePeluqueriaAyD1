// Typed wrappers for each backend endpoint (see the backend README / integration guide).
import { api } from './api';
import type { UserRole } from './data';

// ─── Auth (HU-01, HU-02, HU-03) ──────────────────────────────────────────────

export interface AuthResult {
  token: string;
  role: UserRole;
  fullName: string;
  email: string;
}

export function loginRequest(email: string, password: string) {
  return api<AuthResult>('/auth/login', { method: 'POST', auth: false, body: { email, password } });
}

export function registerRequest(body: { fullName: string; phone: string; email: string; password: string }) {
  return api<{ id: string; message?: string }>('/auth/register', { method: 'POST', auth: false, body });
}

export function logoutRequest() {
  return api<void>('/auth/logout', { method: 'POST' });
}

// ─── Catalog and stylists (HU-06, HU-07) ─────────────────────────────────────

export interface ApiService {
  id: string;
  name: string;
  category: 'Cortes' | 'Barba' | 'Combos' | 'Tratamientos';
  duration: number;
  price: number;
  status: 'ACTIVO' | 'INACTIVO';
  description?: string | null;
}

export interface ApiStylist {
  id: string;
  fullName: string;
  specialty: string;
  photoUrl: string | null;
  rating: number | null;
  serviceIds: string[];
}

export const fetchServices = (q?: string) => api<ApiService[]>('/services', { auth: false, query: { q } });
export const fetchStylists = (serviceId?: string) => api<ApiStylist[]>('/stylists', { auth: false, query: { serviceId } });
export const fetchPopularServices = (limit = 6) =>
  api<ApiService[]>('/home/popular-services', { auth: false, query: { limit } });

// ─── Home screen (HU-06) ─────────────────────────────────────────────────────

export interface ApiRecommendation {
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  price: number;
  stylistId: string;
  stylistName: string;
  label: string;
}

export interface ApiRecommendations {
  eligible: boolean;
  totalBookings: number;
  minBookings: number;
  recommendations: ApiRecommendation[];
}

export const fetchRecommendations = () => api<ApiRecommendations>('/home/recommendations');

export interface ApiMe {
  id: string;
  fullName: string;
  firstName: string;
  email: string;
  phone: string;
  role: UserRole;
  photoUrl: string | null;
}

export const fetchMe = () => api<ApiMe>('/users/me');

export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface ApiNotificationList {
  unreadCount: number;
  notifications: ApiNotification[];
}

export const fetchNotifications = (limit = 20) => api<ApiNotificationList>('/notifications', { query: { limit } });
export const markNotificationRead = (id: string) => api<void>(`/notifications/${id}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = () => api<void>('/notifications/read-all', { method: 'POST' });

// ─── Availability and booking (HU-12, HU-13) ─────────────────────────────────

export interface ApiSlot {
  time: string;
  stylistId: string;
  stylistIds: string[];
}

export interface ApiAvailability {
  date: string;
  stylistId: string;
  serviceId: string;
  durationMinutes: number;
  slots: ApiSlot[];
  message: string | null;
  serverTime: { timestamp: number; timeZone: string };
}

export const fetchAvailability = (stylistId: string, serviceId: string, date: string) =>
  api<ApiAvailability>('/availability', { query: { stylistId, serviceId, date } });

export interface ApiDayAvailability {
  date: string;
  hasAvailability: boolean;
}

// month is 1-12 here (the UI's JavaScript months are 0-11: the caller adds 1)
export const fetchMonthAvailability = (stylistId: string, serviceId: string, year: number, month: number) =>
  api<ApiDayAvailability[]>('/availability/month', { query: { stylistId, serviceId, year, month } });

export interface ApiAppointment {
  id: string;
  code: string;
  status: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  price: number;
  stylistId: string;
  stylistName: string;
  date: string;
  startTime: string;
  endTime: string;
  message: string;
}

export const createAppointment = (body: { serviceId: string; stylistId: string; date: string; time: string }) =>
  api<ApiAppointment>('/appointments', { method: 'POST', body });

// ─── Administration (HU-07, HU-09) ───────────────────────────────────────────

export interface ServiceInput {
  name: string;
  category: string;
  duration: number;
  price: number;
  description?: string;
}

export const adminListServices = (status?: 'ACTIVO' | 'INACTIVO') =>
  api<ApiService[]>('/admin/services', { query: { status } });
export const adminCreateService = (body: ServiceInput) => api<ApiService>('/admin/services', { method: 'POST', body });
export const adminUpdateService = (id: string, body: ServiceInput) =>
  api<ApiService>(`/admin/services/${id}`, { method: 'PUT', body });
export const adminSetServiceStatus = (id: string, status: 'ACTIVO' | 'INACTIVO') =>
  api<ApiService>(`/admin/services/${id}/status`, { method: 'PATCH', body: { status } });

export interface ScheduleEntryInput {
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface CreateStylistInput {
  fullName: string;
  phone: string;
  email: string;
  specialty: string;
  schedule: ScheduleEntryInput[];
  serviceIds?: string[];
  photoUrl?: string;
  rating?: number;
}

export const adminCreateStylist = (body: CreateStylistInput) =>
  api<{ id: string; message: string }>('/admin/stylists', { method: 'POST', body });
export const adminSetStylistServices = (id: string, serviceIds: string[]) =>
  api<unknown>(`/admin/stylists/${id}/services`, { method: 'PUT', body: { serviceIds } });
export const adminUpdateStylistProfile = (id: string, body: { photoUrl?: string; rating?: number }) =>
  api<unknown>(`/admin/stylists/${id}/profile`, { method: 'PATCH', body });
