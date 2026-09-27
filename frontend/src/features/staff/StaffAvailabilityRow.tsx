import { useGetWorkingHoursQuery, useListTimeOffQuery } from "./staff.api";
import { computeAvailability } from "./staff-availability";
import { formatTime } from "../../lib/date";
import styles from "./StaffAvailabilityPage.module.css";

export function StaffAvailabilityRow({
  staffId,
  staffName,
  dateKey,
}: {
  staffId: number;
  staffName: string;
  dateKey: string;
}) {
  const { data: workingHours, isLoading: loadingHours } = useGetWorkingHoursQuery(staffId);
  const { data: timeOff, isLoading: loadingTimeOff } = useListTimeOffQuery(staffId);

  if (loadingHours || loadingTimeOff) {
    return (
      <div className={styles.row}>
        <span className={styles.name}>{staffName}</span>
        <span className={styles.detail}>Loading…</span>
      </div>
    );
  }

  const status = computeAvailability(dateKey, workingHours ?? [], timeOff ?? []);

  return (
    <div className={styles.row}>
      <span className={styles.name}>{staffName}</span>
      {status.kind === "working" && (
        <span className={`${styles.pill} ${styles.working}`}>
          Working {status.startTime}–{status.endTime}
        </span>
      )}
      {status.kind === "not-scheduled" && (
        <span className={`${styles.pill} ${styles.notScheduled}`}>Not scheduled</span>
      )}
      {status.kind === "on-leave" && (
        <>
          <span className={`${styles.pill} ${styles.onLeave}`}>On leave</span>
          <span className={styles.detail}>
            {formatTime(status.startDateTime)}–{formatTime(status.endDateTime)}
            {status.reason && ` · ${status.reason}`}
          </span>
        </>
      )}
    </div>
  );
}
