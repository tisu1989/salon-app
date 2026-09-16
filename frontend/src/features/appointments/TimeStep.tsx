import { useGetAvailabilityQuery } from "./appointment.api";
import type { AvailabilitySlot } from "./appointment.types";
import { formatTime, toDateInputValue } from "../../lib/date";
import styles from "./NewBookingWizard.module.css";

export function TimeStep({
  staffId,
  serviceId,
  date,
  selectedSlot,
  onDateChange,
  onSlotSelect,
}: {
  staffId: number;
  serviceId: number;
  date: string;
  selectedSlot: AvailabilitySlot | null;
  onDateChange: (date: string) => void;
  onSlotSelect: (slot: AvailabilitySlot) => void;
}) {
  const { data: slots, isFetching, isError } = useGetAvailabilityQuery({
    staffId,
    serviceId,
    date,
  });

  return (
    <div>
      <div className={styles.field}>
        <label htmlFor="booking-date">Date</label>
        <input
          id="booking-date"
          type="date"
          min={toDateInputValue(new Date())}
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        {isFetching && <p className={styles.empty}>Checking availability…</p>}
        {isError && <p className={styles.error}>Couldn't load availability. Try again.</p>}
        {!isFetching && !isError && slots?.length === 0 && (
          <p className={styles.empty}>No open slots this day. Try another date.</p>
        )}
        <div className={styles.slotGrid}>
          {slots?.map((slot) => (
            <button
              key={slot.start}
              type="button"
              className={`${styles.slotButton} ${
                selectedSlot?.start === slot.start ? styles.selected : ""
              }`}
              onClick={() => onSlotSelect(slot)}
            >
              {formatTime(slot.start)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
