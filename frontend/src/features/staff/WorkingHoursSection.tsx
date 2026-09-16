import { useEffect, useState } from "react";
import { useGetWorkingHoursQuery, useSetWorkingHoursMutation } from "./staff.api";
import type { WorkingHoursRuleInput } from "./staff.api";
import styles from "./StaffDetailPage.module.css";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DayState {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

function defaultDays(): DayState[] {
  return DAY_LABELS.map(() => ({ enabled: false, startTime: "09:00", endTime: "18:00" }));
}

export function WorkingHoursSection({ staffId, isAdmin }: { staffId: number; isAdmin: boolean }) {
  const { data: rules, isLoading } = useGetWorkingHoursQuery(staffId);
  const [setWorkingHours, { isLoading: saving, error, isSuccess }] = useSetWorkingHoursMutation();
  const [days, setDays] = useState<DayState[]>(defaultDays);

  useEffect(() => {
    if (!rules) return;
    const next = defaultDays();
    for (const rule of rules) {
      next[rule.dayOfWeek] = { enabled: true, startTime: rule.startTime, endTime: rule.endTime };
    }
    setDays(next);
  }, [rules]);

  const updateDay = (index: number, patch: Partial<DayState>) => {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const handleSave = async () => {
    const activeRules: WorkingHoursRuleInput[] = days
      .map((d, dayOfWeek) => ({ ...d, dayOfWeek }))
      .filter((d) => d.enabled)
      .map((d) => ({ dayOfWeek: d.dayOfWeek, startTime: d.startTime, endTime: d.endTime }));
    await setWorkingHours({ staffId, rules: activeRules }).unwrap();
  };

  if (isLoading) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Working hours</h2>
        <p className={styles.empty}>Loading…</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Working hours</h2>

      <div className={styles.hoursGrid}>
        {DAY_LABELS.map((label, index) => {
          const day = days[index]!;
          return (
            <div key={label} className={styles.dayRow}>
              <input
                type="checkbox"
                id={`day-${label}`}
                checked={day.enabled}
                disabled={!isAdmin}
                onChange={(e) => updateDay(index, { enabled: e.target.checked })}
              />
              <label htmlFor={`day-${label}`} className={styles.dayLabel}>
                {label}
              </label>
              <input
                type="time"
                value={day.startTime}
                disabled={!isAdmin || !day.enabled}
                onChange={(e) => updateDay(index, { startTime: e.target.value })}
              />
              <span className={styles.empty}>to</span>
              <input
                type="time"
                value={day.endTime}
                disabled={!isAdmin || !day.enabled}
                onChange={(e) => updateDay(index, { endTime: e.target.value })}
              />
            </div>
          );
        })}
      </div>

      {error && <p className={styles.error}>Couldn't save the schedule. Check start/end times.</p>}
      {isSuccess && <p className={styles.success}>Schedule saved.</p>}

      {isAdmin && (
        <button type="button" className={styles.button} disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save schedule"}
        </button>
      )}
    </section>
  );
}
