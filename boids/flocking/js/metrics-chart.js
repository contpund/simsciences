// Live cohesion chart. Metric = mean over all boids of each boid's average
// distance to its 5 nearest neighbors. Rolling 120-sample window, sampled
// every 10 frames. Degrades gracefully if Chart.js (CDN) failed to load.

import { t } from './i18n.js';

const WINDOW = 120;
const SAMPLE_EVERY = 10;
const K = 5;

function cohesionMetric(boids) {
  const n = boids.length;
  if (n < 2) return 0;
  const k = Math.min(K, n - 1);
  let total = 0;
  // n ≤ 300 and only every 10th frame → brute force is cheap and exact.
  for (let i = 0; i < n; i++) {
    const a = boids[i];
    const d2 = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const dx = boids[j].x - a.x;
      const dy = boids[j].y - a.y;
      d2.push(dx * dx + dy * dy);
    }
    d2.sort((p, q) => p - q);
    let s = 0;
    for (let m = 0; m < k; m++) s += Math.sqrt(d2[m]);
    total += s / k;
  }
  return total / n;
}

export class MetricsChart {
  constructor(canvasId) {
    this.frame = 0;
    this.enabled = typeof window.Chart !== 'undefined';
    const panel = document.getElementById('chartPanel');

    if (!this.enabled) {
      if (panel) panel.classList.add('chart-unavailable');
      return;
    }

    const ctx = document.getElementById(canvasId).getContext('2d');
    this.chart = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: '#5fb0ff',
          backgroundColor: 'rgba(95, 176, 255, 0.12)',
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: t('chartTitle'), color: '#cdd0d8' },
        },
        scales: {
          x: {
            title: { display: true, text: t('chartX'), color: '#9aa0ab' },
            ticks: { color: '#7c818c', maxTicksLimit: 6 },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            title: { display: true, text: t('chartY'), color: '#9aa0ab' },
            ticks: { color: '#7c818c' },
            grid: { color: 'rgba(255,255,255,0.05)' },
            beginAtZero: true,
          },
        },
      },
    });

    document.addEventListener('languagechanged', () => this.relabel());
  }

  // Called once per rendered frame; only samples every SAMPLE_EVERY frames.
  maybeSample(engine) {
    if (!this.enabled) return;
    this.frame++;
    if (this.frame % SAMPLE_EVERY !== 0) return;

    const value = cohesionMetric(engine.boids);
    const ds = this.chart.data.datasets[0].data;
    const labels = this.chart.data.labels;
    ds.push(Number(value.toFixed(2)));
    labels.push(this.frame);
    if (ds.length > WINDOW) { ds.shift(); labels.shift(); }
    this.chart.update('none');
  }

  relabel() {
    if (!this.enabled) return;
    this.chart.options.plugins.title.text = t('chartTitle');
    this.chart.options.scales.x.title.text = t('chartX');
    this.chart.options.scales.y.title.text = t('chartY');
    this.chart.update('none');
  }
}
