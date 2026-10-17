import { useEffect, useMemo, useState } from 'react';
import { formatDuration, formatPrice, type Service } from '../data';
import { fetchNotifications, fetchRecommendations, markAllNotificationsRead, type ApiNotification, type ApiRecommendation } from '../backend';
import { LANDING_HOURS, LANDING_LOCATION, LANDING_SERVICE_IMAGES, LANDING_SERVICES, LANDING_STYLIST_IMAGES, LANDING_STYLISTS } from '../mockData';

type ServiceFilter = 'Todos' | 'Cortes' | 'Barba' | 'Combos' | 'Color' | 'Tratamientos';

const SERVICE_FILTERS: ServiceFilter[] = ['Todos', 'Cortes', 'Barba', 'Combos', 'Color', 'Tratamientos'];
const SERVICE_FILTER_CATEGORY: Partial<Record<ServiceFilter, Service['category']>> = {
  Cortes: 'cut',
  Barba: 'beard',
  Color: 'color',
  Tratamientos: 'treatment',
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-[#A67850]" role="status">
      <span className="landing-spinner" aria-hidden="true" />
      {label}
    </span>
  );
}

function SectionHeading({ eyebrow, title, description }: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#E8734A]">{eyebrow}</p>
      <h2 className="font-display text-3xl font-black text-[#402719] sm:text-4xl">{title}</h2>
      {description && <p className="mt-3 text-sm leading-relaxed text-[#8B6A52] sm:text-base">{description}</p>}
    </div>
  );
}

function ServiceSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(64,39,25,0.07)]" aria-hidden="true">
      <div className="landing-shimmer h-48" />
      <div className="space-y-3 p-5">
        <div className="landing-shimmer h-5 w-3/4 rounded-lg" />
        <div className="landing-shimmer h-4 w-full rounded-lg" />
        <div className="landing-shimmer h-4 w-1/2 rounded-lg" />
      </div>
    </div>
  );
}

function StylistSkeleton() {
  return (
    <div className="flex min-w-[245px] flex-1 snap-start flex-col items-center rounded-3xl border border-[#F1E5D8] bg-white p-6 shadow-[0_8px_30px_rgba(64,39,25,0.06)]" aria-hidden="true">
      <div className="landing-shimmer h-28 w-28 rounded-full" />
      <div className="landing-shimmer mt-4 h-5 w-32 rounded-lg" />
      <div className="landing-shimmer mt-2 h-4 w-24 rounded-lg" />
      <div className="landing-shimmer mt-4 h-4 w-36 rounded-lg" />
      <div className="landing-shimmer mt-5 h-11 w-full rounded-full" />
    </div>
  );
}

