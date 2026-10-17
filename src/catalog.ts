// Loads the real catalog (services, stylists, popular services) from the backend and swaps it into
// the SERVICES / STYLISTS lists that the screens already read. The lists are updated IN PLACE so
// every module holding a reference to them (mockData.ts, the screens) sees the new content.
import {
  DEMO_SERVICES,
  DEMO_STYLISTS,
  SERVICES,
  STYLISTS,
  type Service,
  type ServiceCategory,
  type Stylist,
} from './data';
import { LANDING_SERVICE_IMAGES, LANDING_STYLIST_IMAGES } from './mockData';
import { fetchPopularServices, fetchServices, fetchStylists, type ApiService, type ApiStylist } from './backend';

// The backend has four categories; the screens know cut / beard / color / treatment.
const CATEGORY_MAP: Record<ApiService['category'], ServiceCategory> = {
  Cortes: 'cut',
  Combos: 'cut',
  Barba: 'beard',
  Tratamientos: 'treatment',
};

const DEFAULT_DESCRIPTION: Record<ServiceCategory, string> = {
  cut: 'Corte profesional adaptado a tu estilo, con acabado impecable.',
  beard: 'Cuidado y arreglo de barba con productos de calidad.',
  color: 'Coloración profesional con productos de calidad.',
  treatment: 'Tratamiento profesional para cuidar y renovar tu cabello.',
};

const STYLIST_COLORS = ['#E8734A', '#F2A950', '#8B9D77', '#6B4226', '#547C8A', '#9B6C91'];

// Demo images and texts are looked up by NAME: real ids are UUIDs, the demo ones were s1, st1...
const normalize = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const DEMO_SERVICE_BY_NAME = new Map(DEMO_SERVICES.map(s => [normalize(s.name), s]));
const DEMO_STYLIST_BY_NAME = new Map(DEMO_STYLISTS.map(s => [normalize(s.name), s]));
const ORIGINAL_SERVICE_IMAGES = { ...LANDING_SERVICE_IMAGES };
const ORIGINAL_STYLIST_IMAGES = { ...LANDING_STYLIST_IMAGES };
const CATEGORY_FALLBACK_IMAGE: Record<ServiceCategory, string> = {
  cut: ORIGINAL_SERVICE_IMAGES.s1,
  beard: ORIGINAL_SERVICE_IMAGES.s2,
  color: ORIGINAL_SERVICE_IMAGES.s4,
  treatment: ORIGINAL_SERVICE_IMAGES.s5,
};

function toService(api: ApiService): Service {
  const category = CATEGORY_MAP[api.category] ?? 'cut';
  const demo = DEMO_SERVICE_BY_NAME.get(normalize(api.name));
  LANDING_SERVICE_IMAGES[api.id] = (demo && ORIGINAL_SERVICE_IMAGES[demo.id]) || CATEGORY_FALLBACK_IMAGE[category];
  return {
    id: api.id,
    name: api.name,
    description: api.description || demo?.description || DEFAULT_DESCRIPTION[category],
    price: api.price,
    duration: api.duration,
    category,
    popular: false,
  };
}

function toStylist(api: ApiStylist, index: number): Stylist {
  const demo = DEMO_STYLIST_BY_NAME.get(normalize(api.fullName));
  const photo = api.photoUrl || (demo && ORIGINAL_STYLIST_IMAGES[demo.id]);
  if (photo) LANDING_STYLIST_IMAGES[api.id] = photo;
  else delete LANDING_STYLIST_IMAGES[api.id];
  const initials = api.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join('');
  return {
    id: api.id,
    name: api.fullName,
    specialty: api.specialty,
    // No reviews feature exists yet: 0 means "not rated" and the screens hide the stars.
    rating: api.rating ?? 0,
    reviewCount: 0,
    serviceIds: api.serviceIds,
    color: demo?.color ?? STYLIST_COLORS[index % STYLIST_COLORS.length],
    initials,
  };
}

let loading: Promise<void> | null = null;

// Fetches the catalog and replaces SERVICES / STYLISTS. Concurrent callers share one request.
export function loadCatalog(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      const [services, stylists, popular] = await Promise.all([
        fetchServices(),
        fetchStylists(),
        fetchPopularServices(6).catch(() => [] as ApiService[]),
      ]);
      const popularIds = new Set(popular.map(s => s.id));
      const mappedServices = services.map(toService).map(s => ({ ...s, popular: popularIds.has(s.id) }));
      SERVICES.splice(0, SERVICES.length, ...mappedServices);
      STYLISTS.splice(0, STYLISTS.length, ...stylists.map(toStylist));
    })().finally(() => {
      loading = null;
    });
  }
  return loading;
}
