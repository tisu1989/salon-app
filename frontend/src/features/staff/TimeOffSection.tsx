import { useState } from "react";
import { useListTimeOffQuery, useCreateTimeOffMutation, useDeleteTimeOffMutation } from "./staff.api";
import styles from "./StaffDetailPage.module.css";

export function TimeOffSection({ staffId, isAdmin }: { staffId: number; isAdmin: boolean }) {
  const { data: blocks, isLoading } = useListTimeOffQuery(staffId);
  const [createTimeOff, { isLoading: creating, error: createError }] = useCreateTimeOffMutation();
  const [deleteTimeOff] = useDeleteTimeOffMutation();

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");

  const handleCreate = async () => {
    if (!start || !end) return;
    await createTimeOff({
      staffId,
      startDateTime: new Date(start).toISOString(),
      endDateTime: new Date(end).toISOString(),
      ...(reason.trim() && { reason: reason.trim() }),
    }).unwrap();
    setStart("");
    setEnd("");
    setReason("");
  };

  const upcoming = [...(blocks ?? [])].sort(
    (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Time off</h2>

      {isLoading && <p className={styles.empty}>Loading…</p>}
      {!isLoading && upcoming.length === 0 && <p className={styles.empty}>No time off on file.</p>}

      <div className={styles.timeOffList}>
        {upcoming.map((block) => (
          <div key={block.id} className={styles.timeOffRow}>
            <span className={styles.timeOffMeta}>
              {new Date(block.startDateTime).toLocaleString()} –{" "}
              {new Date(block.endDateTime).toLocaleString()}
              {block.reason ? ` · ${block.reason}` : ""}
            </span>
            {isAdmin && (
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => deleteTimeOff({ staffId, timeOffId: block.id })}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label htmlFor="timeoff-start">From</label>
              <input
                id="timeoff-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="timeoff-end">To</label>
              <input
                id="timeoff-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="timeoff-reason">Reason (optional)</label>
            <input
              id="timeoff-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Leave, appointment"
            />
          </div>
          {createError && <p className={styles.error}>Couldn't add that block. Check the dates.</p>}
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={!start || !end || creating}
            onClick={handleCreate}
          >
            {creating ? "Adding…" : "Add time off"}
          </button>
        </>
      )}
    </section>
  );
}
