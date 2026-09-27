import { useState } from "react";
import { useGetAnalyticsSummaryQuery } from "./analytics.api";
import { BarChart, type BarChartPoint } from "../../components/BarChart";
import styles from "./DashboardPage.module.css";

/** "YYYY-MM-DD" -> the day-of-month number, parsed as a local date so it never shifts a day
 *  depending on the viewer's timezone (unlike `new Date("2026-09-21")`, which is UTC midnight). */
function dayLabel(dateKey: string): string {
  const day = dateKey.split("-")[2];
  return day ? String(Number(day)) : dateKey;
}

/** 0-23 -> "12a", "9a", "12p", "3p" - compact enough for 24 bars in a row. */
function hourLabel(hour: number): string {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

function noShowSeverity(rate: number): "ok" | "warn" | "crit" {
  if (rate < 0.1) return "ok";
  if (rate < 0.25) return "warn";
  return "crit";
}

export function DashboardPage() {
  const [days, setDays] = useState(7);
  const { data, isLoading, isError } = useGetAnalyticsSummaryQuery(days);

  const totalAppointments = data
    ? Object.values(data.statusBreakdown).reduce((sum, n) => sum + n, 0)
    : 0;

  const bookingsByDay: BarChartPoint[] =
    data?.bookingsByDay.map((d) => ({ label: dayLabel(d.date), value: d.count })) ?? [];
  const busiestHours: BarChartPoint[] =
    data?.busiestHours.map((h) => ({ label: hourLabel(h.hour), value: h.count })) ?? [];

  return (
    <div>
      <div className={styles.header}>
        <h1>Dashboard</h1>
        <label className={styles.control}>
          Range
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </label>
      </div>

      {isLoading && <p className={styles.empty}>Loading…</p>}
      {isError && <p className={styles.empty}>Couldn't load the dashboard. Try again.</p>}

      {data && (
        <>
          <div className={styles.tileGrid}>
            <div className={styles.tile}>
              <div className={styles.tileLabel}>Appointments</div>
              <div className={styles.tileValue}>{totalAppointments}</div>
            </div>
            <div className={styles.tile}>
              <div className={styles.tileLabel}>No-show rate</div>
              <div className={`${styles.tileValue} ${styles[noShowSeverity(data.noShowRate)]}`}>
                {Math.round(data.noShowRate * 100)}%
              </div>
            </div>
            <div className={styles.tile}>
              <div className={styles.tileLabel}>Cancelled</div>
              <div className={styles.tileValue}>{data.statusBreakdown.CANCELLED}</div>
            </div>
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Bookings per day</h2>
            <BarChart
              title="Bookings per day"
              data={bookingsByDay}
              labelEvery={days > 14 ? 3 : 1}
            />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Busiest hours</h2>
            <BarChart title="Busiest hours" data={busiestHours} labelEvery={3} highlightMax />
          </section>
        </>
      )}
    </div>
  );
}
