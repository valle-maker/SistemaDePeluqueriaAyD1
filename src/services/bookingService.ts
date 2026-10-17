// Availability and booking against the real backend (HU-12, HU-13).
//
// There is no temporary slot hold any more: the slot is booked in ONE step by confirmReservation(),
// and if somebody else took it first the backend answers 409 with code SLOT_TAKEN (the screens
// show the "turno ocupado" dialog). The old simulated hold (reservarTurno / liberarTurno) is gone.
import { ApiError } from '../api';
import { createAppointment, fetchAvailability, fetchMonthAvailability } from '../backend';

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
