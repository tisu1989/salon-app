import { useState } from "react";
import {
  useDownloadExportMutation,
  useListExportsQuery,
  useRequestAppointmentsExportMutation,
} from "./export.api";
import type { ExportEntry, ExportStatus } from "./export.types";
import { formatTime } from "../../lib/date";
import styles from "./ExportsPage.module.css";

const STATUS_STYLE: Record<ExportStatus, { bg: string; fg: string }> = {
  PENDING: { bg: "var(--teal-soft)", fg: "var(--teal)" },
  DONE: { bg: "var(--ok-soft)", fg: "var(--ok)" },
  FAILED: { bg: "var(--crit-soft)", fg: "var(--crit)" },
};

const STATUS_LABEL: Record<ExportStatus, string> = {
  PENDING: "Preparing…",
  DONE: "Ready",
  FAILED: "Failed",
};

function formatDateTime(iso: string): string {
  return `${new Date(iso).toLocaleDateString()} ${formatTime(iso)}`;
}

export function ExportsPage() {
  // Polling, not a one-off fetch - this is the "check back and it's flipped to Ready"
  // behavior from the plan, without the admin needing to manually refresh the page.
  const { data: exports, isLoading, isError } = useListExportsQuery(undefined, {
    pollingInterval: 5000,
  });
  const [requestExport, { isLoading: requesting }] = useRequestAppointmentsExportMutation();
  const [downloadExport] = useDownloadExportMutation();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async () => {
    setError(null);
    try {
      await requestExport({ date: new Date().toISOString() }).unwrap();
    } catch {
      setError("Couldn't start the export. Try again.");
    }
  };

  const handleDownload = async (entry: ExportEntry) => {
    if (!entry.fileName) return;
    setError(null);
    setDownloadingId(entry.id);
    try {
      const blob = await downloadExport(entry.id).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = entry.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't download that file. Try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <h1>Exports</h1>
        <button
          type="button"
          className={styles.requestButton}
          disabled={requesting}
          onClick={handleRequest}
        >
          {requesting ? "Starting…" : "Export today's appointments"}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {isLoading && <p className={styles.empty}>Loading…</p>}
      {isError && <p className={styles.empty}>Couldn't load exports. Try again.</p>}
      {!isLoading && !isError && exports?.length === 0 && (
        <p className={styles.empty}>No exports yet - request one above.</p>
      )}

      <div className={styles.list}>
        {exports?.map((e) => {
          const style = STATUS_STYLE[e.status];
          return (
            <div key={e.id} className={styles.card}>
              <div className={styles.row}>
                <span className={styles.pill} style={{ background: style.bg, color: style.fg }}>
                  {STATUS_LABEL[e.status]}
                </span>
                <span>Today's appointments</span>
              </div>
              <span className={styles.meta}>
                Requested {formatDateTime(e.createdAt)}
                {e.completedAt && ` · Finished ${formatDateTime(e.completedAt)}`}
              </span>
              {e.status === "FAILED" && e.error && (
                <span className={styles.error}>{e.error}</span>
              )}
              {e.status === "DONE" && (
                <button
                  type="button"
                  className={styles.downloadButton}
                  disabled={downloadingId === e.id}
                  onClick={() => handleDownload(e)}
                >
                  {downloadingId === e.id ? "Downloading…" : "Download"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
