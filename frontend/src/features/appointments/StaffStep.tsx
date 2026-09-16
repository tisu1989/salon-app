import { useListStaffQuery } from "../staff/staff.api";
import styles from "./NewBookingWizard.module.css";

export function StaffStep({
  selectedId,
  onSelect,
}: {
  selectedId: number | null;
  onSelect: (staffId: number) => void;
}) {
  const { data: staff, isLoading } = useListStaffQuery();

  if (isLoading) return <p className={styles.empty}>Loading staff…</p>;

  return (
    <div className={styles.optionList}>
      {staff
        ?.filter((member) => member.isActive)
        .map((member) => (
          <button
            key={member.id}
            type="button"
            className={`${styles.optionCard} ${member.id === selectedId ? styles.selected : ""}`}
            onClick={() => onSelect(member.id)}
          >
            <span>{member.name}</span>
            <span className={styles.optionMeta}>{member.role}</span>
          </button>
        ))}
    </div>
  );
}
