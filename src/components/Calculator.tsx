import { useState } from 'react';

interface CalculatorProps {
  apiBase?: string;
}

const CURRENCIES = [
  { code: 'CLP', name: 'Peso Chileno', flag: '🇨🇱' },
  { code: 'ARS', name: 'Peso Argentino', flag: '🇦🇷' },
  { code: 'BRL', name: 'Real Brasileño', flag: '🇧🇷' },
  { code: 'PEN', name: 'Sol Peruano', flag: '🇵🇪' },
  { code: 'PYG', name: 'Guaraní Paraguayo', flag: '🇵🇾' },
];

const RATE_SOURCES = [
  { value: 'binance', label: 'Binance (Referencia global)' },
  { value: 'border', label: 'Frontera (Remesador local)' },
];

export default function Calculator({ apiBase = '/api' }: CalculatorProps) {
  const [amount, setAmount] = useState<string>('');
  const [fromCurrency, setFromCurrency] = useState<string>('CLP');
  const [rateSource, setRateSource] = useState<string>('binance');
  const [result, setResult] = useState<{
    output: number;
    currency: string;
    rate: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Ingresa una cantidad válida');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${apiBase}/calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          fromCurrency,
          toCurrency: 'BOB',
          rateSource,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setResult(data.output);
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="calculator-island">
      <div className="calculator-form">
        <div className="form-group">
          <label htmlFor="calc-amount">Cantidad a enviar</label>
          <input
            id="calc-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10000"
            step="0.01"
            className="input"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="calc-from">Desde</label>
            <select
              id="calc-from"
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="select"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="calc-to">Hacia</label>
            <select id="calc-to" className="select" disabled>
              <option value="BOB">🇧🇴 BOB</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="calc-source">Fuente del tipo de cambio</label>
          <select
            id="calc-source"
            value={rateSource}
            onChange={(e) => setRateSource(e.target.value)}
            className="select"
          >
            {RATE_SOURCES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCalculate}
          disabled={loading}
          className="calculate-btn"
        >
          {loading ? 'Calculando...' : 'Calcular'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {result && (
        <div className="result-display">
          <div className="result-label">Recibirías</div>
          <div className="result-amount">
            {result.output.toFixed(2)} {result.currency}
          </div>
          <div className="result-meta">
            Tasa: {result.rate.toFixed(4)}
          </div>
        </div>
      )}

      <style>{`
        .calculator-island {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        .calculator-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        label {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .input, .select {
          padding: 0.5rem 0.75rem;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 0.375rem;
          color: var(--color-text);
          font-size: 1rem;
        }

        .input:focus, .select:focus {
          outline: none;
          border-color: var(--color-accent);
        }

        .select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .calculate-btn {
          padding: 0.75rem 1.5rem;
          background: var(--color-accent);
          color: var(--color-bg);
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
          font-size: 1rem;
        }

        .calculate-btn:hover:not(:disabled) {
          opacity: 0.9;
        }

        .calculate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--color-danger);
          border-radius: 0.5rem;
          color: var(--color-danger);
          font-size: 0.875rem;
        }

        .result-display {
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(245, 158, 11, 0.1);
          border-radius: 0.5rem;
          text-align: center;
        }

        .result-label {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin-bottom: 0.25rem;
        }

        .result-amount {
          font-family: var(--font-mono);
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--color-accent);
        }

        .result-meta {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
}