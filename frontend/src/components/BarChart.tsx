import styles from "./BarChart.module.css";

export interface BarChartPoint {
  label: string;
  value: number;
}

const WIDTH = 600;
const PADDING_LEFT = 32;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 20;

/**
 * A hand-drawn bar chart - plain SVG, no charting library. The whole thing is one idea:
 * pick a scale (tallest bar = the chart's usable height, in pixels), then every bar's
 * height is (value / maxValue) * that height. Everything else (axis lines, labels,
 * spacing) is bookkeeping around that one calculation.
 */
export function BarChart({
  data,
  title,
  height = 180,
  labelEvery = 1,
  highlightMax = false,
}: {
  data: BarChartPoint[];
  /** Used as the chart's accessible name - there's no visible <title> on an SVG otherwise. */
  title: string;
  height?: number;
  /** Show an x-axis label under every Nth bar - for charts with too many bars (e.g. 24 hourly
   *  bars) to label every single one without them overlapping. */
  labelEvery?: number;
  /** Draw the single tallest bar in a different colour - e.g. for a "busiest hour" callout. */
  highlightMax?: boolean;
}) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <p className={styles.empty}>No data for this range yet.</p>;
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1); // never divide by zero below
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;
  const chartWidth = WIDTH - PADDING_LEFT;
  const barSlot = chartWidth / data.length;
  const barWidth = Math.max(barSlot * 0.6, 2);

  const maxIndex = highlightMax
    ? data.reduce((best, point, i) => (point.value > data[best]!.value ? i : best), 0)
    : -1;

  // Three reference lines - enough to read a rough value off the chart without cluttering it.
  const gridValues = [0, maxValue / 2, maxValue];
  const valueToY = (value: number) => PADDING_TOP + chartHeight - (value / maxValue) * chartHeight;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className={styles.chart} role="img" aria-label={title}>
      {gridValues.map((value) => {
        const y = valueToY(value);
        return (
          <g key={value}>
            <line x1={PADDING_LEFT} y1={y} x2={WIDTH} y2={y} className={styles.gridLine} />
            <text x={PADDING_LEFT - 6} y={y + 3} textAnchor="end" className={styles.axisLabel}>
              {Math.round(value)}
            </text>
          </g>
        );
      })}

      {data.map((point, i) => {
        const x = PADDING_LEFT + i * barSlot + (barSlot - barWidth) / 2;
        const barHeight = (point.value / maxValue) * chartHeight;
        const y = PADDING_TOP + chartHeight - barHeight;
        return (
          <g key={`${point.label}-${i}`}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              className={i === maxIndex ? styles.barHighlight : styles.bar}
            />
            {point.value > 0 && (
              <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" className={styles.barLabel}>
                {point.value}
              </text>
            )}
            {i % labelEvery === 0 && (
              <text
                x={x + barWidth / 2}
                y={height - 4}
                textAnchor="middle"
                className={styles.xLabel}
              >
                {point.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
