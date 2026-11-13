// Availability and booking against the real backend (HU-12, HU-13).
//
// There is no temporary slot hold any more: the slot is booked in ONE step by confirmReservation(),
// and if somebody else took it first the backend answers 409 with code SLOT_TAKEN (the screens
// show the "turno ocupado" dialog). The old simulated hold (reservarTurno / liberarTurno) is gone.
import { ApiError } from '../api';
import { createAppointment, fetchAppointment, fetchAppointments, fetchAvailability, fetchMonthAvailability, type ApiMyAppointment } from '../backend';
import type { Appointment, AppointmentStatus } from '../data';

export const ANY_STYLIST_ID = 'any';

export interface AvailabilityRequest {
  serviceId: string;
  stylistId: string; // a stylist id, or "any"
  date: string; // YYYY-MM-DD
}

export interface AvailableSlot {
  time: string;
  stylistId: string; // the stylist proposed for this slot
}

export interface ServerTime {
  timestamp: number;
  timeZone: string;
}

export interface AvailabilityDay {
  date: string;
  hasAvailability: boolean;
}

export interface BookingServiceErrorResponse {
  status: number;
  code: string;
  message: string;
}

export class BookingServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'BookingServiceError';
  }

  get response(): BookingServiceErrorResponse {
    return { status: this.status, code: this.code, message: this.message };
  }
}

// Slots (HU-12): start times where the whole service fits, already net of appointments, breaks,
// closing time and same-day notice. `message` is the "no turns" text when the list is empty.
export async function getDisponibilidad(
  request: AvailabilityRequest,
): Promise<{ slots: AvailableSlot[]; serverTime: ServerTime; message: string | null }> {
  const response = await fetchAvailability(request.stylistId, request.serviceId, request.date);
  return {
    slots: response.slots.map(slot => ({ time: slot.time, stylistId: slot.stylistId })),
    serverTime: response.serverTime,
    message: response.message,
  };
}

export const getAvailability = getDisponibilidad;

// Calendar markers (HU-12): does each day of the month have at least one free slot?
// `month` is 0-11 (JavaScript); the backend takes 1-12.
export async function getAvailabilityForMonth(request: {
  serviceId: string;
  stylistId: string;
  year: number;
  month: number;
}): Promise<AvailabilityDay[]> {
  if (!Number.isInteger(request.year) || !Number.isInteger(request.month) || request.month < 0 || request.month > 11) {
    throw new Error('El mes solicitado no es válido.');
  }
  return fetchMonthAvailability(request.stylistId, request.serviceId, request.year, request.month + 1);
}

// Books the slot (HU-13). Rejects with BookingServiceError (status 409, code SLOT_TAKEN) when the
// turn was just taken by someone else.
export async function confirmReservation(request: {
  servicioId: string;
  estilistaId: string;
  fecha: string;
  horaInicio: string;
}): Promise<{ reservationCode: string; stylistId: string; stylistName: string }> {
  try {
    const appointment = await createAppointment({
      serviceId: request.servicioId,
      stylistId: request.estilistaId,
      date: request.fecha,
      time: request.horaInicio,
    });
    return {
      reservationCode: appointment.code,
      stylistId: appointment.stylistId,
      stylistName: appointment.stylistName,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new BookingServiceError(error.message, 409, error.code ?? 'SLOT_TAKEN');
    }
    throw error;
  }
}

export const confirmBooking = confirmReservation;

// ─── My appointments (HU-14, HS-02) ──────────────────────────────────────────

// The server answered 403: the appointment is not the user's (or does not exist; the answer is the
// same on purpose so nobody can probe other clients' bookings).
export class AppointmentAccessError extends Error {
  constructor(message = 'No tienes autorización para consultar esta información.') {
    super(message);
    this.name = 'AppointmentAccessError';
  }
}

export type AppointmentActionErrorCode =
  | 'APPOINTMENT_NOT_FOUND'
  | 'APPOINTMENT_ALREADY_CANCELLED'
  | 'APPOINTMENT_ALREADY_COMPLETED'
  | 'APPOINTMENT_ALREADY_PASSED'
  | 'INSUFFICIENT_NOTICE'
  | 'INVALID_RESCHEDULE'
  | 'NOT_AVAILABLE_YET';

export class AppointmentActionError extends Error {
  constructor(message: string, public readonly code: AppointmentActionErrorCode) {
    super(message);
    this.name = 'AppointmentActionError';
  }
}

const STATUS_FROM_API: Record<string, AppointmentStatus> = {
  CONFIRMADA: 'confirmed',
  COMPLETADA: 'completed',
  CANCELADA: 'cancelled',
};

function toAppointment(api: ApiMyAppointment): Appointment {
  return {
    id: api.id,
    code: api.code,
    clientName: '',
    serviceId: api.serviceId,
    serviceName: api.serviceName,
    stylistId: api.stylistId,
    stylistName: api.stylistName,
    date: api.date,
    time: api.startTime,
    endTime: api.endTime,
    durationMinutes: api.durationMinutes,
    price: api.price,
    status: STATUS_FROM_API[api.status] ?? 'confirmed',
  };
}

function asAppointmentError(error: unknown): never {
  if (error instanceof ApiError && error.status === 403) throw new AppointmentAccessError(error.message);
  throw error;
}

// Upcoming and history come from the server already split; the screen re-splits them with the
// clock so a card moves to the history the moment its time passes.
export async function getMyAppointments(): Promise<Appointment[]> {
  try {
    const [upcoming, history] = await Promise.all([fetchAppointments('upcoming'), fetchAppointments('history')]);
    return [...upcoming, ...history].map(toAppointment);
  } catch (error) {
    return asAppointmentError(error);
  }
}

export async function getMyAppointment(appointmentId: string): Promise<Appointment> {
  if (!appointmentId.trim()) throw new AppointmentAccessError();
  try {
    return toAppointment(await fetchAppointment(appointmentId));
  } catch (error) {
    return asAppointmentError(error);
  }
}

const MINIMUM_NOTICE_MS = 2 * 60 * 60 * 1000; // same rule as the backend (app.booking.min-notice-hours)

export function canManageAppointment(
  appointment: Pick<Appointment, 'date' | 'time' | 'status'>,
  now = Date.now(),
): boolean {
  const startsAt = new Date(`${appointment.date}T${appointment.time}:00-05:00`).getTime();
  return appointment.status === 'confirmed' && startsAt - now >= MINIMUM_NOTICE_MS;
}

// Cancelling and rescheduling are HU-15: until the backend has those endpoints they only explain it.
function notAvailableYet(): never {
  throw new AppointmentActionError('Esta acción estará disponible muy pronto.', 'NOT_AVAILABLE_YET');
}

export async function cancelMyAppointment(_appointmentId: string, _userName?: string, _reason?: string): Promise<Appointment> {
  return notAvailableYet();
}

export async function requestAppointmentReschedule(_appointmentId: string): Promise<Appointment> {
  return notAvailableYet();
}

export async function rescheduleMyAppointment(
  _appointmentId: string,
  _slot: { date: string; time: string; stylistId: string },
): Promise<Appointment> {
  return notAvailableYet();
}
