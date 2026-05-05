import { useState, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface ChartDataPoint {
  rate: number;
  created_at: number;
}

interface RateChartProps {
  pair: string;
  initialPeriod?: '7d' | '30d' | '90d';
}

const PERIODS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
} as const;

export default function RateChart({ pair, initialPeriod = '30d' }: RateChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>(initialPeriod);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const apiBase = import.meta.env.PUBLIC_API_URL || '/api';
        const response = await fetch(
          `${apiBase}/rates/${encodeURIComponent(pair)}/history?period=${selectedPeriod}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch historical data');
        }

        const data = await response.json();
        setChartData(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pair, selectedPeriod]);

  useEffect(() => {
    if (chartData.length === 0) return;

    const ctx = document.getElementById('rate-chart-canvas') as HTMLCanvasElement;
    if (!ctx) return;

    const labels = chartData.map(d =>
      new Date(d.created_at * 1000).toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric'
      })
    );

    const prices = chartData.map(d => d.rate);

    // Destroy existing chart if any
    if (window.rateChartInstance) {
      window.rateChartInstance.destroy();
    }

    window.rateChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `${pair} - ${selectedPeriod}`,
            data: prices,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: '#1a1a1a',
            titleColor: '#ffffff',
            bodyColor: '#888888',
            borderColor: '#2a2a2a',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                return `${context.parsed.y.toFixed(4)} BOB`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(42, 42, 42, 0.5)',
            },
            ticks: {
              color: '#888888',
              maxTicksLimit: 8,
            },
          },
          y: {
            grid: {
              color: 'rgba(42, 42, 42, 0.5)',
            },
            ticks: {
              color: '#888888',
              callback: (value) => (value as number).toFixed(2),
            },
          },
        },
      },
    });

    return () => {
      if (window.rateChartInstance) {
        window.rateChartInstance.destroy();
      }
    };
  }, [chartData, selectedPeriod, pair]);

  const periods: Array<'7d' | '30d' | '90d'> = ['7d', '30d', '90d'];

  return (
    <div className="rate-chart-container">
      <div className="chart-header">
        <h3>Histórico: {pair}</h3>
        <div className="period-selector">
          {periods.map((period) => (
            <button
              key={period}
              className={`period-btn ${selectedPeriod === period ? 'active' : ''}`}
              onClick={() => setSelectedPeriod(period)}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-wrapper">
        {loading && (
          <div className="chart-loading">
            <div className="spinner"></div>
            <span>Cargando datos...</span>
          </div>
        )}

        {error && (
          <div className="chart-error">
            Error: {error}
          </div>
        )}

        {!loading && !error && chartData.length === 0 && (
          <div className="chart-empty">
            No hay datos disponibles para este período
          </div>
        )}

        {!loading && !error && chartData.length > 0 && (
          <canvas id="rate-chart-canvas"></canvas>
        )}
      </div>

      <style>{`
        .rate-chart-container {
          width: 100%;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .chart-header h3 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .period-selector {
          display: flex;
          gap: 0.5rem;
        }

        .period-btn {
          padding: 0.25rem 0.75rem;
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: 0.375rem;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }

        .period-btn:hover {
          border-color: var(--color-accent);
          color: var(--color-text);
        }

        .period-btn.active {
          background: var(--color-accent);
          border-color: var(--color-accent);
          color: var(--color-bg);
        }

        .chart-wrapper {
          height: 300px;
          position: relative;
          background: var(--color-surface);
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .chart-loading,
        .chart-error,
        .chart-empty {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-text-muted);
        }

        .chart-error {
          color: var(--color-danger);
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        canvas {
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </div>
  );
}

// Extend Window interface for chart instance
declare global {
  interface Window {
    rateChartInstance?: Chart;
  }
}