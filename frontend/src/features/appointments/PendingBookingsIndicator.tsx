import { useEffect, useState } from "react";
import { useBookAppointmentMutation } from "./appointment.api";
import {
  getQueue,
  isNetworkError,
  markConflict,
  removeFromQueue,
  type QueuedBooking,
} from "./bookingQueue";
import { formatTime } from "../../lib/date";
import styles from "./PendingBookingsIndicator.module.css";

/**
 * Mounted once in AppShell, same pattern as ChatWidget - a small floating badge that
 * shows whenever a booking is waiting to send (made while offline) or needs the staff
 * member's attention (its slot got taken before it could sync). Automatically retries
 * on load and whenever the browser's "back online" event fires.
 */
export function PendingBookingsIndicator() {
  const [queue, setQueue] = useState<QueuedBooking[]>(() => getQueue());
  const [isOpen, setIsOpen] = useState(false);
  const [bookAppointment] = useBookAppointmentMutation();

  useEffect(() => {
    const syncOne = async (item: QueuedBooking) => {
      try {
        await bookAppointment(item.request).unwrap();
        removeFromQueue(item.localId);
        setQueue(getQueue());
      } catch (err) {
        if (isNetworkError(err)) {
          return; // still offline - leave it queued, try again next time
        }
        // A real rejection (most likely the slot's gone) - stop retrying this one
        // automatically and flag it for a human to deal with.
        markConflict(item.localId);
        setQueue(getQueue());
      }
    };

    const syncAll = () => {
      for (const item of getQueue().filter((b) => !b.conflict)) {
        void syncOne(item);
      }
    };

    syncAll(); // catch up on anything queued since the last visit
    window.addEventListener("online", syncAll);
    return () => window.removeEventListener("online", syncAll);
    // Only ever wire this up once - bookAppointment's identity is stable from RTK Query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (queue.length === 0) {
    return null;
  }

  const conflictCount = queue.filter((b) => b.conflict).length;

  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.badge} onClick={() => setIsOpen((v) => !v)}>
        {conflictCount > 0
          ? `⚠ ${conflictCount} need${conflictCount === 1 ? "s" : ""} attention`
          : `⏳ ${queue.length} booking${queue.length === 1 ? "" : "s"} waiting to send`}
      </button>

      {isOpen && (
        <div className={styles.panel}>
          {queue.map((item) => (
            <div key={item.localId} className={styles.item}>
              <div className={styles.itemTitle}>
                {item.customerName} · {item.serviceName} with {item.staffName}
              </div>
              <div className={styles.itemMeta}>{formatTime(item.request.startTime)}</div>
              {item.conflict ? (
                <>
                  <p className={styles.conflictMsg}>
                    That time's been taken - please book a new time for this customer.
                  </p>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => {
                      removeFromQueue(item.localId);
                      setQueue(getQueue());
                    }}
                  >
                    Remove
                  </button>
                </>
              ) : (
                <p className={styles.waitingMsg}>Waiting to send…</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
