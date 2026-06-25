import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import {
  analyzeRootCause,
  type RootCauseAnalysis,
} from '../../services/ai.service';

export function AiInsightsPanel({ transactionId }: { transactionId: string }) {
  const [data, setData] = useState<RootCauseAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function runAnalysis() {
    setLoading(true);
    setError('');
    try {
      const result = await analyzeRootCause(transactionId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runAnalysis().catch(() => undefined);
  }, [transactionId]);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, color: 'var(--color-muted)' }}>
          AI Root Cause Analysis dari historis <code>transaction_log</code> & kasus serupa
        </p>
        <Button variant="secondary" disabled={loading} onClick={runAnalysis}>
          {loading ? 'Analyzing…' : 'Refresh'}
        </Button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {data && (
        <>
          <Card title="Root Cause">
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {data.llmUsed ? <Badge variant="success">LLM Enhanced</Badge> : <Badge>Rule-based</Badge>}
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {data.rootCauses.map((r) => (
                <li key={r.cause} style={{ marginBottom: '0.5rem' }}>
                  <strong>{r.cause}</strong>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-muted)' }}>{r.recommendation}</div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Technician Suggestions">
            {data.technicianSuggestions.estimatedResolutionHours != null && (
              <p style={{ marginTop: 0 }}>
                Estimasi penyelesaian: <strong>{data.technicianSuggestions.estimatedResolutionHours} jam</strong>{' '}
                (dari {data.technicianSuggestions.basedOnCases} kasus serupa)
              </p>
            )}
            {data.technicianSuggestions.suggestedSteps.length === 0 ? (
              <p style={{ color: 'var(--color-muted)' }}>Belum ada langkah dari kasus serupa — dokumentasikan work log.</p>
            ) : (
              <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {data.technicianSuggestions.suggestedSteps.map((s) => (
                  <li key={s.step} style={{ marginBottom: '0.35rem' }}>
                    {s.step}{' '}
                    <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                      (×{s.seenInCases} kasus)
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card title="Similar Cases">
            {data.similarCases.length === 0 ? (
              <p style={{ color: 'var(--color-muted)' }}>Tidak ada kasus serupa dalam historis.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Score</th>
                    <th>Resolution</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.similarCases.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <code>{c.trxNo}</code>
                      </td>
                      <td>{c.score}</td>
                      <td>{c.resolutionHours != null ? `${c.resolutionHours}h` : '—'}</td>
                      <td>
                        <Link to={`/transactions/${c.id}`}>View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Full Analysis">
            <div
              className="ai-markdown"
              style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: 1.6 }}
            >
              {data.narrative}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
