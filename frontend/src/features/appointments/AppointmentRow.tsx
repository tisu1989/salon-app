import { useState } from "react";
import { CustomerName } from "./CustomerName";
import { StatusPill } from "../../components/StatusPill";
import {
  useConfirmAppointmentMutation,
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
  staffName,
  showDate = false,
  hideCustomerName = false,
}: {
  appointment: Appointment;
  serviceName: string;
  /** Shown only on the salon-wide board, where rows span multiple staff members. */
  staffName?: string;
  /** For lists spanning more than one day (e.g. a customer's history), show the date too. */
  showDate?: boolean;
  /** On a customer's own profile, showing their name on every row of their own history is redundant. */
  hideCustomerName?: boolean;
}) {
  const [confirm, { isLoading: confirming }] = useConfirmAppointmentMutation();
  const [cancel, { isLoading: cancelling }] = useCancelAppointmentMutation();
  const [complete, { isLoading: completing }] = useCompleteAppointmentMutation();
  const [noShow, { isLoading: markingNoShow }] = useNoShowAppointmentMutation();
  const [error, setError] = useState<string | null>(null);

  const busy = confirming || cancelling || completing || markingNoShow;
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
          {showDate && `${new Date(appointment.startTime).toLocaleDateString()} `}
          {formatTime(appointment.startTime)}–{formatTime(appointment.endTime)}
        </span>
        {!hideCustomerName && (
          <span className={styles.customer}>
            <CustomerName customerId={appointment.customerId} />
          </span>
        )}
        <span className={styles.service}>{serviceName}</span>
        {staffName && <span className={styles.service}>{staffName}</span>}
        <StatusPill status={appointment.status} />
      </div>

      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.includes("confirm") && (
            <button
              type="button"
              className={styles.actionButton}
              disabled={busy}
              onClick={() => run(() => confirm(appointment.id).unwrap())}
            >
              Confirm
            </button>
          )}
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
