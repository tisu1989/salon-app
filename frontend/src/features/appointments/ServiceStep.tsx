import { useListServicesQuery } from "../services/service.api";
import styles from "./NewBookingWizard.module.css";

export function ServiceStep({
  selectedId,
  onSelect,
}: {
  selectedId: number | null;
  onSelect: (serviceId: number) => void;
}) {
  const { data: services, isLoading } = useListServicesQuery();

  if (isLoading) return <p className={styles.empty}>Loading services…</p>;

  return (
    <div className={styles.optionList}>
      {services?.map((service) => (
        <button
          key={service.id}
          type="button"
          className={`${styles.optionCard} ${service.id === selectedId ? styles.selected : ""}`}
          onClick={() => onSelect(service.id)}
        >
          <span>
            {service.name}
            {service.category ? ` · ${service.category}` : ""}
          </span>
          <span className={styles.optionMeta}>
            {service.durationMinutes} min · ₹{service.price}
          </span>
        </button>
      ))}
    </div>
  );
}
