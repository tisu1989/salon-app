import type { AppointmentStatus } from "../features/appointments/appointment.types";
import styles from "./StatusPill.module.css";

const STATUS_STYLE: Record<AppointmentStatus, { bg: string; fg: string; label: string }> = {
  BOOKED: { bg: "var(--teal-soft)", fg: "var(--teal)", label: "Booked" },
  CONFIRMED: { bg: "var(--ok-soft)", fg: "var(--ok)", label: "Confirmed" },
  CANCELLED: { bg: "var(--crit-soft)", fg: "var(--crit)", label: "Cancelled" },
  COMPLETED: { bg: "var(--ochre-soft)", fg: "var(--ochre)", label: "Completed" },
  NO_SHOW: { bg: "var(--crit-soft)", fg: "var(--crit)", label: "No-show" },
};

export function StatusPill({ status }: { status: AppointmentStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <span className={styles.pill} style={{ background: style.bg, color: style.fg }}>
      {style.label}
    </span>
  );
}
