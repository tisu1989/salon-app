import { useState } from "react";
import { useListStaffQuery } from "./staff.api";
import { StaffAvailabilityRow } from "./StaffAvailabilityRow";
import { toDateInputValue } from "../../lib/date";
import styles from "./StaffAvailabilityPage.module.css";

export function StaffAvailabilityPage() {
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const { data: staff, isLoading, isError } = useListStaffQuery();

  const activeStaff = staff?.filter((member) => member.isActive) ?? [];

  return (
    <div>
      <div className={styles.header}>
        <h1>Staff availability</h1>
        <label className={styles.control}>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      {isLoading && <p className={styles.empty}>Loading…</p>}
      {isError && <p className={styles.empty}>Couldn't load staff. Try again.</p>}
      {!isLoading && !isError && activeStaff.length === 0 && (
        <p className={styles.empty}>No active staff on file.</p>
      )}

      <div className={styles.list}>
        {activeStaff.map((member) => (
          <StaffAvailabilityRow
            key={member.id}
            staffId={member.id}
            staffName={member.name}
            dateKey={date}
          />
        ))}
      </div>
    </div>
  );
}
