import { useState } from "react";
import { useAppSelector } from "../../app/hooks";
import {
  useListServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeactivateServiceMutation,
} from "./service.api";
import { ServiceForm } from "./ServiceForm";
import type { ServiceItem } from "./service.types";
import styles from "./ServiceMenuPage.module.css";

export function ServiceMenuPage() {
  const isAdmin = useAppSelector((s) => s.auth.staff?.role === "ADMIN");
  const { data: services, isLoading, isError } = useListServicesQuery();

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [createService, { isLoading: saving, error: createError }] = useCreateServiceMutation();
  const [updateService, { isLoading: updating, error: updateError }] = useUpdateServiceMutation();
  const [deactivateService] = useDeactivateServiceMutation();

  const handleCreate = async (values: {
    name: string;
    category?: string;
    durationMinutes: number;
    price: number;
  }) => {
    await createService(values).unwrap();
    setCreating(false);
  };

  const handleUpdate = async (
    id: number,
    values: { name: string; category?: string; durationMinutes: number; price: number },
  ) => {
    await updateService({ id, ...values }).unwrap();
    setEditingId(null);
  };

  const handleDeactivate = async (service: ServiceItem) => {
    if (!window.confirm(`Remove "${service.name}" from the menu? It stays on past bookings.`)) {
      return;
    }
    await deactivateService(service.id).unwrap();
  };

  return (
    <div>
      <div className={styles.header}>
        <h1>Services</h1>
        {isAdmin && !creating && (
          <button type="button" className={styles.addButton} onClick={() => setCreating(true)}>
            + Add service
          </button>
        )}
      </div>

      {creating && (
        <ServiceForm
          isSaving={saving}
          error={Boolean(createError)}
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      {isLoading && <p className={styles.empty}>Loading services…</p>}
      {isError && <p className={styles.empty}>Couldn't load services. Try again.</p>}
      {!isLoading && !isError && services?.length === 0 && (
        <p className={styles.empty}>No services on the menu yet.</p>
      )}

      <div className={styles.grid}>
        {services?.map((service) =>
          editingId === service.id ? (
            <ServiceForm
              key={service.id}
              service={service}
              isSaving={updating}
              error={Boolean(updateError)}
              onSubmit={(values) => handleUpdate(service.id, values)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={service.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.name}>{service.name}</span>
                {service.category && <span className={styles.category}>{service.category}</span>}
              </div>
              <span className={styles.meta}>
                {service.durationMinutes} min · ₹{service.price}
              </span>
              {isAdmin && (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => setEditingId(service.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.danger}`}
                    onClick={() => handleDeactivate(service)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