function RecommendationSkeleton() {
  return (
    <div className="flex min-h-28 items-center gap-4 rounded-3xl bg-white p-4 shadow-[0_5px_20px_rgba(64,39,25,0.06)]" aria-hidden="true">
      <div className="landing-shimmer h-20 w-20 shrink-0 rounded-2xl" />
      <div className="flex-1">
        <div className="landing-shimmer h-5 w-28 rounded-full" />
        <div className="landing-shimmer mt-2 h-4 w-36 rounded-lg" />
        <div className="landing-shimmer mt-2 h-3 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export default function Landing({ isLoggedIn, userName, onLogin, onRegister, onBook, onProfile }: {
  isLoggedIn: boolean;
  userName: string;
  onLogin: () => void;
  onRegister: () => void;
  onBook: (serviceId?: string) => void;
  onProfile: () => void;
}) {
  const [activeFilter, setActiveFilter] = useState<ServiceFilter>('Todos');
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recommendations, setRecommendations] = useState<ApiRecommendation[]>([]);

  // HU-06: the bell and "Recomendado para ti" come from the backend, only for signed-in clients.
  // Each fails silently: a missing section is better than a broken page.
  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setUnreadCount(0);
      setRecommendations([]);
      return;
    }
    let active = true;
    fetchNotifications()
      .then(result => {
        if (!active) return;
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      })
      .catch(() => undefined);
    fetchRecommendations()
      .then(result => { if (active && result.eligible) setRecommendations(result.recommendations); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [isLoggedIn]);

  const toggleNotifications = () => {
    const opening = !notificationsOpen;
    setNotificationsOpen(opening);
    if (opening && unreadCount > 0) {
      setUnreadCount(0);
      void markAllNotificationsRead().catch(() => undefined);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => setContentReady(true), 550);
    return () => clearTimeout(timeout);
  }, []);

  const filteredServices = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es');
    return LANDING_SERVICES.filter(service => {
      const matchesFilter = activeFilter === 'Todos'
        || (activeFilter === 'Combos' ? service.name.toLocaleLowerCase('es').includes(' + ') : service.category === SERVICE_FILTER_CATEGORY[activeFilter]);
      const matchesQuery = !normalizedQuery
        || service.name.toLocaleLowerCase('es').includes(normalizedQuery)
        || service.description.toLocaleLowerCase('es').includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, query]);

  const closeMenu = () => setMenuOpen(false);
  const navLinks = [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Estilistas', href: '#estilistas' },
    { label: 'Quiénes somos', href: '#nosotros' },
    { label: 'Ubicación', href: '#ubicacion' },
    { label: 'Contacto', href: '#contacto' },
  ];

  const renderServiceCard = (service: Service, index: number) => (
    <article
      key={service.id}
      className="landing-fade-up group overflow-hidden rounded-3xl border border-[#F1E5D8] bg-white shadow-[0_8px_30px_rgba(64,39,25,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(64,39,25,0.15)]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative h-48 overflow-hidden bg-[#6B4226]">
        <img
          src={LANDING_SERVICE_IMAGES[service.id]}
          alt={service.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#24160F]/70 via-transparent to-transparent" />
        <span className="absolute bottom-4 left-4 rounded-full border border-white/30 bg-black/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {formatDuration(service.duration)}
        </span>
        {service.popular && (
          <span className="absolute right-4 top-4 rounded-full bg-[#E8734A] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            Popular
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg font-extrabold text-[#402719]">{service.name}</h3>
        <p className="mt-1 min-h-10 text-sm leading-relaxed text-[#8B6A52]">{service.description}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="font-display text-2xl font-black text-[#E8734A]">{formatPrice(service.price)}</span>
          <button
            type="button"
            onClick={() => onBook(service.id)}
            className="min-h-11 rounded-full bg-[#402719] px-4 text-xs font-bold text-white transition-all duration-250 hover:-translate-y-1 hover:bg-[#6B4226]"
          >
            {isLoggedIn ? 'Reservar' : 'Crear cuenta'}
          </button>
        </div>
      </div>
    </article>
  );

  return (
    <div className="h-full scroll-smooth overflow-y-auto bg-[#FFFCF8] text-[#402719]">
      <header className="landing-glass sticky top-0 z-40 border-b border-white/60">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#inicio" className="flex min-h-11 items-center gap-2.5" onClick={closeMenu} aria-label="BarberBook, inicio">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8734A] text-xl text-white shadow-[0_6px_16px_rgba(232,115,74,0.28)]">✂</span>
            <span className="font-display text-xl font-black tracking-tight text-[#402719]">Barber<span className="text-[#E8734A]">Book</span></span>
          </a>

          <nav aria-label="Navegación principal" className="hidden items-center gap-6 lg:flex">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} onClick={event => {
                event.preventDefault();
                document.getElementById(link.href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }} className="text-xs font-semibold text-[#765B47] transition-colors hover:text-[#E8734A]">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            {isLoggedIn ? (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={toggleNotifications}
                    aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} nueva${unreadCount === 1 ? '' : 's'}` : 'Notificaciones'}
                    aria-expanded={notificationsOpen}
                    className="relative flex h-11 w-11 items-center justify-center rounded-full text-[#6B4226] transition-colors hover:bg-[#F5E6D3]"
                  >
                    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M10 21h4" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-[#FFFCF8] bg-[#E8734A]" />
                    )}
                  </button>
                  {notificationsOpen && (
                    <div className="absolute right-0 top-14 z-50 max-h-96 w-80 overflow-y-auto rounded-2xl border border-[#F1E5D8] bg-white p-4 text-sm shadow-xl">
                      <p className="font-bold text-[#402719]">Avisos recientes de tus citas</p>
                      {notifications.length > 0 ? (
                        <ul className="mt-3 space-y-3">
                          {notifications.map(notification => (
                            <li key={notification.id} className="border-t border-[#F1E5D8] pt-3">
                              <p className="text-xs font-bold text-[#6B4226]">{notification.title}</p>
                              <p className="mt-1 text-xs text-[#8B6A52]">{notification.message}</p>
                              <p className="mt-1 text-[11px] font-semibold text-[#E8734A]">
                                {new Date(notification.createdAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-xs text-[#8B6A52]">Te avisaremos cuando haya novedades sobre tus citas.</p>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onProfile}
                  className="flex min-h-11 items-center gap-2 rounded-full pl-1 pr-3 transition-colors hover:bg-[#F5E6D3]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6B4226] text-sm font-bold text-white">
                    {userName.split(' ').map(part => part[0]).slice(0, 2).join('')}
                  </span>
                  <span className="max-w-40 text-left text-xs font-semibold text-[#6B4226]">¡{getGreeting()}! {userName.split(' ')[0]}</span>
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={onLogin} className="min-h-11 rounded-full px-4 text-xs font-bold text-[#6B4226] transition-colors hover:bg-[#F5E6D3]">Iniciar sesión</button>
                <button type="button" onClick={onRegister} className="min-h-11 rounded-full bg-[#E8734A] px-5 text-xs font-bold text-white shadow-[0_6px_18px_rgba(232,115,74,0.25)] transition-all duration-250 hover:-translate-y-1 hover:bg-[#C85A31]">Crear cuenta</button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(open => !open)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl text-[#6B4226] hover:bg-[#F5E6D3] lg:hidden"
          >
            {menuOpen ? '×' : '☰'}
          </button>
        </div>
        {menuOpen && (
          <nav aria-label="Navegación móvil" className="absolute left-0 right-0 top-full border-t border-[#F1E5D8] bg-[#FFFCF8] p-4 shadow-xl lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col">
              {navLinks.map(link => (
                <a key={link.href} href={link.href} onClick={event => {
                  event.preventDefault();
                  closeMenu();
                  document.getElementById(link.href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }} className="flex min-h-12 items-center border-b border-[#F1E5D8] px-2 text-sm font-semibold text-[#765B47] hover:text-[#E8734A]">
                  {link.label}
                </a>
              ))}
              {!isLoggedIn && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => { closeMenu(); onLogin(); }} className="min-h-11 rounded-full border border-[#E8734A] px-3 text-xs font-bold text-[#E8734A]">Iniciar sesión</button>
                  <button type="button" onClick={() => { closeMenu(); onRegister(); }} className="min-h-11 rounded-full bg-[#E8734A] px-3 text-xs font-bold text-white">Crear cuenta</button>
                </div>
              )}
              {isLoggedIn && (
                <button type="button" onClick={() => { closeMenu(); onProfile(); }} className="mt-4 min-h-11 rounded-full bg-[#402719] px-4 text-xs font-bold text-white">
                  Mi perfil · {userName}
                </button>
              )}
            </div>
          </nav>
        )}
      </header>

      <main>
        <section id="inicio" className="relative isolate min-h-[610px] scroll-mt-20 overflow-hidden bg-[#24160F] sm:min-h-[660px]">
          <img
            src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=2200&q=90"
            alt=""
            fetchPriority="high"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#1E120C]/95 via-[#1E120C]/75 to-[#1E120C]/25" />
          <div className="mx-auto flex min-h-[610px] max-w-7xl items-center px-5 py-16 sm:min-h-[660px] sm:px-8 lg:px-12">
            <div className="landing-sweep-in max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#F7C87A] backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#A8BB92]" /> Barbería premium · Apartadó, Antioquia
              </span>
              <h1 className="mt-7 font-display text-5xl font-black leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-7xl">
                Tu estilo,<br /><span className="text-[#F2A950]">sin atajos.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
                Técnicas clásicas, actitud contemporánea y un espacio hecho para que te sientas bien. Tu próxima versión empieza en la silla.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onBook()}
                  className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#E8734A] px-7 text-sm font-bold text-white shadow-[0_12px_32px_rgba(232,115,74,0.3)] transition-all duration-250 hover:-translate-y-1 hover:bg-[#C85A31]"
                >
                  {isLoggedIn ? 'Reservar una cita' : 'Crear cuenta para reservar'} <span className="transition-transform group-hover:translate-x-1">→</span>
                </button>
                <a href="#servicios" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 px-7 text-sm font-bold text-white transition-colors hover:bg-white/10">
                  Explorar servicios
                </a>
              </div>
              <div className="mt-10 flex items-center gap-3 text-sm text-white/70">
                <span className="tracking-widest text-[#F2A950]" aria-label="5 de 5 estrellas">★★★★★</span>
                <span>Estilo que habla por ti</span>
              </div>
            </div>
          </div>
          <a href="#servicios" aria-label="Desplazarse a servicios" className="absolute bottom-7 left-1/2 hidden h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-white/30 text-white/80 md:flex">↓</a>
        </section>

        <section id="servicios" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Elige tu experiencia" title="Servicios que marcan estilo" description="Un buen corte no se improvisa. Encuentra el servicio ideal para ti y reserva con nuestro equipo." />
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar servicios por categoría">
                {SERVICE_FILTERS.map(filter => (
                  <button
                    type="button"
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    aria-pressed={activeFilter === filter}
                    className={`min-h-11 shrink-0 rounded-full px-5 text-xs font-bold transition-colors ${activeFilter === filter ? 'bg-[#402719] text-white' : 'bg-white text-[#765B47] hover:bg-[#F5E6D3]'}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <label className="flex min-h-11 items-center gap-2 rounded-full border border-[#EADCCB] bg-white px-4 focus-within:border-[#E8734A] md:w-72">
                <span aria-hidden="true" className="text-[#A67850]">⌕</span>
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar un servicio..." className="w-full bg-transparent text-sm outline-none placeholder:text-[#B8A18A]" />
              </label>
            </div>
            {!contentReady ? (
              <>
                <div className="mb-5 flex justify-center"><Spinner label="Preparando nuestros servicios..." /></div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{LANDING_SERVICES.map(service => <ServiceSkeleton key={service.id} />)}</div>
              </>
            ) : filteredServices.length ? (
              <div key={`${activeFilter}-${query}`} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {filteredServices.map(renderServiceCard)}
              </div>
            ) : (
              <div className="landing-fade-up rounded-3xl border border-dashed border-[#DCCAB5] bg-white py-14 text-center">
                <span className="text-4xl" aria-hidden="true">✂️</span>
                <p className="mt-3 font-display text-xl font-bold text-[#6B4226]">No se encontraron servicios</p>
                <p className="mt-1 text-sm text-[#8B6A52]">Prueba con otra búsqueda o categoría.</p>
              </div>
            )}
          </div>
        </section>

        {isLoggedIn && recommendations.length > 0 && (
          <section className="bg-[#F7F0E7] px-5 py-16 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#E8734A]">Para ti</p>
                  <h2 className="mt-2 font-display text-3xl font-black text-[#402719]">Recomendado para ti</h2>
                </div>
                <a href="#servicios" className="text-sm font-bold text-[#E8734A] hover:underline">Ver todos los servicios →</a>
              </div>
              {!contentReady ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map(index => <RecommendationSkeleton key={index} />)}
                </div>
              ) : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recommendations.map(item => {
                  const service = LANDING_SERVICES.find(candidate => candidate.id === item.serviceId);
                  if (!service) return null;
                  return (
                    <button key={`${item.serviceId}-${item.stylistId}`} type="button" onClick={() => onBook(service.id)} className="group flex min-h-28 items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-[0_5px_20px_rgba(64,39,25,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                      <img src={LANDING_SERVICE_IMAGES[service.id]} alt="" loading="lazy" className="h-20 w-20 rounded-2xl object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="mb-1 inline-block rounded-full bg-[#F8E6DB] px-2.5 py-1 text-[10px] font-bold text-[#B85230]">{item.label}</span>
                        <span className="block truncate font-display font-extrabold text-[#402719]">{service.name}</span>
                        <span className="mt-1 block text-xs text-[#8B6A52]">{item.stylistName.split(' ')[0]} · {formatPrice(service.price)}</span>
                      </span>
                      <span className="text-lg text-[#E8734A] transition-transform group-hover:translate-x-1">→</span>
                    </button>
                  );
                })}
              </div>}
            </div>
          </section>
        )}

        <section id="estilistas" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Manos expertas" title="Conoce a tu próximo estilista" description="Profesionales que escuchan, asesoran y cuidan cada detalle de tu estilo." />
            {!contentReady ? (
              <>
                <div className="mb-4 flex justify-center"><Spinner label="Conociendo al equipo..." /></div>
                <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-5">
                  {[0, 1, 2, 3].map(index => <StylistSkeleton key={index} />)}
                </div>
              </>
            ) : (
              <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-5">
                {LANDING_STYLISTS.map((stylist, index) => (
                  <article key={stylist.id} className="landing-fade-up min-w-[245px] flex-1 snap-start rounded-3xl border border-[#F1E5D8] bg-white p-6 text-center shadow-[0_8px_30px_rgba(64,39,25,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:min-w-[260px]" style={{ animationDelay: `${index * 80}ms` }}>
                    <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[#F5E6D3] bg-[#F5E6D3]">
                      {LANDING_STYLIST_IMAGES[stylist.id] ? (
                        <img src={LANDING_STYLIST_IMAGES[stylist.id]} alt={stylist.name} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-display text-3xl font-black text-[#A67850]" aria-hidden="true">{stylist.initials}</span>
                      )}
                    </div>
                    <h3 className="mt-4 font-display text-lg font-black text-[#402719]">{stylist.name}</h3>
                    <p className="mt-1 text-sm text-[#8B6A52]">{stylist.specialty}</p>
                    {stylist.rating > 0 && (
                      <p className="mt-3 text-sm font-bold text-[#6B4226]"><span className="text-[#E5A93D]">★</span> {stylist.rating.toFixed(1)} <span className="font-normal text-[#A67850]">/ 5.0{stylist.reviewCount > 0 ? ` · ${stylist.reviewCount} reseñas` : ''}</span></p>
                    )}
                    <button type="button" onClick={() => onBook()} className="mt-5 min-h-11 w-full rounded-full border border-[#E8734A] text-xs font-bold text-[#E8734A] transition-colors hover:bg-[#E8734A] hover:text-white">{isLoggedIn ? `Reservar con ${stylist.name.split(' ')[0]}` : 'Crear cuenta'}</button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="nosotros" className="scroll-mt-20 bg-[#F7F0E7] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="landing-sweep-in relative">
              <img src="https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=1200&q=85" alt="Interior cálido de una barbería clásica" loading="lazy" className="h-[340px] w-full rounded-[32px] object-cover shadow-[0_24px_55px_rgba(64,39,25,0.16)] sm:h-[440px]" />
              <div className="absolute -bottom-5 right-4 rounded-2xl bg-[#E8734A] px-5 py-4 text-white shadow-xl sm:-right-5">
                <p className="font-display text-2xl font-black">Desde 2016</p>
                <p className="text-xs text-white/80">tradición y evolución</p>
              </div>
            </div>
            <div className="landing-fade-up pt-4 lg:pt-0">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#E8734A]">Nuestra esencia</p>
              <h2 className="mt-3 font-display text-3xl font-black leading-tight text-[#402719] sm:text-4xl">Más que un corte.<br />Un espacio para ti.</h2>
              <p className="mt-5 text-sm leading-7 text-[#765B47] sm:text-base">
                Creemos que la barbería reúne oficio, conversación y cuidado personal. Honramos las técnicas de siempre mientras exploramos nuevas formas de expresar tu estilo.
              </p>
              <p className="mt-3 text-sm leading-7 text-[#765B47] sm:text-base">
                Nuestro equipo trabaja con atención al detalle y productos seleccionados para que cada visita se sienta tan bien como el resultado.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-[#E3D4C2] pt-6">
                {[['+5,000', 'Clientes felices'], ['+8 años', 'De experiencia'], ['100%', 'Estilo auténtico']].map(([value, label]) => (
                  <div key={label}>
                    <p className="font-display text-xl font-black text-[#E8734A] sm:text-2xl">{value}</p>
                    <p className="mt-1 text-[10px] leading-snug text-[#8B6A52] sm:text-xs">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="ubicacion" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Ven a visitarnos" title="Un buen corte queda cerca" description="Te esperamos para hacer una pausa, tomar un café y salir con un estilo que se sienta tuyo." />
            <div className="grid overflow-hidden rounded-[32px] border border-[#F1E5D8] bg-white shadow-[0_15px_45px_rgba(64,39,25,0.08)] lg:grid-cols-2">
              <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden bg-[#EADBC8] p-6">
                <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(30deg,transparent 48%,#fff 49%,#fff 51%,transparent 52%),linear-gradient(150deg,transparent 48%,#fff 49%,#fff 51%,transparent 52%)', backgroundSize: '80px 80px' }} />
                <div className="absolute inset-0 bg-[#8B9D77]/20" />
                <div className="relative z-10 flex flex-col items-center text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8734A] text-2xl text-white shadow-[0_10px_25px_rgba(107,66,38,0.25)]">⌖</span>
                  <span className="mt-3 rounded-xl bg-white/90 px-4 py-2 text-xs font-bold text-[#402719] shadow">BarberBook · Apartadó</span>
                </div>
                <span className="absolute bottom-5 left-5 rounded-full bg-white/85 px-3 py-1.5 text-[10px] font-semibold text-[#6B4226]">Mapa ilustrativo</span>
              </div>
              <div className="p-7 sm:p-10">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E8734A]">Encuéntranos</p>
                <h3 className="mt-2 font-display text-2xl font-black text-[#402719]">BarberBook Apartadó</h3>
                <p className="mt-4 text-sm font-semibold text-[#6B4226]">{LANDING_LOCATION.address}</p>
                <p className="mt-1 text-sm text-[#8B6A52]">{LANDING_LOCATION.reference}</p>
                <div className="my-7 h-px bg-[#F1E5D8]" />
                <h4 className="font-display text-lg font-extrabold text-[#402719]">Horario de atención</h4>
                <div className="mt-3 space-y-3">
                  {LANDING_HOURS.map(item => (
                    <div key={item.days} className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="text-[#765B47]">{item.days}</span><span className="font-semibold text-[#402719]">{item.hours}</span>
                    </div>
                  ))}
                </div>
                <a href={`https://www.google.com/maps/search/?api=1&query=${LANDING_LOCATION.mapQuery}`} target="_blank" rel="noreferrer" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#402719] px-6 text-xs font-bold text-white transition-all duration-250 hover:-translate-y-1 hover:bg-[#6B4226]">
                  Cómo llegar <span className="ml-2">↗</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="contacto" className="scroll-mt-20 bg-[#281910] px-5 pb-24 pt-14 text-white sm:px-8 sm:pb-10 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <a href="#inicio" className="inline-flex min-h-11 items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8734A] text-xl">✂</span>
              <span className="font-display text-xl font-black">BarberBook</span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">Tradición, técnica y buen estilo. Nos vemos en la silla.</p>
            <div className="mt-5 flex gap-2">
              {['Instagram', 'Facebook', 'TikTok', 'YouTube'].map((network, index) => (
                <a key={network} href="#contacto" aria-label={network} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-xs font-bold text-white/80 transition-all duration-250 hover:-translate-y-1 hover:border-[#E8734A] hover:bg-[#E8734A]">
                  {['ig', 'f', 'tk', '▶'][index]}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-display font-extrabold">Explora</h3>
            <div className="mt-4 flex flex-col gap-3">
              {navLinks.slice(1, 5).map(link => <a key={link.href} href={link.href} className="text-sm text-white/60 transition-colors hover:text-[#F2A950]">{link.label}</a>)}
            </div>
          </div>
          <div>
            <h3 className="font-display font-extrabold">Hablemos</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-white/60">
              <a href={`mailto:${LANDING_LOCATION.email}`} className="break-all hover:text-[#F2A950]">{LANDING_LOCATION.email}</a>
              <a href={`tel:${LANDING_LOCATION.phone.replace(/\s/g, '')}`} className="hover:text-[#F2A950]">{LANDING_LOCATION.phone}</a>
              <a href="https://wa.me/573000000000" target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-fit items-center rounded-full bg-[#8B9D77] px-4 font-bold text-white transition-colors hover:bg-[#6B7D5A]">Chatea con nosotros ↗</a>
            </div>
          </div>
          <div>
            <h3 className="font-display font-extrabold">Información</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-white/60">
              <a href="#contacto" className="hover:text-[#F2A950]">Política de privacidad</a>
              <a href="#contacto" className="hover:text-[#F2A950]">Términos del servicio</a>
              <a href="#ubicacion" className="hover:text-[#F2A950]">Visítanos en Apartadó</a>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-5 text-center text-xs text-white/40 sm:text-left">
          © {new Date().getFullYear()} BarberBook. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
