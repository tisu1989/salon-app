import { useState } from "react";
import { CustomerName } from "./CustomerName";
import { StatusPill } from "../../components/StatusPill";
import {
  useCancelAppointmentMutation,
  useCompleteAppointmentMutation,
  useNoShowAppointmentMutation,
} from "./appointment.api";
import { REACHABLE_ACTIONS, type Appointment } from "./appointment.types";
import { formatTime } from "../../lib/date";
import styles from "./TodayBoardPage.module.css";

export function AppointmentRow({
  appointment,
  serviceName,
}: {
  appointment: Appointment;
  serviceName: string;
}) {
  const [cancel, { isLoading: cancelling }] = useCancelAppointmentMutation();
  const [complete, { isLoading: completing }] = useCompleteAppointmentMutation();
  const [noShow, { isLoading: markingNoShow }] = useNoShowAppointmentMutation();
  const [error, setError] = useState<string | null>(null);

  const busy = cancelling || completing || markingNoShow;
  const actions = REACHABLE_ACTIONS[appointment.status];

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch {
      setError("That didn't go through. Try again.");
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <span className={styles.time}>
          {formatTime(appointment.startTime)}–{formatTime(appointment.endTime)}
        </span>
        <span className={styles.customer}>
          <CustomerName customerId={appointment.customerId} />
        </span>
        <span className={styles.service}>{serviceName}</span>
        <StatusPill status={appointment.status} />
      </div>

      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.includes("complete") && (
            <button
              type="button"
              className={styles.actionButton}
              disabled={busy}
              onClick={() => run(() => complete(appointment.id).unwrap())}
            >
              Mark completed
            </button>
          )}
          {actions.includes("no-show") && (
            <button
              type="button"
              className={styles.actionButton}
              disabled={busy}
              onClick={() => run(() => noShow(appointment.id).unwrap())}
            >
              No-show
            </button>
          )}
          {actions.includes("cancel") && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.danger}`}
              disabled={busy}
              onClick={() => run(() => cancel(appointment.id).unwrap())}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {error && <span style={{ color: "var(--crit)", fontSize: "0.85rem" }}>{error}</span>}
    </div>
  );
}
