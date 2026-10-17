import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, PageHeader } from "../ui";
import {
  createService,
  getServices,
  toggleStatus,
  updateService,
  type Service,
  type ServiceInput,
  type ServiceStatus,
} from "../services/service-catalog";
import ServiceFormModal from "./admin-services/ServiceFormModal";

type ServiceFilter = "TODOS" | ServiceStatus;
type Notice = { type: "success" | "error"; message: string } | null;

const filterLabels: Record<ServiceFilter, string> = {
  TODOS: "Todos",
  ACTIVO: "Activos",
  INACTIVO: "Inactivos",
};

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

function getRequestErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "status" in error && error.status === 403) {
    return "Acceso Denegado: No tienes permisos para realizar esta acción.";
  }
  return error instanceof Error ? error.message : fallback;
}

export default function AdminServices({ onBack }: { onBack: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [filter, setFilter] = useState<ServiceFilter>("TODOS");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [serviceToDeactivate, setServiceToDeactivate] = useState<Service | null>(null);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const loadServices = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      setServices(await getServices());
    } catch (error) {
      const message = getRequestErrorMessage(error, "No fue posible cargar los servicios.");
      setLoadError(message);
      if (typeof error === "object" && error !== null && "status" in error && error.status === 403) {
        setNotice({ type: "error", message });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), notice.type === "error" ? 5000 : 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!isFormOpen && !serviceToDeactivate) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving && !pendingStatusId) {
        setIsFormOpen(false);
        setServiceToDeactivate(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFormOpen, isSaving, pendingStatusId, serviceToDeactivate]);

  const visibleServices = useMemo(
    () => services.filter(service => filter === "TODOS" || service.status === filter),
    [filter, services],
  );

  const openForm = (service: Service | null) => {
    setEditingService(service);
    setSubmitError("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setIsFormOpen(false);
    setEditingService(null);
    setSubmitError("");
  };

  const saveService = async (input: ServiceInput) => {
    setIsSaving(true);
    setSubmitError("");
    try {
      const savedService = editingService
        ? await updateService(editingService.id, input)
        : await createService(input);
      setServices(current => editingService
        ? current.map(service => service.id === savedService.id ? savedService : service)
        : [...current, savedService]);
      setIsFormOpen(false);
      setEditingService(null);
      setNotice({
        type: "success",
        message: editingService ? "Servicio actualizado correctamente." : "Servicio creado correctamente.",
      });
    } catch (error) {
      const message = getRequestErrorMessage(error, "No fue posible guardar el servicio.");
      setSubmitError(message);
      if (typeof error === "object" && error !== null && "status" in error && error.status === 403) {
        setNotice({ type: "error", message });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = async (service: Service, newStatus: ServiceStatus) => {
    setPendingStatusId(service.id);
    try {
      const updatedService = await toggleStatus(service.id, newStatus);
      setServices(current => current.map(item => item.id === updatedService.id ? updatedService : item));
      setServiceToDeactivate(null);
      setNotice({
        type: "success",
        message: newStatus === "INACTIVO"
          ? "Servicio desactivado correctamente."
          : "Servicio reactivado correctamente.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: getRequestErrorMessage(error, "No fue posible actualizar el estado del servicio."),
      });
    } finally {
      setPendingStatusId(null);
    }
  };

  return (
    <main className="flex h-full flex-col overflow-y-auto bg-[#FBF3E9]">
      <header className="bg-white px-3 pt-3 shadow-[0_2px_12px_rgba(107,66,38,0.06)] sm:px-5 sm:pt-5">
        <PageHeader
          action={
            <Button onClick={() => openForm(null)} size="sm">
              + Nuevo Servicio
            </Button>
          }
          onBack={onBack}
          subtitle={`${services.length} ${services.length === 1 ? "servicio registrado" : "servicios registrados"}`}
          title="Gestión de Servicios"
        />
      </header>

      <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 md:px-8 md:py-7">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-black text-[#6B4226]">Catálogo</h2>
            <p className="mt-1 text-sm text-[#A67850]">Administra los servicios disponibles para tus clientes.</p>
          </div>
          <div aria-label="Filtrar servicios por estado" className="inline-flex w-full rounded-2xl bg-[#F5E6D3] p-1 sm:w-auto" role="tablist">
            {(["TODOS", "ACTIVO", "INACTIVO"] as const).map(tab => {
              const count = tab === "TODOS" ? services.length : services.filter(service => service.status === tab).length;
              return (
                <button
                  aria-selected={filter === tab}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors sm:flex-none sm:px-4 ${
                    filter === tab ? "bg-[#E8734A] text-white shadow-sm" : "text-[#8B5E3C] hover:bg-white/60"
                  }`}
                  key={tab}
                  onClick={() => setFilter(tab)}
                  role="tab"
                  type="button"
                >
                  {filterLabels[tab]} <span className="ml-1 opacity-75">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {notice && (
          <div
            className={`mb-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${
              notice.type === "success" ? "bg-[#EAF2E3] text-[#4A7C59]" : "bg-[#FFF5F5] text-[#A84A3A]"
            }`}
            role={notice.type === "error" ? "alert" : "status"}
          >
            {notice.message}
            <button aria-label="Cerrar notificación" onClick={() => setNotice(null)} type="button">×</button>
          </div>
        )}

        {isLoading ? (
          <div aria-live="polite" className="flex min-h-64 flex-col items-center justify-center text-[#8B5E3C]">
            <span aria-hidden="true" className="h-10 w-10 animate-spin rounded-full border-4 border-[#EDD8BC] border-t-[#E8734A]" />
            <p className="mt-4 text-sm font-semibold">Cargando servicios...</p>
          </div>
        ) : loadError ? (
          <div className="rounded-[24px] border border-[#F0CCC8] bg-white px-6 py-10 text-center" role="alert">
            <h3 className="font-display text-lg font-black text-[#6B4226]">No se pudieron cargar los servicios</h3>
            <p className="mt-2 text-sm text-[#A84A3A]">{loadError}</p>
            <button
              className="mt-5 rounded-xl bg-[#E8734A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#C85A31]"
              onClick={() => void loadServices()}
              type="button"
            >
              Reintentar
            </button>
          </div>
        ) : visibleServices.length === 0 ? (
          <div className="rounded-[24px] border-2 border-dashed border-[#EDD8BC] bg-white px-6 py-12 text-center">
            <span aria-hidden="true" className="text-4xl">✂️</span>
            <h3 className="mt-3 font-display text-lg font-black text-[#6B4226]">
              {filter === "TODOS" ? "Aún no hay servicios" : `No hay servicios ${filter === "ACTIVO" ? "activos" : "inactivos"}`}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#A67850]">
              {filter === "TODOS"
                ? "Crea el primer servicio para empezar a completar tu catálogo."
                : "Cuando cambie el estado de un servicio, aparecerá en esta lista."}
            </p>
            {filter === "TODOS" && (
              <button
                className="mt-5 rounded-xl bg-[#E8734A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#C85A31]"
                onClick={() => openForm(null)}
                type="button"
              >
                + Nuevo Servicio
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[20px] border border-[#EDD8BC] bg-white shadow-[0_4px_24px_-4px_rgba(107,66,38,0.12)]">
            <table className="w-full min-w-[790px] border-collapse text-left">
              <thead className="bg-[#F8F0E6]">
                <tr>
                  {["Nombre", "Categoría", "Duración", "Precio", "Estado", "Acciones"].map(label => (
                    <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-[#8B5E3C]" key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleServices.map(service => (
                  <tr className="border-t border-[#F5E6D3] transition-colors hover:bg-[#FFFCF8]" key={service.id}>
                    <td className="px-4 py-4 font-bold text-[#6B4226]">{service.name}</td>
                    <td className="px-4 py-4 text-sm text-[#8B5E3C]">{service.category}</td>
                    <td className="px-4 py-4 text-sm font-medium text-[#6B4226]">{service.duration} min</td>
                    <td className="px-4 py-4 text-sm font-bold text-[#E8734A]">{formatCOP(service.price)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        service.status === "ACTIVO" ? "bg-[#EAF2E3] text-[#4A7C59]" : "bg-[#FFF3CD] text-[#8B5E3C]"
                      }`}>
                        {service.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-lg bg-[#FBF3E9] px-3 py-2 text-xs font-bold text-[#6B4226] transition hover:bg-[#F5E6D3]"
                          onClick={() => openForm(service)}
                          type="button"
                        >
                          Editar
                        </button>
                        {service.status === "ACTIVO" ? (
                          <button
                            className="rounded-lg bg-[#FFF5F5] px-3 py-2 text-xs font-bold text-[#C45C4C] transition hover:bg-[#FFE8E8] disabled:opacity-50"
                            disabled={pendingStatusId === service.id}
                            onClick={() => setServiceToDeactivate(service)}
                            type="button"
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            className="rounded-lg bg-[#EAF2E3] px-3 py-2 text-xs font-bold text-[#4A7C59] transition hover:bg-[#DDEFD9] disabled:opacity-50"
                            disabled={pendingStatusId === service.id}
                            onClick={() => void changeStatus(service, "ACTIVO")}
                            type="button"
                          >
                            {pendingStatusId === service.id ? "Actualizando..." : "Reactivar"}
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
        <ServiceFormModal
          isSaving={isSaving}
          onClose={closeForm}
          onSave={input => void saveService(input)}
          service={editingService}
          submitError={submitError}
        />
      )}

      {serviceToDeactivate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B1B12]/45 p-4 backdrop-blur-sm"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !pendingStatusId) setServiceToDeactivate(null);
          }}
        >
          <section
            aria-labelledby="deactivate-title"
            aria-modal="true"
            className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl"
            role="dialog"
          >
            <h2 className="font-display text-xl font-black text-[#6B4226]" id="deactivate-title">¿Desactivar servicio?</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#8B5E3C]">
              <strong>{serviceToDeactivate.name}</strong> dejará de estar disponible en el catálogo para tus clientes.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-xl border border-[#EDD8BC] px-5 py-2.5 text-sm font-bold text-[#6B4226] hover:bg-[#FBF3E9] disabled:opacity-50"
                disabled={pendingStatusId === serviceToDeactivate.id}
                onClick={() => setServiceToDeactivate(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-xl bg-[#C45C4C] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A84A3A] disabled:opacity-50"
                disabled={pendingStatusId === serviceToDeactivate.id}
                onClick={() => void changeStatus(serviceToDeactivate, "INACTIVO")}
                type="button"
              >
                {pendingStatusId === serviceToDeactivate.id ? "Desactivando..." : "Sí, desactivar"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
