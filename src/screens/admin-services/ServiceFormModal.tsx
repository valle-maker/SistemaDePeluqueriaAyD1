import { useEffect, useState, type FormEvent } from "react";
import {
  serviceCategories,
  validateServiceInput,
  type Service,
  type ServiceInput,
  type ServiceInputErrors,
} from "../../services/service-catalog";

interface ServiceFormModalProps {
  service: Service | null;
  isSaving: boolean;
  submitError: string;
  onClose: () => void;
  onSave: (input: ServiceInput) => void;
}

type FormValues = { name: string; category: string; duration: string; price: string };

const emptyForm: FormValues = { name: "", category: "", duration: "", price: "" };

export default function ServiceFormModal({
  service,
  isSaving,
  submitError,
  onClose,
  onSave,
}: ServiceFormModalProps) {
  const [form, setForm] = useState<FormValues>(() => service
    ? {
        name: service.name,
        category: service.category,
        duration: String(service.duration),
        price: String(service.price),
      }
    : emptyForm);
  const [errors, setErrors] = useState<ServiceInputErrors>({});

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  const updateField = (field: keyof FormValues, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: ServiceInput = {
      name: form.name,
      category: form.category,
      duration: Number(form.duration),
      price: Number(form.price),
    };
    const nextErrors = validateServiceInput(input);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;
    onSave(input);
  };

  const fieldClass = (hasError: boolean) =>
    `mt-1 w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-[#6B4226] outline-none transition focus:border-[#E8734A] ${
      hasError ? "border-[#C45C4C]" : "border-[#EDD8BC]"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B1B12]/45 p-4 backdrop-blur-sm"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <section
        aria-labelledby="service-form-title"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[24px] bg-white p-5 shadow-2xl sm:p-7"
        role="dialog"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#A67850]">Catálogo de servicios</p>
            <h2 id="service-form-title" className="mt-1 font-display text-2xl font-black text-[#6B4226]">
              {service ? "Editar servicio" : "Nuevo servicio"}
            </h2>
            <p className="mt-1 text-sm text-[#A67850]">Completa los datos para mantener actualizado tu catálogo.</p>
          </div>
          <button
            aria-label="Cerrar formulario"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FBF3E9] text-xl text-[#6B4226] hover:bg-[#F5E6D3] disabled:opacity-50"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="space-y-4" noValidate onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-semibold text-[#6B4226]" htmlFor="service-name">Nombre</label>
            <input
              autoFocus
              className={fieldClass(Boolean(errors.name))}
              id="service-name"
              maxLength={80}
              onChange={event => updateField("name", event.target.value)}
              placeholder="Ej. Corte clásico"
              value={form.name}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "service-name-error" : undefined}
            />
            {errors.name && <p className="mt-1 text-xs text-[#C45C4C]" id="service-name-error">{errors.name}</p>}
          </div>

          <div>
            <label className="text-sm font-semibold text-[#6B4226]" htmlFor="service-category">Categoría</label>
            <select
              className={fieldClass(Boolean(errors.category))}
              id="service-category"
              onChange={event => updateField("category", event.target.value)}
              value={form.category}
              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? "service-category-error" : undefined}
            >
              <option value="">Selecciona una categoría</option>
              {serviceCategories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
            {errors.category && <p className="mt-1 text-xs text-[#C45C4C]" id="service-category-error">{errors.category}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-[#6B4226]" htmlFor="service-duration">Duración (minutos)</label>
              <input
                className={fieldClass(Boolean(errors.duration))}
                id="service-duration"
                inputMode="numeric"
                max="240"
                min="10"
                onChange={event => updateField("duration", event.target.value)}
                placeholder="45"
                step="1"
                type="number"
                value={form.duration}
                aria-invalid={Boolean(errors.duration)}
                aria-describedby={errors.duration ? "service-duration-error" : undefined}
              />
              {errors.duration && <p className="mt-1 text-xs text-[#C45C4C]" id="service-duration-error">{errors.duration}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-[#6B4226]" htmlFor="service-price">Precio (COP)</label>
              <input
                className={fieldClass(Boolean(errors.price))}
                id="service-price"
                inputMode="decimal"
                min="0.01"
                onChange={event => updateField("price", event.target.value)}
                placeholder="25000"
                step="any"
                type="number"
                value={form.price}
                aria-invalid={Boolean(errors.price)}
                aria-describedby={errors.price ? "service-price-error" : undefined}
              />
              {errors.price && <p className="mt-1 text-xs text-[#C45C4C]" id="service-price-error">{errors.price}</p>}
            </div>
          </div>

          {submitError && (
            <p className="rounded-xl bg-[#FFF5F5] px-4 py-3 text-sm text-[#A84A3A]" role="alert">
              {submitError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              className="rounded-xl border border-[#EDD8BC] px-5 py-3 text-sm font-bold text-[#6B4226] transition hover:bg-[#FBF3E9] disabled:opacity-50"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="rounded-xl bg-[#E8734A] px-5 py-3 text-sm font-bold text-white shadow-[0_4px_16px_-2px_rgba(232,115,74,0.3)] transition hover:bg-[#C85A31] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Guardando..." : service ? "Guardar cambios" : "Crear servicio"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
