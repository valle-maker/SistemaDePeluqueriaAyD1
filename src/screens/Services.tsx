import { useEffect, useRef, useState } from 'react';
import { SERVICES, STYLISTS, getService, formatPrice, formatDuration, CATEGORY_CONFIG, getStylistsForService, type ServiceCategory } from '../data';
import {
  Button,
  Card,
  PopularBadge,
  StarRating,
  CategoryBadge,
  PageHeader,
  Input,
  ServicePhoto,
} from '../ui';
import { MemphisStylistAvatar, ScissorsIcon } from '../illustrations';
import {
  fetchMe,
  fetchNotifications,
  fetchRecommendations,
  markAllNotificationsRead,
  type ApiNotification,
  type ApiRecommendation,
} from '../backend';
import { getStylist } from '../data';
import {
  crearServicio,
  desactivarServicio,
  editarServicio,
  getEmptyServicioForm,
  listarActivos,
  listarInactivos,
  reactivarServicio,
  servicioCategorias,
  validarServicio,
  type ServicioCategoria,
  type ServicioFormValues,
  type ServicioItem,
} from '../services/servicios.service';

// ─── HOME / CATALOG ────────────────────────────────────────────────────────────

export function ClientHome({ onBook, onViewService, userName = 'Juan' }: {
  onBook: (serviceId?: string) => void;
  onViewService: (id: string) => void;
  userName?: string;
}) {
  const [query, setQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [apiRecommendations, setApiRecommendations] = useState<ApiRecommendation[]>([]);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const popularServices = SERVICES.filter(s => s.popular);
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Buenos días' : currentHour < 19 ? 'Buenas tardes' : 'Buenas noches';
  // The header shows the first name ("¡Buenos días! Juan"), as HU-06 asks.
  const firstName = userName.trim().split(/\s+/)[0] || 'Cliente';

  // HU-06: profile photo, "Recomendado para ti" and the notifications bell come from the backend.
  // Each one fails silently: a missing section is better than a broken home screen.
  useEffect(() => {
    let active = true;
    fetchMe().then(me => { if (active) setPhotoUrl(me.photoUrl); }).catch(() => undefined);
    fetchRecommendations()
      .then(result => { if (active && result.eligible) setApiRecommendations(result.recommendations); })
      .catch(() => undefined);
    fetchNotifications()
      .then(result => {
        if (!active) return;
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const toggleNotifications = () => {
    const opening = !notificationsOpen;
    setNotificationsOpen(opening);
    if (opening && unreadCount > 0) {
      setUnreadCount(0);
      void markAllNotificationsRead().catch(() => undefined);
    }
  };

  // Search ignores case and accents ("clasico" finds "Corte Clásico"), like the backend's ?q=.
  const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const normalizedQuery = normalize(query.trim());
  const searchResults = normalizedQuery
    ? [
        ...SERVICES.filter(s =>
          normalize(s.name).includes(normalizedQuery) ||
          normalize(CATEGORY_CONFIG[s.category].label).includes(normalizedQuery)
        ).map(s => ({ type: 'service' as const, id: s.id, name: s.name, sub: CATEGORY_CONFIG[s.category].label, emoji: CATEGORY_CONFIG[s.category].emoji })),
        ...STYLISTS.filter(st =>
          normalize(st.name).includes(normalizedQuery) ||
          normalize(st.specialty).includes(normalizedQuery)
        ).map(st => ({ type: 'stylist' as const, id: st.id, name: st.name, sub: st.specialty, emoji: '✂️' })),
      ]
    : [];

  // Recommendations (HU-06): only present once the client has enough bookings (backend decides).
  const recommendations = apiRecommendations
    .map(rec => ({ rec, service: getService(rec.serviceId), stylist: getStylist(rec.stylistId) }))
    .filter(r => r.service);

  return (
    <div className="flex flex-col h-full bg-[#FBF3E9] overflow-y-auto pb-20">
      {/* Header */}
      <div
        className="relative z-30 overflow-visible bg-[#E8734A] px-5 pb-7 sm:px-6"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/3 translate-x-1/4 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-0 h-20 w-20 -translate-x-1/4 translate-y-1/2 rounded-full bg-white/10" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {/* User avatar */}
              <div className="relative w-12 h-12 overflow-hidden bg-white/20 rounded-full flex items-center justify-center border-2 border-white/40 flex-shrink-0">
                {photoUrl && <img src={photoUrl} alt={userName} className="absolute inset-0 h-full w-full object-cover" />}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div className="min-w-0 py-0.5">
                <p className="text-white/90 text-xs sm:text-sm font-semibold leading-5">¡{greeting}! <span aria-hidden="true">👋</span></p>
                <h1 className="text-white font-black font-display text-lg sm:text-xl leading-6 truncate">{firstName}</h1>
              </div>
            </div>
            <div className="relative z-20 flex-shrink-0">
              <button
                type="button"
                onClick={toggleNotifications}
                aria-label={notificationsOpen ? 'Cerrar notificaciones' : 'Abrir notificaciones'}
                aria-expanded={notificationsOpen}
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white"
              >
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M10 21h4" />
                </svg>
                {unreadCount > 0 && (
                  <span aria-hidden="true" className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-[#E8734A] bg-[#FFE08A]" />
                )}
              </button>
              {notificationsOpen && (
                <div role="status" className="absolute right-0 top-14 z-50 w-[min(18rem,calc(100vw-2.5rem))] max-h-80 overflow-y-auto rounded-2xl border border-[#EDD8BC] bg-white p-4 text-left shadow-xl">
                  <p className="text-sm font-bold text-[#6B4226]">Notificaciones</p>
                  {notifications.length === 0 ? (
                    <p className="mt-1 text-xs leading-relaxed text-[#8B5E3C]">Te avisaremos cuando haya novedades sobre tus citas.</p>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-2">
                      {notifications.map(notification => (
                        <li key={notification.id} className="rounded-xl bg-[#FBF3E9] p-3">
                          <p className="text-xs font-bold text-[#6B4226]">{notification.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-[#8B5E3C]">{notification.message}</p>
                          <p className="mt-1 text-[10px] text-[#C8A88A]">
                            {new Date(notification.createdAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A67850]">🔍</span>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar servicio o estilista..."
              className="w-full bg-white rounded-2xl pl-10 pr-4 py-3 text-sm text-[#6B4226] placeholder-[#C8A88A] font-medium outline-none shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C8A88A] hover:text-[#A67850]"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search results */}
      {query.trim() && (
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs font-semibold text-[#C8A88A] mb-3 uppercase tracking-wide">
            {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} para "{query}"
          </p>
          {searchResults.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-[#A67850] font-medium text-sm">Sin resultados. Intenta con otro término.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {searchResults.map((result, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery('');
                    if (result.type === 'service') onViewService(result.id);
                    else onBook();
                  }}
                  className="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-[0_2px_12px_rgba(107,66,38,0.08)] text-left hover:bg-[#FBF3E9] transition-colors"
                >
                  <div className="w-10 h-10 bg-[#FBF3E9] rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                    {result.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[#6B4226] text-sm">{result.name}</div>
                    <div className="text-xs text-[#A67850]">{result.sub}</div>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{
                    background: result.type === 'service' ? '#FBF3E9' : '#EAF2E3',
                    color: result.type === 'service' ? '#E8734A' : '#4A7C59',
                  }}>
                    {result.type === 'service' ? 'Servicio' : 'Estilista'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main content (hidden while searching) */}
      {!query.trim() && (
        <div className="px-5 py-5">
          {/* Quick book CTA */}
          <button
            onClick={() => onBook()}
            className="w-full bg-[#6B4226] rounded-[20px] p-4 flex items-center gap-3 hover:bg-[#8B5E3C] transition-colors mb-5 shadow-[0_4px_20px_rgba(107,66,38,0.2)] active:scale-[0.98]"
          >
            <div className="w-10 h-10 bg-[#E8734A] rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl">✂️</span>
            </div>
            <div className="flex-1 text-left">
              <div className="text-white font-bold">Reservar una cita</div>
              <div className="text-white/70 text-xs">3 pasos · menos de 1 minuto</div>
            </div>
            <span className="text-white/80 text-xl">→</span>
          </button>

          {/* Recommendations: shown only once the backend says the client qualifies (HU-06) */}
          {recommendations.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✨</span>
                <h2 className="font-black text-[#6B4226] font-display text-lg">Recomendado para ti</h2>
              </div>
              <div className="flex flex-col gap-2 mb-6">
                {recommendations.map(({ rec, service, stylist }, i) => service && (
                  <button
                    key={i}
                    onClick={() => onBook(service.id)}
                    className="flex items-center gap-3 p-3.5 bg-white rounded-[20px] shadow-[0_2px_12px_rgba(107,66,38,0.08)] text-left hover:shadow-[0_4px_20px_rgba(107,66,38,0.14)] active:scale-[0.98] transition-all"
                  >
                    <ServicePhoto serviceId={service.id} category={service.category} className="h-12 w-12 shrink-0 rounded-2xl" />
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-[#6B4226] font-display text-sm">{service.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <MemphisStylistAvatar name={rec.stylistName} color={stylist?.color ?? '#E8734A'} size={16} />
                        <span className="text-xs text-[#A67850]">{rec.stylistName.split(' ')[0]}</span>
                        <span className="text-[10px] text-[#EDD8BC]">·</span>
                        <span className="text-[10px] text-[#8B9D77] font-semibold bg-[#EAF2E3] px-1.5 py-0.5 rounded-full">
                          {rec.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-[#E8734A] text-sm">{formatPrice(service.price)}</div>
                      <div className="text-[10px] text-[#C8A88A]">{formatDuration(service.duration)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Popular services */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-[#6B4226] font-display text-lg">Servicios populares</h2>
            <button className="text-sm font-semibold text-[#E8734A]">Ver todos →</button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none mb-6">
            {popularServices.map(service => (
              <button
                key={service.id}
                onClick={() => onViewService(service.id)}
                className="flex-shrink-0 w-44 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(107,66,38,0.1)] p-4 text-left hover:shadow-[0_8px_28px_rgba(107,66,38,0.16)] transition-all active:scale-[0.97]"
              >
                <ServicePhoto serviceId={service.id} category={service.category} className="mb-3 h-24 w-full rounded-2xl" alt={service.name} />
                <div className="font-black text-[#6B4226] font-display text-sm leading-tight mb-1">{service.name}</div>
                <div className="text-xs text-[#A67850] mb-2">{formatDuration(service.duration)}</div>
                <div className="font-black text-[#E8734A]">{formatPrice(service.price)}</div>
              </button>
            ))}
          </div>

          {/* Top stylists */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-[#6B4226] font-display text-lg">Nuestros estilistas</h2>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none mb-6">
            {STYLISTS.map(stylist => (
              <div
                key={stylist.id}
                className="flex-shrink-0 w-36 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(107,66,38,0.1)] p-4 text-center"
              >
                <div className="flex justify-center mb-2">
                  <MemphisStylistAvatar name={stylist.name} color={stylist.color} size={52} />
                </div>
                <div className="font-black text-[#6B4226] font-display text-xs leading-tight mb-0.5">
                  {stylist.name.split(' ')[0]}
                </div>
                <div className="text-[10px] text-[#A67850] mb-1.5">{stylist.specialty}</div>
                {stylist.rating > 0 && (
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="text-[#F2A950] text-xs">★</span>
                    <span className="text-xs font-bold text-[#6B4226]">{stylist.rating}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Promo banner */}
          <div className="bg-[#6B4226] rounded-[20px] p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/4 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
            <div className="relative z-10">
              <div className="inline-block bg-[#E8734A] text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
                ✨ Oferta especial
              </div>
              <h3 className="text-white font-black font-display text-lg leading-tight mb-1">
                Corte + Barba combo
              </h3>
              <p className="text-white/70 text-sm mb-3">El combo más elegido por nuestros clientes</p>
              <Button onClick={() => onBook(SERVICES.find(s => s.name === 'Corte + Barba')?.id ?? popularServices[0]?.id)} variant="secondary" size="sm">
                Reservar ahora
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SERVICE CATALOG ───────────────────────────────────────────────────────────

export function ServiceCatalog({ onViewService, onBook, onBack }: {
  onViewService: (id: string) => void;
  onBook: (serviceId: string) => void;
  onBack: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const categories = [
    { id: 'all', label: 'Todos', emoji: '🔍' },
    { id: 'cut', label: 'Corte', emoji: '✂️' },
    { id: 'beard', label: 'Barba', emoji: '🪒' },
    { id: 'color', label: 'Color', emoji: '🎨' },
    { id: 'treatment', label: 'Tratamiento', emoji: '💆' },
  ];

  const filtered = activeCategory === 'all'
    ? SERVICES
    : SERVICES.filter(s => s.category === activeCategory);

  return (
    <div className="flex flex-col h-full bg-[#FBF3E9]">
      <div className="bg-white px-5 pt-10 pb-3 shadow-[0_2px_12px_rgba(107,66,38,0.06)]">
        <PageHeader title="Servicios" subtitle={`${SERVICES.length} servicios disponibles`} onBack={onBack} />

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-3 px-5 -mx-5 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`
                flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200
                ${activeCategory === cat.id
                  ? 'bg-[#E8734A] text-white shadow-[0_4px_12px_rgba(232,115,74,0.3)]'
                  : 'bg-[#F5E6D3] text-[#8B5E3C] hover:bg-[#EDD8BC]'
                }
              `}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-3">
          {filtered.map(service => (
            <Card key={service.id} onClick={() => onViewService(service.id)} padding={false}>
              <div className="p-4 flex items-start gap-4">
                <ServicePhoto serviceId={service.id} category={service.category} className="h-14 w-14 shrink-0 rounded-2xl" alt={service.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className="font-black font-display text-[#6B4226] text-base">{service.name}</span>
                    {service.popular && <PopularBadge />}
                  </div>
                  <p className="text-xs text-[#A67850] mt-1 leading-relaxed line-clamp-2">{service.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 text-xs font-semibold text-[#A67850]">
                      <span>⏱ {formatDuration(service.duration)}</span>
                      <CategoryBadge label={CATEGORY_CONFIG[service.category].label} icon={CATEGORY_CONFIG[service.category].emoji} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#E8734A]">{formatPrice(service.price)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <Button onClick={() => onBook(service.id)} variant="primary" size="sm" fullWidth>
                  Reservar ahora
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── SERVICE DETAIL ────────────────────────────────────────────────────────────

export function ServiceDetail({ serviceId, onBook, onBack }: {
  serviceId: string;
  onBook: (id: string) => void;
  onBack: () => void;
}) {
  const service = getService(serviceId);
  const stylists = getStylistsForService(serviceId);

  if (!service) return null;
  const cfg = CATEGORY_CONFIG[service.category];

  return (
    <div className="flex flex-col h-full bg-[#FBF3E9]">
      {/* Hero */}
      <div className="bg-white relative overflow-hidden">
        <ServicePhoto serviceId={service.id} category={service.category} className="h-52 w-full" alt={service.name} />
        <div className="absolute top-3 left-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center text-[#6B4226]"
          >
            ←
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-24">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="text-2xl font-black text-[#6B4226] font-display">{service.name}</h1>
            <CategoryBadge label={cfg.label} icon={cfg.emoji} />
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-[#E8734A]">{formatPrice(service.price)}</div>
            <div className="text-xs text-[#A67850]">por sesión</div>
          </div>
        </div>

        {/* Quick info */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-2xl p-3 flex items-center gap-2 shadow-[0_2px_12px_rgba(107,66,38,0.08)]">
            <div className="w-9 h-9 bg-[#FBF3E9] rounded-xl flex items-center justify-center">⏱</div>
            <div>
              <div className="text-[10px] text-[#C8A88A] font-semibold">DURACIÓN</div>
              <div className="font-bold text-[#6B4226] text-sm">{formatDuration(service.duration)}</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 flex items-center gap-2 shadow-[0_2px_12px_rgba(107,66,38,0.08)]">
            <div className="w-9 h-9 bg-[#FBF3E9] rounded-xl flex items-center justify-center">💰</div>
            <div>
              <div className="text-[10px] text-[#C8A88A] font-semibold">PRECIO</div>
              <div className="font-bold text-[#6B4226] text-sm">{formatPrice(service.price)}</div>
            </div>
          </div>
        </div>

        {/* Description */}
        <Card className="mb-5">
          <h3 className="font-black text-[#6B4226] font-display mb-2">Descripción</h3>
          <p className="text-sm text-[#A67850] leading-relaxed">{service.description}</p>
        </Card>

        {/* What's included */}
        <Card className="mb-5">
          <h3 className="font-black text-[#6B4226] font-display mb-3">¿Qué incluye?</h3>
          {[
            'Consulta personalizada con el estilista',
            'Productos premium de alta calidad',
            'Asesoramiento de imagen gratuito',
            'Garantía de satisfacción',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-[#EAF2E3] flex items-center justify-center flex-shrink-0">
                <span className="text-[#4A7C59] text-xs font-bold">✓</span>
              </div>
              <span className="text-sm text-[#6B4226] font-medium">{item}</span>
            </div>
          ))}
        </Card>

        {/* Stylists for this service */}
        {stylists.length > 0 && (
          <div className="mb-5">
            <h3 className="font-black text-[#6B4226] font-display mb-3">Especialistas</h3>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-none">
              {stylists.map(stylist => (
                <div key={stylist.id} className="flex-shrink-0 bg-white rounded-[16px] p-3 flex items-center gap-3 shadow-[0_2px_12px_rgba(107,66,38,0.08)] min-w-40">
                  <MemphisStylistAvatar name={stylist.name} color={stylist.color} size={40} />
                  <div>
                    <div className="font-bold text-[#6B4226] text-sm">{stylist.name.split(' ')[0]}</div>
                    {stylist.rating > 0 ? (
                      <div className="flex items-center gap-0.5 text-xs">
                        <span className="text-[#F2A950]">★</span>
                        <span className="font-bold text-[#6B4226]">{stylist.rating}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-[#A67850]">{stylist.specialty}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button onClick={() => onBook(serviceId)} variant="primary" size="lg" fullWidth>
          Reservar {service.name} — {formatPrice(service.price)}
        </Button>
      </div>
    </div>
  );
}

// ─── ADMIN SERVICE MANAGEMENT ──────────────────────────────────────────────────

export function AdminServices({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');
  const [serviciosActivos, setServiciosActivos] = useState<ServicioItem[]>([]);
  const [serviciosInactivos, setServiciosInactivos] = useState<ServicioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServicioFormValues>(getEmptyServicioForm());
  const [errors, setErrors] = useState<Partial<Record<'nombre' | 'duracion' | 'precio' | 'categoria', string>>>({});
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'desactivar' | 'reactivar'; id: string } | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const formRefs = {
    nombre: useRef<HTMLInputElement | null>(null),
    duracion: useRef<HTMLInputElement | null>(null),
    precio: useRef<HTMLInputElement | null>(null),
    categoria: useRef<HTMLSelectElement | null>(null),
  };

  const listByState = activeTab === 'ACTIVO' ? serviciosActivos : serviciosInactivos;
  const currentTabLabel = activeTab === 'ACTIVO' ? 'Servicios Activos' : 'Servicios Inactivos';

  const mapCategoriaToKey = (categoria: ServicioCategoria): ServiceCategory => {
    const categoryMap: Record<ServicioCategoria, ServiceCategory> = {
      Cortes: 'cut',
      Barba: 'beard',
      Combos: 'cut',
      Tratamientos: 'treatment',
    };

    return categoryMap[categoria];
  };

  const formatCOP = (value: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);

  const focusFirstError = (nextErrors: Partial<Record<'nombre' | 'duracion' | 'precio' | 'categoria', string>>) => {
    const fieldOrder: Array<keyof typeof formRefs> = ['nombre', 'duracion', 'precio', 'categoria'];
    const firstField = fieldOrder.find(field => Boolean(nextErrors[field]));
    if (!firstField) return;
    const node = formRefs[firstField];
    node.current?.focus();
  };

  const loadServices = async () => {
    setLoading(true);
    const [activos, inactivos] = await Promise.all([listarActivos(), listarInactivos()]);
    setServiciosActivos(activos);
    setServiciosInactivos(inactivos);
    setLoading(false);
  };

  useEffect(() => {
    void loadServices();
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (!isFormOpen && !pendingAction) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFormOpen(false);
        setPendingAction(null);
        setPendingConfirm(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFormOpen, pendingAction]);

  const openCreateForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setForm(getEmptyServicioForm());
    setErrors({});
    setPendingConfirm(false);
    setIsFormOpen(true);
  };

  const openEditForm = (service: ServicioItem) => {
    setIsEditing(true);
    setEditingId(service.id);
    setForm({
      nombre: service.nombre,
      duracion: String(service.duracion),
      precio: String(service.precio),
      categoria: service.categoria,
    });
    setErrors({});
    setPendingConfirm(false);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setPendingConfirm(false);
    setErrors({});
    setForm(getEmptyServicioForm());
    setEditingId(null);
    setIsEditing(false);
  };

  const updateField = (field: keyof ServicioFormValues, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validarServicio(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    if (isEditing && editingId) {
      setPendingConfirm(true);
      return;
    }

    await saveService();
  };

  const saveService = async () => {
    try {
      if (isEditing && editingId) {
        await editarServicio(editingId, form);
        setToastMessage('Servicio actualizado correctamente');
      } else {
        await crearServicio(form);
        setToastMessage('Servicio creado correctamente');
      }

      setPendingConfirm(false);
      closeForm();
      await loadServices();
    } catch (error) {
      const nextErrors = validarServicio(form);
      setErrors(nextErrors);
      focusFirstError(nextErrors);
    }
  };

  const handleDesactivar = async (id: string) => {
    try {
      await desactivarServicio(id);
      setPendingAction(null);
      setToastMessage('Servicio desactivado correctamente');
      await loadServices();
    } catch {
      setPendingAction(null);
    }
  };

  const handleReactivar = async (id: string) => {
    try {
      await reactivarServicio(id);
      setPendingAction(null);
      setToastMessage('Servicio reactivado correctamente');
      await loadServices();
    } catch {
      setPendingAction(null);
    }
  };

  const originalPrice = isEditing && editingId
    ? (serviciosActivos.concat(serviciosInactivos).find(item => item.id === editingId)?.precio ?? Number(form.precio))
    : null;

  const showPriceWarning = isEditing && originalPrice !== null && Number(form.precio) !== originalPrice;

  return (
    <div className="flex flex-col h-full bg-[#FBF3E9] overflow-y-auto">
      <div className="bg-white px-6 pt-8 pb-4 shadow-[0_2px_12px_rgba(107,66,38,0.06)]">
        <PageHeader
          title="Gestión de Servicios"
          subtitle={`${activeTab === 'ACTIVO' ? serviciosActivos.length : serviciosInactivos.length} servicios ${activeTab === 'ACTIVO' ? 'activos' : 'inactivos'}`}
          onBack={onBack}
          action={
            <Button onClick={openCreateForm} variant="primary" size="sm">
              Nuevo Servicio
            </Button>
          }
        />
      </div>

      <div className="px-6 py-5">
        <div role="tablist" aria-label="Estado de servicios" className="inline-flex w-full rounded-2xl bg-[#F5E6D3] p-1 mb-5">
          {(['ACTIVO', 'INACTIVO'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                activeTab === tab ? 'bg-[#E8734A] text-white shadow-sm' : 'text-[#8B5E3C]'
              }`}
            >
              {tab === 'ACTIVO' ? 'Servicios Activos' : 'Servicios Inactivos'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#8B5E3C]">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#EDD8BC] border-t-[#E8734A]" />
            <p className="mt-4 text-sm font-semibold">Cargando servicios...</p>
          </div>
        ) : listByState.length === 0 ? (
          <div className="rounded-[24px] border-2 border-dashed border-[#EDD8BC] bg-white px-6 py-10 text-center">
            <h3 className="font-black text-[#6B4226] text-lg">No hay {currentTabLabel.toLowerCase()}.</h3>
            <p className="mt-2 text-sm text-[#A67850]">
              {activeTab === 'ACTIVO'
                ? 'Crea un servicio nuevo para que aparezca en el catálogo público.'
                : 'Los servicios inactivos aparecerán aquí cuando se desactiven.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[24px] border border-[#EDD8BC] bg-white shadow-[0_4px_24px_-4px_rgba(107,66,38,0.12)]">
            <table className="min-w-[760px] w-full">
              <thead className="bg-[#FBF3E9]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-[#8B5E3C]">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-[#8B5E3C]">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-[#8B5E3C]">Duración</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-[#8B5E3C]">Precio</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-[#8B5E3C]">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-[#8B5E3C]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listByState.map(service => (
                  <tr key={service.id} className="border-t border-[#F5E6D3] align-middle">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="hidden sm:block">
                          <ServicePhoto
                            serviceId={service.id}
                            category={mapCategoriaToKey(service.categoria)}
                            className="h-11 w-11 rounded-xl"
                            alt={service.nombre}
                          />
                        </div>
                        <span className="font-bold text-[#6B4226]">{service.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <CategoryBadge label={service.categoria} icon={CATEGORY_CONFIG[mapCategoriaToKey(service.categoria)].emoji} />
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[#6B4226]">{service.duracion} min</td>
                    <td className="px-4 py-4 text-sm font-bold text-[#E8734A]">{formatCOP(service.precio)}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          service.estado === 'ACTIVO'
                            ? 'bg-[#EAF2E3] text-[#4A7C59]'
                            : 'bg-[#FFF3CD] text-[#8B5E3C]'
                        }`}
                      >
                        {service.estado}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(service)}
                          className="rounded-xl bg-[#FBF3E9] px-3 py-2 text-xs font-bold text-[#6B4226] transition hover:bg-[#F5E6D3]"
                        >
                          Editar
                        </button>
                        {service.estado === 'ACTIVO' ? (
                          <button
                            type="button"
                            onClick={() => setPendingAction({ type: 'desactivar', id: service.id })}
                            className="rounded-xl bg-[#FFF5F5] px-3 py-2 text-xs font-bold text-[#C45C4C] transition hover:bg-[#FFE8E8]"
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingAction({ type: 'reactivar', id: service.id })}
                            className="rounded-xl bg-[#EAF2E3] px-3 py-2 text-xs font-bold text-[#4A7C59] transition hover:bg-[#DDEFD9]"
                          >
                            Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="servicio-form-title" className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#A67850]">Servicios</p>
                <h3 id="servicio-form-title" className="mt-1 text-2xl font-black text-[#6B4226]">{isEditing ? 'Editar servicio' : 'Nuevo servicio'}</h3>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FBF3E9] text-[#6B4226] transition hover:bg-[#F5E6D3]"
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  id="nombre-servicio"
                  label="Nombre"
                  value={form.nombre}
                  onChange={value => updateField('nombre', value)}
                  placeholder="Ej: Corte Fade & Barba"
                  required
                  error={errors.nombre}
                  inputRef={formRefs.nombre}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="duracion-servicio" className="mb-1.5 block text-sm font-semibold text-[#6B4226]">Duración</label>
                  <input
                    ref={formRefs.duracion as React.RefObject<HTMLInputElement>}
                    id="duracion-servicio"
                    type="number"
                    min={10}
                    max={240}
                    value={form.duracion}
                    onChange={event => updateField('duracion', event.target.value)}
                    placeholder="60"
                    aria-invalid={Boolean(errors.duracion)}
                    className={`w-full rounded-[14px] border-2 bg-white px-4 py-3 text-sm font-medium text-[#6B4226] placeholder-[#C8A88A] outline-none transition ${
                      errors.duracion ? 'border-[#C45C4C] bg-[#FFF5F5]' : 'border-[#EDD8BC] focus:border-[#E8734A]'
                    }`}
                  />
                  {errors.duracion && <p className="mt-1.5 text-xs font-medium text-[#C45C4C]">{errors.duracion}</p>}
                </div>

                <div>
                  <label htmlFor="precio-servicio" className="mb-1.5 block text-sm font-semibold text-[#6B4226]">Precio</label>
                  <input
                    ref={formRefs.precio as React.RefObject<HTMLInputElement>}
                    id="precio-servicio"
                    type="number"
                    min={1}
                    step="1000"
                    value={form.precio}
                    onChange={event => updateField('precio', event.target.value)}
                    placeholder="35000"
                    aria-invalid={Boolean(errors.precio)}
                    className={`w-full rounded-[14px] border-2 bg-white px-4 py-3 text-sm font-medium text-[#6B4226] placeholder-[#C8A88A] outline-none transition ${
                      errors.precio ? 'border-[#C45C4C] bg-[#FFF5F5]' : 'border-[#EDD8BC] focus:border-[#E8734A]'
                    }`}
                  />
                  {errors.precio && <p className="mt-1.5 text-xs font-medium text-[#C45C4C]">{errors.precio}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="categoria-servicio" className="mb-1.5 block text-sm font-semibold text-[#6B4226]">Categoría</label>
                <select
                  ref={formRefs.categoria as React.RefObject<HTMLSelectElement>}
                  id="categoria-servicio"
                  value={form.categoria}
                  onChange={event => updateField('categoria', event.target.value)}
                  aria-invalid={Boolean(errors.categoria)}
                  className={`w-full rounded-[14px] border-2 bg-white px-4 py-3 text-sm font-medium text-[#6B4226] outline-none transition ${
                    errors.categoria ? 'border-[#C45C4C] bg-[#FFF5F5]' : 'border-[#EDD8BC] focus:border-[#E8734A]'
                  }`}
                >
                  <option value="">Selecciona una categoría</option>
                  {servicioCategorias.map(categoria => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
                {errors.categoria && <p className="mt-1.5 text-xs font-medium text-[#C45C4C]">{errors.categoria}</p>}
              </div>

              {showPriceWarning && (
                <div className="rounded-2xl border border-[#EDD8BC] bg-[#FFF9F1] p-3 text-sm text-[#8B5E3C]">
                  El nuevo precio aplica solo para nuevas reservas. Las citas ya agendadas conservan su valor.
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={closeForm}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="confirmar-edicion-title" className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF5F5] text-3xl">⚠️</div>
            <h3 id="confirmar-edicion-title" className="text-2xl font-black text-[#6B4226]">Confirmar edición</h3>
            <p className="mt-2 text-sm leading-6 text-[#A67850]">
              El nuevo precio aplica solo para nuevas reservas. Las citas ya agendadas conservan su valor.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setPendingConfirm(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" onClick={saveService}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="confirmar-estado-title" className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF5F5] text-3xl">
              {pendingAction.type === 'desactivar' ? '🗑️' : '↩️'}
            </div>
            <h3 id="confirmar-estado-title" className="text-2xl font-black text-[#6B4226]">
              {pendingAction.type === 'desactivar' ? '¿Desactivar servicio?' : '¿Reactivar servicio?'}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#A67850]">
              {pendingAction.type === 'desactivar'
                ? 'El servicio se ocultará del catálogo público. Las citas ya agendadas se mantienen intactas.'
                : 'El servicio volverá a estar disponible para nuevas reservas.'}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setPendingAction(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant={pendingAction.type === 'desactivar' ? 'danger' : 'primary'}
                onClick={() => {
                  if (pendingAction.type === 'desactivar') {
                    void handleDesactivar(pendingAction.id);
                  } else {
                    void handleReactivar(pendingAction.id);
                  }
                }}
              >
                {pendingAction.type === 'desactivar' ? 'Sí, desactivar' : 'Sí, reactivar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-2xl bg-[#6B4226] px-4 py-3 text-sm font-bold text-white shadow-xl">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
