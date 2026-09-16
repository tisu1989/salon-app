import { useState } from "react";
import { useAppSelector } from "../../app/hooks";
import { useListNotificationsQuery, useRetryNotificationMutation } from "./notification.api";
import type { NotificationStatus } from "./notification.types";
import { formatTime } from "../../lib/date";
import styles from "./NotificationLogPage.module.css";

const STATUS_STYLE: Record<NotificationStatus, { bg: string; fg: string }> = {
  PENDING: { bg: "var(--teal-soft)", fg: "var(--teal)" },
  SENT: { bg: "var(--ok-soft)", fg: "var(--ok)" },
  FAILED: { bg: "var(--crit-soft)", fg: "var(--crit)" },
};

function formatDateTime(iso: string): string {
  return `${new Date(iso).toLocaleDateString()} ${formatTime(iso)}`;
}

export function NotificationLogPage() {
  const isAdmin = useAppSelector((s) => s.auth.staff?.role === "ADMIN");
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | "">("");
  const { data: notifications, isLoading, isError } = useListNotificationsQuery({
    ...(statusFilter && { status: statusFilter }),
  });
  const [retry, { isLoading: retrying }] = useRetryNotificationMutation();
  const [retryError, setRetryError] = useState<number | null>(null);

  const handleRetry = async (id: number) => {
    setRetryError(null);
    try {
      await retry(id).unwrap();
    } catch {
      setRetryError(id);
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <h1>Notification log</h1>
        <label className={styles.control}>
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as NotificationStatus | "")}
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
          </select>
        </label>
      </div>

      {isLoading && <p className={styles.empty}>Loading…</p>}
      {isError && <p className={styles.empty}>Couldn't load notifications. Try again.</p>}
      {!isLoading && !isError && notifications?.length === 0 && (
        <p className={styles.empty}>No notifications to show.</p>
      )}

      <div className={styles.list}>
        {notifications?.map((n) => {
          const style = STATUS_STYLE[n.status];
          return (
            <div key={n.id} className={styles.card}>
              <div className={styles.row}>
                <span className={styles.pill} style={{ background: style.bg, color: style.fg }}>
                  {n.status}
                </span>
                <span>{n.type === "CONFIRMATION" ? "Confirmation" : "Reminder"}</span>
                <span className={styles.meta}>
                  {n.appointment.customer.name} · {n.appointment.service.name} with{" "}
                  {n.appointment.staff.name}
                </span>
              </div>
              <span className={styles.meta}>
                Queued {formatDateTime(n.createdAt)}
                {n.sentAt && ` · Sent ${formatDateTime(n.sentAt)}`}
                {n.attempts > 0 && ` · ${n.attempts} attempt${n.attempts === 1 ? "" : "s"}`}
              </span>
              {isAdmin && n.status === "FAILED" && (
                <button
                  type="button"
                  className={styles.retryButton}
                  disabled={retrying}
                  onClick={() => handleRetry(n.id)}
                >
                  Retry
                </button>
              )}
              {retryError === n.id && (
                <span className={styles.error}>Retry didn't go through. Try again.</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
