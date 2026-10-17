import { useState } from 'react';
import { APPOINTMENTS, SERVICES, STYLISTS, getService, getStylist, formatPrice, CATEGORY_CONFIG, STATUS_CONFIG } from '../data';
import { Card, StatusBadge, Button, PageHeader, Input } from '../ui';
import { MemphisStylistAvatar } from '../illustrations';
import { adminCreateStylist, type ScheduleEntryInput } from '../backend';
import { loadCatalog } from '../catalog';
import { ApiError } from '../api';

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────

const METRICS = {
  today: 12,
  todayRevenue: 384,
  weeklyOccupation: 78,
  avgRating: 4.85,
  monthAppointments: 247,
  monthRevenue: 8420,
};

function MetricCard({ value, label, color, icon, trend }: {
  value: string | number;
  label: string;
  color: string;
  icon: string;
  trend?: string;
}) {
  return (
    <div className="bg-white rounded-[20px] p-4 shadow-[0_4px_20px_rgba(107,66,38,0.1)]">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-3`} style={{ background: color + '20' }}>
        {icon}
      </div>
      <div className="text-xl md:text-2xl font-black font-display" style={{ color }}>{value}</div>
      <div className="text-xs font-semibold text-[#A67850] mt-0.5">{label}</div>
      {trend && <div className="text-[10px] text-[#8B9D77] font-semibold mt-1">{trend}</div>}
    </div>
  );
}

function BarChart({ data, max, color }: { data: { label: string; value: number }[]; max: number; color: string }) {
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold" style={{ color }}>{item.value}</span>
          <div
            className="w-full rounded-t-xl transition-all duration-500"
            style={{
              height: `${(item.value / max) * 80}px`,
              background: i === data.length - 1 ? color : color + '70',
              minHeight: '4px',
            }}
          />
          <span className="text-[9px] text-[#C8A88A] font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ percentage, color, label }: { percentage: number; color: string; label: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percentage / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#F5E6D3" strokeWidth="10" />
        <circle
          cx="44" cy="44" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="48" textAnchor="middle" fontSize="16" fontWeight="900" fill={color} fontFamily="Nunito">
          {percentage}%
        </text>
      </svg>
      <span className="text-xs text-[#A67850] font-semibold text-center">{label}</span>
    </div>
  );
}

export function AdminDashboard() {
  const weeklyData = [
    { label: 'Lu', value: 28 },
    { label: 'Ma', value: 35 },
    { label: 'Mi', value: 22 },
    { label: 'Ju', value: 41 },
    { label: 'Vi', value: 38 },
    { label: 'Sá', value: 47 },
    { label: 'Do', value: 12 },
  ];

  const serviceData = [
    { label: 'Corte', value: 45 },
    { label: 'Barba', value: 30 },
    { label: 'Combo', value: 55 },
    { label: 'Color', value: 20 },
    { label: 'Trat.', value: 15 },
  ];

  const recentAppointments = APPOINTMENTS.slice(0, 3);

  return (
    <div className="flex-1 overflow-y-auto bg-[#FBF3E9] p-4 md:p-6">
      {/* Greeting */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-black text-[#6B4226] font-display">Dashboard</h1>
        <p className="text-[#A67850] text-sm">Hoy, viernes 29 de agosto de 2026</p>
      </div>

      {/* Today's quick stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <MetricCard value={METRICS.today} label="Citas hoy" color="#E8734A" icon="📅" trend="↑ 3 vs ayer" />
        <MetricCard value={`$${METRICS.todayRevenue}`} label="Ingresos hoy" color="#F2A950" icon="💰" trend="↑ 12% vs ayer" />
        <MetricCard value={`${METRICS.weeklyOccupation}%`} label="Ocupación semanal" color="#8B9D77" icon="📊" trend="↑ 5% vs semana ant." />
        <MetricCard value={`★${METRICS.avgRating}`} label="Valoración media" color="#6B4226" icon="⭐" trend="Excelente" />
      </div>

      {/* Occupation donut charts */}
      <Card className="mb-6">
        <h3 className="font-black text-[#6B4226] font-display mb-4">Ocupación por estilista</h3>
        <div className="grid grid-cols-4 gap-2">
          {STYLISTS.map(stylist => (
            <DonutChart
              key={stylist.id}
              percentage={Math.floor(65 + Math.random() * 30)}
              color={stylist.color}
              label={stylist.name.split(' ')[0]}
            />
          ))}
        </div>
      </Card>

      {/* Weekly appointments chart */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-[#6B4226] font-display">Citas esta semana</h3>
          <span className="text-xs font-bold text-[#8B9D77] bg-[#EAF2E3] px-2 py-1 rounded-full">
            Total: {weeklyData.reduce((a, b) => a + b.value, 0)}
          </span>
        </div>
        <BarChart data={weeklyData} max={60} color="#E8734A" />
      </Card>

      {/* Services popularity */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-[#6B4226] font-display">Servicios más solicitados</h3>
        </div>
        <BarChart data={serviceData} max={70} color="#F2A950" />
      </Card>

      {/* Monthly summary */}
      <Card className="mb-6 bg-[#6B4226]">
        <h3 className="font-black text-white font-display mb-3">Resumen mensual</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-white/60 text-xs font-semibold">Citas completadas</div>
            <div className="text-white font-black text-lg md:text-xl">{METRICS.monthAppointments}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-white/60 text-xs font-semibold">Ingresos totales</div>
            <div className="text-[#F2A950] font-black text-lg md:text-xl">${METRICS.monthRevenue}</div>
          </div>
        </div>
        <div className="mt-3 bg-white/10 rounded-xl p-3 flex items-center justify-between">
          <span className="text-white/70 text-xs font-semibold">Tasa de cancelación</span>
          <span className="text-[#A8BB92] font-black text-sm">3.2%</span>
        </div>
      </Card>

      {/* Recent appointments */}
      <div className="mb-2">
        <h3 className="font-black text-[#6B4226] font-display mb-3">Citas recientes</h3>
        <div className="flex flex-col gap-2">
          {recentAppointments.map(appointment => {
            const service = getService(appointment.serviceId);
            const stylist = getStylist(appointment.stylistId);
            if (!service || !stylist) return null;

            return (
              <Card key={appointment.id} padding={false}>
                <div className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FBF3E9] rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                    {CATEGORY_CONFIG[service.category].emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#6B4226] text-sm truncate">{service.name}</span>
                      <StatusBadge status={appointment.status} />
                    </div>
                    <div className="text-xs text-[#A67850]">{appointment.clientName} · {stylist.name}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-[#E8734A]">{formatPrice(service.price)}</div>
                    <div className="text-xs text-[#C8A88A]">{appointment.time}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN TEAM ────────────────────────────────────────────────────────────────

const STYLIST_PHONES: Record<string, string> = {
  st1: '+34 612 345 678',
  st2: '+34 623 456 789',
  st3: '+34 634 567 890',
  st4: '+34 645 678 901',
};

const STYLIST_SCHEDULES: Record<string, { day: string; slots: string }[]> = {
  st1: [
    { day: 'Lunes', slots: '09:00 – 18:00' },
    { day: 'Martes', slots: '09:00 – 18:00' },
    { day: 'Miércoles', slots: '09:00 – 14:00' },
    { day: 'Jueves', slots: '12:00 – 20:00' },
    { day: 'Viernes', slots: '09:00 – 18:00' },
    { day: 'Sábado', slots: '09:00 – 15:00' },
  ],
  st2: [
    { day: 'Lunes', slots: '10:00 – 19:00' },
    { day: 'Martes', slots: 'Libre' },
    { day: 'Miércoles', slots: '10:00 – 19:00' },
    { day: 'Jueves', slots: '10:00 – 19:00' },
    { day: 'Viernes', slots: '10:00 – 19:00' },
    { day: 'Sábado', slots: '10:00 – 18:00' },
  ],
  st3: [
    { day: 'Lunes', slots: '09:00 – 17:00' },
    { day: 'Martes', slots: '09:00 – 17:00' },
    { day: 'Miércoles', slots: '09:00 – 17:00' },
    { day: 'Jueves', slots: 'Libre' },
    { day: 'Viernes', slots: '09:00 – 17:00' },
    { day: 'Sábado', slots: '10:00 – 16:00' },
  ],
  st4: [
    { day: 'Martes', slots: '11:00 – 20:00' },
    { day: 'Miércoles', slots: '11:00 – 20:00' },
    { day: 'Jueves', slots: '11:00 – 20:00' },
    { day: 'Viernes', slots: '11:00 – 20:00' },
    { day: 'Sábado', slots: '09:00 – 18:00' },
    { day: 'Domingo', slots: '10:00 – 15:00' },
  ],
};

// Pending appointments per stylist (simulated)
const STYLIST_PENDING: Record<string, number> = { st1: 3, st2: 1, st3: 0, st4: 2 };

type AddedStylist = {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  color: string;
  serviceIds: string[];
  schedule: { day: string; slots: string }[];
  rating: number;
  reviewCount: number;
  imageUrl: string;
};

const NEW_STYLIST_COLORS = ['#7B5EA7', '#2E86AB', '#C97D4E', '#4A7C59', '#C45C4C'];
const ALL_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_TO_API: Record<string, ScheduleEntryInput['dayOfWeek']> = {
  Lunes: 'MONDAY', Martes: 'TUESDAY', 'Miércoles': 'WEDNESDAY', Jueves: 'THURSDAY',
  Viernes: 'FRIDAY', 'Sábado': 'SATURDAY', Domingo: 'SUNDAY',
};

export function AdminTeam({ onBack }: { onBack: () => void }) {
  // ── invite form state ──
  const [showInvite, setShowInvite] = useState(false);
  const [inviteStep, setInviteStep] = useState<'form' | 'success'>('form');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteSpecialty, setInviteSpecialty] = useState('');
  const [invitePhoto, setInvitePhoto] = useState('');
  const [invitePhotoError, setInvitePhotoError] = useState('');
  const [inviteServiceIds, setInviteServiceIds] = useState<string[]>([]);
  const [inviteSchedule, setInviteSchedule] = useState<{ day: string; slots: string }[]>(
    ALL_DAYS.map(d => ({ day: d, slots: 'Libre' }))
  );
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [, setRefreshTick] = useState(0); // re-renders the team list after the catalog is reloaded

  // ── team state ──
  const [addedStylists, setAddedStylists] = useState<AddedStylist[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // ── delete modal ──
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ── schedule drawer ──
  const [scheduleTarget, setScheduleTarget] = useState<string | null>(null);

  // ── edit modal ──
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editServiceIds, setEditServiceIds] = useState<string[]>([]);
  const [editSchedule, setEditSchedule] = useState<{ day: string; slots: string }[]>([]);
  const [overrides, setOverrides] = useState<Record<string, { name: string; specialty: string; phone: string; serviceIds: string[]; schedule: { day: string; slots: string }[] }>>({});
  const [editSaved, setEditSaved] = useState(false);

  const defaultStats = { appointments: 0, revenue: 0, rating: 0 };
  const stylistStats: Record<string, { appointments: number; revenue: number; rating: number }> = {
    st1: { appointments: 48, revenue: 1840, rating: 4.9 },
    st2: { appointments: 42, revenue: 1580, rating: 4.8 },
    st3: { appointments: 38, revenue: 1960, rating: 4.9 },
    st4: { appointments: 35, revenue: 1420, rating: 4.7 },
  };

  const visibleBase = STYLISTS.filter(s => !deletedIds.has(s.id));
  const visibleAdded = addedStylists.filter(s => !deletedIds.has(s.id));
  const totalActive = visibleBase.length + visibleAdded.length;

  // ── helpers ──

  function resetInviteForm() {
    setInviteName(''); setInviteEmail(''); setInvitePhone('');
    setInviteSpecialty(''); setInviteServiceIds([]);
    setInvitePhoto(''); setInvitePhotoError('');
    setInviteSchedule(ALL_DAYS.map(d => ({ day: d, slots: 'Libre' })));
    setInviteStep('form');
  }

  // HU-09: creates the stylist in the backend (account, base weekly schedule and services). The
  // backend emails the temporary credentials to the stylist.
  async function handleInvite() {
    setInviteError('');
    setInvitePhotoError('');
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    const photo = invitePhoto.trim();
    if (photo && !/^https?:\/\/\S+$/i.test(photo)) {
      setInvitePhotoError('La foto debe ser un enlace que empiece con http:// o https://');
      return;
    }

    const schedule: ScheduleEntryInput[] = [];
    for (const entry of inviteSchedule) {
      const text = entry.slots.trim();
      if (!text || text.toLowerCase() === 'libre') continue;
      const match = /^(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})$/.exec(text);
      if (!match) {
        setInviteError(`Horario inválido el ${entry.day}: usa el formato 09:00 – 18:00 o escribe Libre.`);
        return;
      }
      const pad = (value: string) => value.padStart(2, '0');
      schedule.push({
        dayOfWeek: DAY_TO_API[entry.day],
        startTime: `${pad(match[1])}:${match[2]}`,
        endTime: `${pad(match[3])}:${match[4]}`,
      });
    }
    if (schedule.length === 0) {
      setInviteError('Configura al menos un día de horario.');
      return;
    }

    setInviteLoading(true);
    try {
      await adminCreateStylist({
        fullName: inviteName.trim(),
        phone: invitePhone.trim(),
        email: inviteEmail.trim().toLowerCase(),
        specialty: inviteSpecialty.trim() || 'Estilista',
        schedule,
        serviceIds: inviteServiceIds,
        photoUrl: photo || undefined,
      });
      await loadCatalog().catch(() => undefined); // the new stylist now shows in every list
      setRefreshTick(tick => tick + 1);
      setInviteStep('success');
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        setInviteError(Object.values(error.fieldErrors)[0] ?? error.message);
      } else {
        setInviteError(error instanceof Error ? error.message : 'No se pudo dar de alta al estilista.');
      }
    } finally {
      setInviteLoading(false);
    }
  }

  function openEdit(id: string) {
    const base = STYLISTS.find(s => s.id === id);
    const added = addedStylists.find(s => s.id === id);
    const ov = overrides[id];
    if (!base && !added) return;
    const src = base ?? added!;
    setEditTarget(id);
    setEditName(ov?.name ?? src.name);
    setEditSpecialty(ov?.specialty ?? src.specialty);
    setEditPhone(ov?.phone ?? (base ? (STYLIST_PHONES[id] ?? '') : (added?.phone ?? '')));
    setEditServiceIds(ov?.serviceIds ?? src.serviceIds);
    const defaultSched = base ? (STYLIST_SCHEDULES[id] ?? []) : (added?.schedule ?? []);
    setEditSchedule((ov?.schedule ?? defaultSched).map(e => ({ ...e })));
  }

  function saveEdit() {
    if (!editTarget) return;
    setOverrides(prev => ({ ...prev, [editTarget]: { name: editName, specialty: editSpecialty, phone: editPhone, serviceIds: editServiceIds, schedule: editSchedule } }));
    setEditTarget(null);
    setEditSaved(true);
    setTimeout(() => setEditSaved(false), 2500);
  }

  function getDisplay(id: string, base: { name: string; specialty: string; serviceIds: string[] } | AddedStylist) {
    const ov = overrides[id];
    return {
      name: ov?.name ?? base.name,
      specialty: ov?.specialty ?? base.specialty,
      phone: ov?.phone ?? (STYLIST_PHONES[id] ?? (base as AddedStylist).phone ?? ''),
      serviceIds: ov?.serviceIds ?? base.serviceIds,
      schedule: ov?.schedule ?? (STYLIST_SCHEDULES[id] ?? (base as AddedStylist).schedule ?? []),
    };
  }

  const deleteTargetName = (() => {
    const ov = overrides[deleteTarget ?? ''];
    const base = STYLISTS.find(s => s.id === deleteTarget);
    const added = addedStylists.find(s => s.id === deleteTarget);
    return ov?.name ?? base?.name ?? added?.name ?? '';
  })();
  const pendingCount = deleteTarget ? (STYLIST_PENDING[deleteTarget] ?? 0) : 0;
  const scheduleTargetDisplay = scheduleTarget ? getDisplay(scheduleTarget, STYLISTS.find(s => s.id === scheduleTarget) ?? addedStylists.find(s => s.id === scheduleTarget)!) : null;
  const scheduleTargetColor = STYLISTS.find(s => s.id === scheduleTarget)?.color ?? addedStylists.find(s => s.id === scheduleTarget)?.color ?? '#E8734A';
  const scheduleTargetImage = addedStylists.find(s => s.id === scheduleTarget)?.imageUrl;
  const editTargetColor = STYLISTS.find(s => s.id === editTarget)?.color ?? addedStylists.find(s => s.id === editTarget)?.color ?? '#E8734A';
  const editTargetImage = addedStylists.find(s => s.id === editTarget)?.imageUrl;

  function toggleInviteService(sid: string) {
    setInviteServiceIds(prev => prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]);
  }
  function toggleEditService(sid: string) {
    setEditServiceIds(prev => prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#FBF3E9] p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-[#6B4226] font-display">Equipo</h2>
          <p className="text-sm text-[#A67850]">{totalActive} estilistas activos</p>
        </div>
        <Button onClick={() => { setShowInvite(!showInvite); if (showInvite) resetInviteForm(); }} variant="primary" size="sm">
          + Invitar
        </Button>
      </div>

      {/* ── Invite form ── */}
      {showInvite && (
        <Card className="mb-5 border-2 border-[#E8734A]">
          <h4 className="font-black text-[#6B4226] font-display mb-4">Nuevo estilista</h4>
          {inviteStep === 'success' ? (
            <div>
              <div className="bg-[#EAF2E3] rounded-2xl p-4 flex items-start gap-3 mb-4">
                <span className="text-2xl mt-0.5">✅</span>
                <div>
                  <p className="text-[#4A7C59] font-black text-sm">¡{inviteName} fue dado de alta!</p>
                  <p className="text-[#4A7C59] text-xs mt-0.5">Se envió un correo con credenciales temporales a {inviteEmail}.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" fullWidth onClick={() => { resetInviteForm(); }}>
                  + Agregar otro
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowInvite(false); resetInviteForm(); }}>
                  Cerrar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nombre completo" value={inviteName} onChange={setInviteName} placeholder="ej. Pedro García" />
                <Input label="Especialidad" value={inviteSpecialty} onChange={setInviteSpecialty} placeholder="ej. Colorimetría" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Correo electrónico" type="email" value={inviteEmail} onChange={setInviteEmail} placeholder="pedro@barberia.com" />
                <Input label="Teléfono" value={invitePhone} onChange={setInvitePhone} placeholder="+34 600 000 000" />
              </div>
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#EDD8BC] bg-[#FBF3E9] p-4">
                {invitePhoto ? (
                  <img src={invitePhoto} alt="Vista previa de la foto del estilista" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl text-[#A67850]">📷</div>
                )}
                <div className="min-w-0 flex-1">
                  <label htmlFor="invite-stylist-photo" className="block text-xs font-black text-[#6B4226]">
                    Foto del estilista (enlace, opcional)
                  </label>
                  <input
                    id="invite-stylist-photo"
                    type="url"
                    value={invitePhoto}
                    placeholder="https://..."
                    aria-invalid={Boolean(invitePhotoError)}
                    aria-describedby={invitePhotoError ? 'invite-stylist-photo-error' : 'invite-stylist-photo-hint'}
                    onChange={event => { setInvitePhoto(event.target.value); setInvitePhotoError(''); }}
                    className="mt-2 block w-full rounded-xl border border-transparent bg-white px-3 py-2 text-xs text-[#6B4226] focus:border-[#E8734A] focus:outline-none"
                  />
                  {invitePhotoError ? (
                    <p id="invite-stylist-photo-error" role="alert" className="mt-1 text-xs font-medium text-[#C45C4C]">{invitePhotoError}</p>
                  ) : (
                    <p id="invite-stylist-photo-hint" className="mt-1 text-[10px] text-[#A67850]">Pega el enlace de una imagen (http o https)</p>
                  )}
                </div>
              </div>

              {/* Services */}
              <div>
                <p className="text-xs font-black text-[#6B4226] mb-2">Servicios asignados</p>
                <div className="flex flex-wrap gap-2">
                  {SERVICES.map(svc => (
                    <button
                      key={svc.id}
                      onClick={() => toggleInviteService(svc.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${inviteServiceIds.includes(svc.id) ? 'bg-[#E8734A] text-white' : 'bg-[#FBF3E9] text-[#A67850] hover:bg-[#F5E6D3]'}`}
                    >
                      {CATEGORY_CONFIG[svc.category].emoji} {svc.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <p className="text-xs font-black text-[#6B4226] mb-2">Horario base semanal</p>
                <div className="flex flex-col gap-1.5">
                  {inviteSchedule.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-20 flex-shrink-0 text-xs font-semibold text-[#6B4226]">{entry.day}</div>
                      <input
                        value={entry.slots}
                        onChange={e => {
                          const updated = [...inviteSchedule];
                          updated[i] = { ...updated[i], slots: e.target.value };
                          setInviteSchedule(updated);
                        }}
                        className="flex-1 bg-[#FBF3E9] rounded-xl px-3 py-1.5 text-xs text-[#6B4226] font-medium border border-transparent focus:border-[#E8734A] focus:outline-none"
                        placeholder="09:00 – 18:00 o Libre"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {inviteError && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700">{inviteError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <Button onClick={() => void handleInvite()} variant="primary" size="sm" fullWidth disabled={inviteLoading || !inviteName.trim() || !inviteEmail.trim()}>
                  {inviteLoading ? '⏳ Creando cuenta...' : 'Dar de alta y enviar invitación'}
                </Button>
                <Button onClick={() => { setShowInvite(false); resetInviteForm(); }} variant="ghost" size="sm">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Stylist cards ── */}
      <div className="flex flex-col gap-4">
        {/* Base stylists */}
        {visibleBase.map((stylist) => {
          const stats = stylistStats[stylist.id] ?? defaultStats;
          const d = getDisplay(stylist.id, stylist);
          return (
            <StylistCard
              key={stylist.id}
              id={stylist.id}
              color={stylist.color}
              rating={stylist.rating}
              reviewCount={stylist.reviewCount}
              stats={stats}
              displayName={d.name}
              displaySpecialty={d.specialty}
              displayPhone={d.phone}
              displayServiceIds={d.serviceIds}
              onSchedule={() => setScheduleTarget(stylist.id)}
              onEdit={() => openEdit(stylist.id)}
              onDelete={() => setDeleteTarget(stylist.id)}
            />
          );
        })}

        {/* Added stylists */}
        {visibleAdded.map((stylist) => {
          const d = getDisplay(stylist.id, stylist);
          return (
            <StylistCard
              key={stylist.id}
              id={stylist.id}
              color={stylist.color}
              rating={stylist.rating}
              reviewCount={stylist.reviewCount}
              stats={defaultStats}
              displayName={d.name}
              displaySpecialty={d.specialty}
              displayPhone={d.phone}
              displayServiceIds={d.serviceIds}
              imageUrl={stylist.imageUrl}
              onSchedule={() => setScheduleTarget(stylist.id)}
              onEdit={() => openEdit(stylist.id)}
              onDelete={() => setDeleteTarget(stylist.id)}
              isNew
            />
          );
        })}
      </div>

      {/* ── Edit modal ── */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-white rounded-t-[32px] p-6 w-full max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-[#EDD8BC] rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-5">
              <MemphisStylistAvatar name={editName || 'E'} color={editTargetColor} size={44} imageUrl={editTargetImage} />
              <div>
                <h3 className="font-black text-[#6B4226] font-display text-lg">Editar estilista</h3>
                <p className="text-sm text-[#A67850]">Modifica datos, servicios y horario</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-5">
              <Input label="Nombre completo" value={editName} onChange={setEditName} placeholder="Nombre" />
              <Input label="Especialidad" value={editSpecialty} onChange={setEditSpecialty} placeholder="ej. Colorimetría avanzada" />
              <Input label="Teléfono" value={editPhone} onChange={setEditPhone} placeholder="+34 600 000 000" />
            </div>

            <div className="mb-5">
              <p className="text-xs font-black text-[#6B4226] mb-2">Servicios habilitados</p>
              <div className="flex flex-wrap gap-2">
                {SERVICES.map(svc => (
                  <button
                    key={svc.id}
                    onClick={() => toggleEditService(svc.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${editServiceIds.includes(svc.id) ? 'bg-[#E8734A] text-white' : 'bg-[#FBF3E9] text-[#A67850] hover:bg-[#F5E6D3]'}`}
                  >
                    {CATEGORY_CONFIG[svc.category].emoji} {svc.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <p className="text-xs font-black text-[#6B4226] mb-2">Horario</p>
              <div className="flex flex-col gap-2">
                {editSchedule.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-24 flex-shrink-0 text-sm font-semibold text-[#6B4226]">{entry.day}</div>
                    <input
                      value={entry.slots}
                      onChange={e => {
                        const updated = [...editSchedule];
                        updated[i] = { ...updated[i], slots: e.target.value };
                        setEditSchedule(updated);
                      }}
                      className="flex-1 bg-[#FBF3E9] rounded-xl px-3 py-2 text-sm text-[#6B4226] font-medium border border-transparent focus:border-[#E8734A] focus:outline-none"
                      placeholder="09:00 – 18:00 o Libre"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="primary" size="md" fullWidth onClick={saveEdit}>Guardar cambios</Button>
              <Button variant="ghost" size="md" onClick={() => setEditTarget(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit saved toast ── */}
      {editSaved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#4A7C59] text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-xl">
          Cambios guardados correctamente
        </div>
      )}

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-[#FFF5F5] rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="font-black text-[#6B4226] font-display text-xl mb-1">¿Dar de baja?</h3>
              <p className="text-[#A67850] text-sm">
                ¿Confirmas que quieres retirar a <strong className="text-[#6B4226]">{deleteTargetName}</strong> del equipo activo?
              </p>
            </div>

            {pendingCount > 0 && (
              <div className="bg-[#FEF5E4] border border-[#F2A950]/40 rounded-2xl p-3 mb-4 flex items-start gap-2">
                <span className="text-lg flex-shrink-0">⚠️</span>
                <p className="text-sm text-[#8B6914] font-medium">
                  Tiene <strong>{pendingCount} citas pendientes</strong> que deberán reasignarse. Su agenda pública quedará deshabilitada.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                variant="danger"
                size="md"
                fullWidth
                onClick={() => {
                  setDeletedIds(prev => new Set([...prev, deleteTarget]));
                  setDeleteTarget(null);
                }}
              >
                Confirmar baja
              </Button>
              <Button variant="ghost" size="md" fullWidth onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule drawer ── */}
      {scheduleTarget && scheduleTargetDisplay && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-white rounded-t-[32px] p-6 w-full max-h-[80vh] overflow-y-auto">
            <div className="w-10 h-1 bg-[#EDD8BC] rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-5">
              <MemphisStylistAvatar name={scheduleTargetDisplay.name} color={scheduleTargetColor} size={44} imageUrl={scheduleTargetImage} />
              <div>
                <h3 className="font-black text-[#6B4226] font-display text-lg">{scheduleTargetDisplay.name}</h3>
                <p className="text-sm text-[#A67850]">Horario disponible</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 mb-5">
              {scheduleTargetDisplay.schedule.map((entry, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-2xl ${entry.slots === 'Libre' ? 'bg-[#F5E6D3]' : 'bg-[#FBF3E9]'}`}>
                  <span className="font-semibold text-[#6B4226] text-sm">{entry.day}</span>
                  <span className={`text-sm font-bold ${entry.slots === 'Libre' ? 'text-[#C8A88A] line-through' : 'text-[#E8734A]'}`}>
                    {entry.slots}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="md" fullWidth onClick={() => { openEdit(scheduleTarget); setScheduleTarget(null); }}>
                Editar horario
              </Button>
              <Button variant="ghost" size="md" onClick={() => setScheduleTarget(null)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StylistCard({
  id, color, rating, reviewCount, stats, displayName, displaySpecialty, displayPhone, displayServiceIds, imageUrl,
  onSchedule, onEdit, onDelete, isNew,
}: {
  id: string; color: string; rating: number; reviewCount: number;
  stats: { appointments: number; revenue: number; rating: number };
  displayName: string; displaySpecialty: string; displayPhone: string; displayServiceIds: string[]; imageUrl?: string;
  onSchedule: () => void; onEdit: () => void; onDelete: () => void; isNew?: boolean;
}) {
  return (
    <Card padding={false}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <MemphisStylistAvatar name={displayName} color={color} size={48} imageUrl={imageUrl} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-black text-[#6B4226] font-display truncate">{displayName}</div>
              {isNew && (
                <span className="text-[10px] font-black bg-[#EAF2E3] text-[#4A7C59] px-2 py-0.5 rounded-full flex-shrink-0">NUEVO</span>
              )}
            </div>
            <div className="text-sm text-[#A67850]">{displaySpecialty}</div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {rating > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[#F2A950] text-xs">★</span>
                  <span className="text-xs font-bold text-[#6B4226]">{rating}</span>
                  <span className="text-[10px] text-[#C8A88A]">({reviewCount})</span>
                </div>
              )}
              {displayPhone && (
                <div className="flex items-center gap-1 text-[10px] text-[#A67850]">
                  <span>📱</span>
                  <span className="font-medium">{displayPhone}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={onSchedule} className="w-8 h-8 rounded-xl bg-[#FBF3E9] hover:bg-[#F5E6D3] flex items-center justify-center text-sm transition-colors" title="Ver horario">📅</button>
            <button onClick={onEdit} className="w-8 h-8 rounded-xl bg-[#FBF3E9] hover:bg-[#F5E6D3] flex items-center justify-center text-sm transition-colors" title="Editar">✏️</button>
            <button onClick={onDelete} className="w-8 h-8 rounded-xl bg-[#FFF5F5] hover:bg-[#FFE8E8] flex items-center justify-center text-sm transition-colors" title="Dar de baja">🗑</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Citas/mes', value: isNew ? '—' : stats.appointments, color: '#E8734A' },
            { label: 'Ingresos', value: isNew ? '—' : `$${stats.revenue}`, color: '#F2A950' },
            { label: 'Rating', value: isNew ? '—' : `★${stats.rating}`, color: '#8B9D77' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#FBF3E9] rounded-xl p-2 text-center">
              <div className="text-sm font-black" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-[9px] text-[#C8A88A] font-semibold">{stat.label}</div>
            </div>
          ))}
        </div>

        {displayServiceIds.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#F5E6D3]">
            <span className="text-xs font-semibold text-[#C8A88A]">Servicios: </span>
            {displayServiceIds.map(sid => {
              const s = getService(sid);
              return s ? <span key={sid} className="text-xs text-[#A67850] mr-1">{s.name}</span> : null;
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── REPORTS ───────────────────────────────────────────────────────────────────

export function AdminReports() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  const stylistPerf = [
    { name: 'Carlos R.', appointments: 48, revenue: 1840, satisfaction: 98 },
    { name: 'Miguel T.', appointments: 42, revenue: 1580, satisfaction: 95 },
    { name: 'David S.', appointments: 38, revenue: 1960, satisfaction: 97 },
    { name: 'Luis M.', appointments: 35, revenue: 1420, satisfaction: 92 },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#FBF3E9] p-6">
      <div className="mb-6">
        <h2 className="text-xl font-black text-[#6B4226] font-display">Reportes</h2>
        <p className="text-sm text-[#A67850]">Análisis de desempeño del negocio</p>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        {(['week', 'month', 'year'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-2xl text-sm font-bold transition-all ${period === p ? 'bg-[#E8734A] text-white shadow-[0_4px_12px_rgba(232,115,74,0.3)]' : 'bg-white text-[#A67850] hover:bg-[#F5E6D3]'}`}
          >
            {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
          </button>
        ))}
      </div>

      {/* Performance table */}
      <Card className="mb-5">
        <h3 className="font-black text-[#6B4226] font-display mb-4">Desempeño por estilista</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr>
                <th className="text-left text-[10px] font-bold text-[#C8A88A] uppercase tracking-wide pb-2">Estilista</th>
                <th className="text-right text-[10px] font-bold text-[#C8A88A] uppercase tracking-wide pb-2">Citas</th>
                <th className="text-right text-[10px] font-bold text-[#C8A88A] uppercase tracking-wide pb-2">Ingresos</th>
                <th className="text-right text-[10px] font-bold text-[#C8A88A] uppercase tracking-wide pb-2">Satisf.</th>
              </tr>
            </thead>
            <tbody>
              {stylistPerf.map((perf, i) => (
                <tr key={i} className="border-t border-[#F5E6D3]">
                  <td className="py-2.5 text-sm font-semibold text-[#6B4226]">{perf.name}</td>
                  <td className="text-right text-sm font-bold text-[#E8734A]">{perf.appointments}</td>
                  <td className="text-right text-sm font-bold text-[#F2A950]">${perf.revenue}</td>
                  <td className="text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${perf.satisfaction >= 96 ? 'bg-[#EAF2E3] text-[#4A7C59]' : 'bg-[#FEF5E4] text-[#8B6914]'}`}>
                      {perf.satisfaction}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Top services */}
      <Card>
        <h3 className="font-black text-[#6B4226] font-display mb-4">Top servicios</h3>
        {SERVICES.slice(0, 4).map((service, i) => {
          const pct = [85, 72, 55, 40][i];
          return (
            <div key={service.id} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span>{CATEGORY_CONFIG[service.category].emoji}</span>
                  <span className="text-sm font-semibold text-[#6B4226]">{service.name}</span>
                </div>
                <span className="text-xs font-bold text-[#E8734A]">{pct}%</span>
              </div>
              <div className="h-2 bg-[#F5E6D3] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: i === 0 ? '#E8734A' : i === 1 ? '#F2A950' : i === 2 ? '#8B9D77' : '#A67850',
                  }}
                />
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
