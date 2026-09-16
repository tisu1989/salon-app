import type { BookingDraft } from "./booking-draft";
import type { ServiceItem } from "../services/service.types";
import type { StaffMember } from "../staff/staff.types";
import { formatTime } from "../../lib/date";
import styles from "./NewBookingWizard.module.css";

export function ConfirmStep({
  draft,
  service,
  staff,
}: {
  draft: BookingDraft;
  service: ServiceItem | undefined;
  staff: StaffMember | undefined;
}) {
  if (!draft.customer || !service || !staff || !draft.slot) {
    return <p className={styles.empty}>Something's missing - go back and finish each step.</p>;
  }

  return (
    <div>
      <div className={styles.summaryRow}>
        <span className={styles.optionMeta}>Customer</span>
        <span>
          {draft.customer.name} · {draft.customer.phone}
        </span>
      </div>
      <div className={styles.summaryRow}>
        <span className={styles.optionMeta}>Service</span>
        <span>
          {service.name} ({service.durationMinutes} min, ₹{service.price})
        </span>
      </div>
      <div className={styles.summaryRow}>
        <span className={styles.optionMeta}>Staff</span>
        <span>{staff.name}</span>
      </div>
      <div className={styles.summaryRow}>
        <span className={styles.optionMeta}>When</span>
        <span>
          {new Date(draft.slot.start).toLocaleDateString()} at {formatTime(draft.slot.start)}
        </span>
      </div>
    </div>
  );
}
