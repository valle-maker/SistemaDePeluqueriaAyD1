import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { STYLISTS, formatPrice } from '../data';
import { Button, Card, EmptyState } from '../ui';
import {
  adminAvailableStylists,
  adminCancelAppointment,
  adminListAppointments,
  adminReassignAppointment,
  type ApiAdminAppointment,
  type ApiAvailableStylist,
} from '../backend';

// ─── ADMIN: gestionar citas por contingencia (HU-20) ──────────────────────────
// The administrator picks an appointment and either cancels it (the client gets an apology email
// inviting them to rebook) or hands it to another stylist at the same time (the client is told).

type Dialog = { kind: 'cancel' | 'reassign'; appointment: ApiAdminAppointment } | null;

function formatDay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function errorText(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin motion-reduce:animate-none"
    />
  );
}

export function AdminAppointments() {
  const [date, setDate] = useState('');
  const [stylistId, setStylistId] = useState('');
  const [items, setItems] = useState<ApiAdminAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    adminListAppointments(date || undefined, stylistId || undefined)
      .then(result => { if (active) setItems(result); })
      .catch(reason => { if (active) setLoadError(errorText(reason, 'No se pudieron cargar las citas.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date, stylistId, reloadKey]);

  const finish = (message: string) => {
    setDialog(null);
    setNotice(message);
    setReloadKey(key => key + 1);
  };

  return (
    <main aria-label="Gestión de citas" className="flex-1 overflow-y-auto bg-[#FBF3E9] p-6">
      <div className="mb-5">
        <h2 className="text-xl font-black text-[#6B4226] font-display">Citas</h2>
        <p className="text-sm text-[#6B4226]">
          Cancela por contingencia o pasa una cita a otro estilista. Avisamos al cliente automáticamente.
        </p>
      </div>

      <section aria-label="Filtros de citas" className="mb-5 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-appointments-date" className="text-sm font-semibold text-[#6B4226]">Fecha</label>
          <div className="flex items-center gap-2">
            <input
              id="admin-appointments-date"
              type="date"
              value={date}
              onChange={event => setDate(event.target.value)}
              className="min-h-11 rounded-xl border-2 border-[#C8A88A] bg-white px-3 text-sm text-[#59351F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D2415]"
            />
            {date && (
              <button
                type="button"
                onClick={() => setDate('')}
                className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[#87371E] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3D2415]"
              >
                Ver todas las próximas
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-appointments-stylist" className="text-sm font-semibold text-[#6B4226]">Estilista</label>
          <select
            id="admin-appointments-stylist"
            value={stylistId}
            onChange={event => setStylistId(event.target.value)}
            className="min-h-11 rounded-xl border-2 border-[#C8A88A] bg-white px-3 text-sm text-[#59351F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D2415]"
          >
            <option value="">Todos</option>
            {STYLISTS.map(stylist => <option key={stylist.id} value={stylist.id}>{stylist.name}</option>)}
          </select>
        </div>
      </section>

      {notice && (
        <p role="status" className="mb-5 flex items-start justify-between gap-3 rounded-2xl bg-[#EAF2E3] p-4 text-sm font-semibold text-[#255D38]">
          <span>✅ {notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Cerrar mensaje"
            className="rounded-full px-2 text-lg leading-none text-[#255D38] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#255D38]"
          >×</button>
        </p>
      )}

      <section aria-label="Lista de citas" aria-busy={loading}>
        {loading ? (
          <div role="status" aria-label="Cargando citas" className="flex flex-col gap-3">
            <span className="sr-only">Cargando citas</span>
            {[1, 2, 3].map(n => (
              <div key={n} aria-hidden="true" className="h-28 rounded-[20px] bg-white motion-safe:animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-[20px] bg-white p-6 text-center">
            <p className="font-black text-[#6B4226] font-display">No pudimos cargar las citas</p>
            <p className="mt-2 text-sm text-[#6B4226]">{loadError}</p>
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" size="sm" onClick={() => setReloadKey(key => key + 1)}>Reintentar</Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No hay citas activas"
            subtitle={date ? 'Ese día no hay citas con los filtros elegidos.' : 'No hay citas próximas con los filtros elegidos.'}
          />
        ) : (
          <>
            <p className="mb-3 text-sm font-semibold text-[#6B4226]" aria-live="polite">
              {items.length} {items.length === 1 ? 'cita activa' : 'citas activas'}
            </p>
            <ul className="flex flex-col gap-3">
              {items.map(item => (
                <li key={item.id}>
                  <AppointmentRow
                    item={item}
                    onCancel={() => { setNotice(null); setDialog({ kind: 'cancel', appointment: item }); }}
                    onReassign={() => { setNotice(null); setDialog({ kind: 'reassign', appointment: item }); }}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {dialog?.kind === 'cancel' && (
        <CancelDialog
          appointment={dialog.appointment}
          onClose={() => setDialog(null)}
          onDone={finish}
        />
      )}
      {dialog?.kind === 'reassign' && (
        <ReassignDialog
          appointment={dialog.appointment}
          onClose={() => setDialog(null)}
          onDone={finish}
        />
      )}
    </main>
  );
}

function AppointmentRow({ item, onCancel, onReassign }: {
  item: ApiAdminAppointment;
  onCancel: () => void;
  onReassign: () => void;
}) {
  const summary = `${item.serviceName} de ${item.clientName}, ${formatDay(item.date)} a las ${item.startTime}`;
  return (
    <Card padding={false}>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-[#6B4226]">Reserva {item.code}</p>
            <h3 className="font-black font-display text-[#6B4226] text-base">{item.serviceName}</h3>
            <p className="text-sm font-semibold text-[#59351F] capitalize">
              {formatDay(item.date)} · {item.startTime} – {item.endTime} · {formatPrice(item.price)}
            </p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-[#6B4226]">Cliente</dt>
            <dd className="mt-0.5 font-semibold text-[#59351F]">{item.clientName}</dd>
            <dd className="text-[#59351F]">{item.clientEmail}{item.clientPhone ? ` · ${item.clientPhone}` : ''}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-[#6B4226]">Estilista</dt>
            <dd className="mt-0.5 font-semibold text-[#59351F]">{item.stylistName}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" size="sm" onClick={onReassign} ariaLabel={`Reasignar a otro estilista: ${summary}`}>
            Reasignar estilista
          </Button>
          <Button variant="danger" size="sm" onClick={onCancel} ariaLabel={`Cancelar por contingencia: ${summary}`}>
            Cancelar por contingencia
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Modal with focus handling: focus goes in on open, Tab stays inside, Escape closes (unless busy),
// and focus returns to the button that opened it.
function Modal({ titleId, busy, onClose, children }: {
  titleId: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!busyRef.current) onClose();
        return;
      }
      if (event.key !== 'Tab' || !ref.current) return;
      const focusable = ref.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D2415]/60 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl focus:outline-none"
      >
        {children}
      </div>
    </div>
  );
}

function Summary({ appointment }: { appointment: ApiAdminAppointment }) {
  return (
    <div className="mt-3 rounded-2xl bg-[#FBF3E9] p-4 text-sm text-[#59351F]">
      <p className="font-black text-[#6B4226]">{appointment.serviceName} · {appointment.code}</p>
      <p className="capitalize">{formatDay(appointment.date)} a las {appointment.startTime}</p>
      <p>Cliente: <span className="font-semibold">{appointment.clientName}</span> ({appointment.clientEmail})</p>
      <p>Estilista actual: <span className="font-semibold">{appointment.stylistName}</span></p>
    </div>
  );
}

function CancelDialog({ appointment, onClose, onDone }: {
  appointment: ApiAdminAppointment;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminCancelAppointment(appointment.id, reason.trim() || undefined);
      onDone(`Cita ${appointment.code} cancelada. Le enviamos un correo a ${appointment.clientEmail} con disculpas e invitándolo a reagendar.`);
    } catch (reasonError) {
      setError(errorText(reasonError, 'No se pudo cancelar la cita. Inténtalo de nuevo.'));
      setBusy(false);
    }
  };

  return (
    <Modal titleId="cancel-contingency-title" busy={busy} onClose={onClose}>
      <h2 id="cancel-contingency-title" className="font-black font-display text-xl text-[#6B4226]">Cancelar por contingencia</h2>
      <p className="mt-2 text-sm text-[#59351F]">
        La cita se cancela y el horario queda libre de inmediato. El cliente recibe un correo pidiéndole disculpas e invitándolo a reagendar.
      </p>
      <Summary appointment={appointment} />
      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="cancel-contingency-reason" className="text-sm font-semibold text-[#6B4226]">
          Motivo (opcional, se incluye en el correo)
        </label>
        <textarea
          id="cancel-contingency-reason"
          value={reason}
          maxLength={200}
          rows={3}
          disabled={busy}
          onChange={event => setReason(event.target.value)}
          placeholder="Ej.: el estilista no puede asistir hoy"
          className="w-full resize-none rounded-xl border-2 border-[#C8A88A] bg-white px-3 py-2 text-sm text-[#59351F] placeholder-[#6B4226] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D2415]"
        />
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#FFF5F5] p-3 text-sm font-semibold text-[#7C2C20]">{error}</p>}
      {busy && <p className="sr-only" role="status" aria-live="polite">Cancelando la cita y avisando al cliente...</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={busy}>Volver</Button>
        <Button variant="danger" onClick={() => void confirm()} disabled={busy} ariaBusy={busy}>
          {busy ? <><Spinner /> Cancelando...</> : 'Cancelar cita y avisar'}
        </Button>
      </div>
    </Modal>
  );
}

function ReassignDialog({ appointment, onClose, onDone }: {
  appointment: ApiAdminAppointment;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [options, setOptions] = useState<ApiAvailableStylist[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    setOptions(null);
    setLoadError(null);
    adminAvailableStylists(appointment.id)
      .then(result => { if (active) setOptions(result); })
      .catch(reason => { if (active) setLoadError(errorText(reason, 'No se pudieron consultar los estilistas libres.')); });
    return () => { active = false; };
  }, [appointment.id]);

  useEffect(() => load(), [load]);

  const confirm = async () => {
    if (busy || !selected) return;
    setBusy(true);
    setError(null);
    try {
      await adminReassignAppointment(appointment.id, selected);
      const chosen = options?.find(option => option.id === selected)?.fullName ?? 'el nuevo estilista';
      onDone(`Cita ${appointment.code} reasignada a ${chosen}. La hora no cambia y avisamos a ${appointment.clientEmail}.`);
    } catch (reason) {
      setError(errorText(reason, 'No se pudo reasignar la cita. Inténtalo de nuevo.'));
      setBusy(false);
    }
  };

  return (
    <Modal titleId="reassign-title" busy={busy} onClose={onClose}>
      <h2 id="reassign-title" className="font-black font-display text-xl text-[#6B4226]">Reasignar a otro estilista</h2>
      <p className="mt-2 text-sm text-[#59351F]">
        La cita pasa a la agenda del nuevo estilista <strong>sin cambiar la hora</strong>, y el cliente recibe un aviso. Solo aparecen estilistas que hacen este servicio y están libres a esa hora.
      </p>
      <Summary appointment={appointment} />

      <div className="mt-4" aria-live="polite">
        {options === null && !loadError && (
          <p role="status" className="flex items-center gap-2 text-sm font-semibold text-[#6B4226]">
            <Spinner /> Buscando estilistas libres...
          </p>
        )}
        {loadError && (
          <div role="alert" className="rounded-xl bg-[#FFF5F5] p-3 text-sm font-semibold text-[#7C2C20]">
            <p>{loadError}</p>
            <button type="button" onClick={load} className="mt-2 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3D2415]">
              Reintentar
            </button>
          </div>
        )}
        {options !== null && options.length === 0 && (
          <p className="rounded-xl bg-[#FFF3CD] p-3 text-sm font-semibold text-[#5C4310]">
            No hay otros estilistas libres a esa hora que hagan este servicio. Puedes cancelar la cita por contingencia.
          </p>
        )}
        {options !== null && options.length > 0 && (
          <fieldset disabled={busy}>
            <legend className="mb-2 text-sm font-semibold text-[#6B4226]">Nuevo estilista</legend>
            <div className="flex flex-col gap-2">
              {options.map(option => (
                <label
                  key={option.id}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 text-sm ${selected === option.id ? 'border-[#87371E] bg-[#FBF3E9]' : 'border-[#D8C4B0]'}`}
                >
                  <input
                    type="radio"
                    name="new-stylist"
                    value={option.id}
                    checked={selected === option.id}
                    onChange={() => setSelected(option.id)}
                    className="h-4 w-4 accent-[#87371E]"
                  />
                  <span>
                    <span className="block font-black text-[#6B4226]">{option.fullName}</span>
                    <span className="block text-[#59351F]">{option.specialty}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-[#FFF5F5] p-3 text-sm font-semibold text-[#7C2C20]">{error}</p>}
      {busy && <p className="sr-only" role="status" aria-live="polite">Reasignando la cita y avisando al cliente...</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={busy}>Volver</Button>
        <Button variant="primary" onClick={() => void confirm()} disabled={busy || !selected} ariaBusy={busy}>
          {busy ? <><Spinner /> Reasignando...</> : 'Reasignar y avisar'}
        </Button>
      </div>
    </Modal>
  );
}
