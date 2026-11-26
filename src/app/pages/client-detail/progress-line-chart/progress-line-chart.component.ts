import { Component, computed, input } from '@angular/core';

export interface ProgressLineChartPoint {
  label: string;
  value: number;
}

export interface ProgressLineChartView {
  width: number;
  height: number;
  points: Array<ProgressLineChartPoint & { x: number; y: number; showLabel: boolean }>;
  linePath: string;
  areaPath: string;
  targetY: number | null;
  yTicks: { y: number; label: string }[];
}

let nextChartId = 0;

@Component({
  selector: 'app-progress-line-chart',
  standalone: true,
  templateUrl: './progress-line-chart.component.html',
  styleUrl: './progress-line-chart.component.scss',
})
export class ProgressLineChartComponent {
  readonly points = input.required<ProgressLineChartPoint[]>();
  readonly target = input<number | null>(null);
  readonly targetLabel = input('');
  readonly ariaLabel = input('Gráfico de evolución');

  readonly gradientId = `line-chart-grad-${++nextChartId}`;

  readonly chart = computed(() =>
    buildProgressLineChart(this.points(), this.target()),
  );

  formatLabel(iso: string): string {
    const date = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }
}

const CHART_WIDTH = 400;
const CHART_HEIGHT = 180;
const CHART_PAD = { top: 24, right: 20, bottom: 32, left: 44 };

function buildProgressLineChart(
  series: ProgressLineChartPoint[],
  target: number | null,
): ProgressLineChartView {
  const values = series.map((point) => point.value);
  const extras = target != null && Number.isFinite(target) ? [target] : [];
  const min = (values.length ? Math.min(...values, ...extras) : 0) - 0.8;
  const max = (values.length ? Math.max(...values, ...extras) : 1) + 0.8;
  const range = max - min || 1;
  const innerW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const innerH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
  const count = series.length;
  const baseline = CHART_HEIGHT - CHART_PAD.bottom;
  const labelStep = count <= 8 ? 1 : Math.ceil(count / 6);

  const points = series.map((point, index) => ({
    ...point,
    x: CHART_PAD.left + (count === 1 ? innerW / 2 : (index / (count - 1)) * innerW),
    y: CHART_PAD.top + innerH - ((point.value - min) / range) * innerH,
    showLabel: index === 0 || index === count - 1 || index % labelStep === 0,
  }));

  const linePath =
    points.length > 0
      ? points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
      : '';

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baseline} L ${points[0].x.toFixed(1)} ${baseline} Z`
      : '';

  const targetY =
    target != null && Number.isFinite(target)
      ? CHART_PAD.top + innerH - ((target - min) / range) * innerH
      : null;

  const steps = 4;
  const yTicks = Array.from({ length: steps + 1 }, (_, index) => {
    const value = min + ((max - min) * index) / steps;
    const y = CHART_PAD.top + innerH - ((value - min) / range) * innerH;
    return { y, label: value.toFixed(1) };
  });

  return {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    points,
    linePath,
    areaPath,
    targetY,
    yTicks,
  };
}
