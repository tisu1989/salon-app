import { useState, type FormEvent } from "react";
import type { ServiceItem } from "./service.types";
import styles from "./ServiceMenuPage.module.css";

export interface ServiceFormValues {
  name: string;
  category: string;
  durationMinutes: string;
  price: string;
}

function toValues(service?: ServiceItem): ServiceFormValues {
  return {
    name: service?.name ?? "",
    category: service?.category ?? "",
    durationMinutes: service ? String(service.durationMinutes) : "",
    price: service ? service.price : "",
  };
}

export function ServiceForm({
  service,
  isSaving,
  error,
  onSubmit,
  onCancel,
}: {
  service?: ServiceItem;
  isSaving: boolean;
  error: boolean;
  onSubmit: (values: { name: string; category?: string; durationMinutes: number; price: number }) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<ServiceFormValues>(() => toValues(service));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const durationMinutes = Number(values.durationMinutes);
    const price = Number(values.price);
    if (!values.name.trim() || !durationMinutes || !price) return;
    onSubmit({
      name: values.name.trim(),
      ...(values.category.trim() && { category: values.category.trim() }),
      durationMinutes,
      price,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <div className={styles.field}>
          <label htmlFor="service-name">Name</label>
          <input
            id="service-name"
            type="text"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="service-category">Category</label>
          <input
            id="service-category"
            type="text"
            value={values.category}
            onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
            placeholder="optional"
          />
        </div>
      </div>
      <div className={styles.formRow}>
        <div className={styles.field}>
          <label htmlFor="service-duration">Duration (min)</label>
          <input
            id="service-duration"
            type="number"
            min={1}
            value={values.durationMinutes}
            onChange={(e) => setValues((v) => ({ ...v, durationMinutes: e.target.value }))}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="service-price">Price (₹)</label>
          <input
            id="service-price"
            type="number"
            min={0}
            step="0.01"
            value={values.price}
            onChange={(e) => setValues((v) => ({ ...v, price: e.target.value }))}
            required
          />
        </div>
      </div>

      {error && <p className={styles.error}>Couldn't save. Check the fields and try again.</p>}

      <div className={styles.formActions}>
        <button type="submit" className={styles.addButton} disabled={isSaving}>
          {isSaving ? "Saving…" : service ? "Save changes" : "Add service"}
        </button>
        <button type="button" className={styles.actionButton} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
