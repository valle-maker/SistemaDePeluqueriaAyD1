// Service catalog administration (HU-07) against the real backend. Only administrators can call
// these endpoints: the backend answers 403 "Acceso Denegado: Permisos Insuficientes" to anyone else.
import { ApiError } from "../api";
import {
  adminCreateService,
  adminListServices,
  adminSetServiceStatus,
  adminUpdateService,
  type ApiService,
} from "../backend";
import { loadCatalog } from "../catalog";

export type ServiceStatus = "ACTIVO" | "INACTIVO";

export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  category: string;
  status: ServiceStatus;
}

export type ServiceInput = Pick<Service, "name" | "duration" | "price" | "category">;
export type ServiceInputErrors = Partial<Record<keyof ServiceInput, string>>;

export const serviceCategories = ["Cortes", "Barba", "Combos", "Tratamientos"] as const;

export class ServiceApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ServiceApiError";
  }
}

export function validateServiceInput(input: ServiceInput): ServiceInputErrors {
  const errors: ServiceInputErrors = {};

  if (!input.name.trim()) errors.name = "El nombre es obligatorio.";
  if (!input.category.trim()) errors.category = "La categoría es obligatoria.";
  if (!Number.isInteger(input.duration) || input.duration < 10 || input.duration > 240) {
    errors.duration = "La duración debe ser un número entero entre 10 y 240 minutos.";
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    errors.price = "El precio es obligatorio y debe ser mayor a $0.";
  } else if (!Number.isInteger(input.price)) {
    errors.price = "El precio debe ser un valor entero en pesos, sin decimales.";
  }

  return errors;
}

function assertValid(input: ServiceInput): void {
  if (Object.keys(validateServiceInput(input)).length > 0) {
    throw new Error("Los datos del servicio no son válidos.");
  }
}

function toService(api: ApiService): Service {
  return {
    id: api.id,
    name: api.name,
    duration: api.duration,
    price: api.price,
    category: api.category,
    status: api.status,
  };
}

// Turns backend errors into ServiceApiError, showing the first field message on a 400
// (e.g. "El precio debe ser mayor a $0.") instead of the generic "Datos inválidos".
async function run<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiError) {
      const firstFieldError = error.fieldErrors ? Object.values(error.fieldErrors)[0] : undefined;
      throw new ServiceApiError(firstFieldError ?? error.message, error.status);
    }
    throw error;
  }
}

// What clients see (catalog, home, booking) is cached in memory: refresh it after every change.
const refreshPublicCatalog = () => void loadCatalog().catch(() => undefined);

export async function getServices(): Promise<Service[]> {
  const services = await run(() => adminListServices());
  return services.map(toService);
}

export async function createService(data: ServiceInput): Promise<Service> {
  assertValid(data);
  const created = await run(() => adminCreateService({ ...data, name: data.name.trim() }));
  refreshPublicCatalog();
  return toService(created);
}

export async function updateService(id: string, data: ServiceInput): Promise<Service> {
  assertValid(data);
  const updated = await run(() => adminUpdateService(id, { ...data, name: data.name.trim() }));
  refreshPublicCatalog();
  return toService(updated);
}

export async function toggleStatus(id: string, newStatus: ServiceStatus): Promise<Service> {
  const updated = await run(() => adminSetServiceStatus(id, newStatus));
  refreshPublicCatalog();
  return toService(updated);
}
