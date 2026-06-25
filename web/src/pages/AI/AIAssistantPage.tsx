import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import {
  getAiStatus,
  sendAiChat,
  type AiStatus,
  type ChatMessage,
  type ReportPeriod,
} from '../../services/ai.service';
import './AIAssistantPage.css';

const SUGGESTIONS = [
  'Riwayat maintenance minggu ini',
  'Tiket open dengan SLA breach',
  'Sparepart yang dipakai bulan ini',
  'Ringkasan work order engineering',
];

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={key}>
        {listItems.map((item, i) => (
          <li key={`${key}-${i}`} dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((line, idx) => {
    if (line.startsWith('- ')) {
      listItems.push(line.slice(2));
      return;
    }
    flushList(`list-${idx}`);
    if (line.startsWith('### ')) {
      elements.push(<h3 key={idx}>{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={idx}>{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={idx}>{line.slice(2)}</h1>);
    } else if (line === '---') {
      elements.push(<hr key={idx} />);
    } else if (line.startsWith('*') && line.endsWith('*')) {
      elements.push(
        <p key={idx}>
          <em>{line.slice(1, -1)}</em>
        </p>,
      );
    } else if (line.trim()) {
      elements.push(<p key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }} />);
    }
  });
  flushList('list-end');
  return elements;
}

function inlineMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

export function AIAssistantPage() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAiStatus()
      .then(setStatus)
      .catch(() =>
        setStatus({
          enabled: true,
          llmConfigured: false,
          model: null,
          userLlm: null,
          platformLlm: null,
          modes: [],
          reportPeriods: [],
        }),
      );
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError('');
    setLoading(true);
    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');

    try {
      const res = await sendAiChat(trimmed, messages);
      setMessages([...nextHistory, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pesan');
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  }

  async function handleReport(period: ReportPeriod) {
    const labels: Record<ReportPeriod, string> = {
      daily: 'Laporan harian',
      weekly: 'Laporan mingguan',
      monthly: 'Laporan bulanan',
    };
    await handleSend(`Generate ${labels[period]}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void handleSend(input);
  }

  return (
    <div className="ai-assistant-page">
      <div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Tunas AI Assistant</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Tanya riwayat maintenance, status tiket, sparepart, atau generate laporan operasional.
        </p>
      </div>

      <div className="ai-status-bar">
        <Badge variant={status?.enabled ? 'success' : 'warning'}>
          {status?.enabled ? 'AI Aktif' : 'AI Nonaktif'}
        </Badge>
        {status?.userLlm?.connected ? (
          <Badge variant="success">
            {status.userLlm.providerLabel} · {status.userLlm.model}
          </Badge>
        ) : status?.platformLlm ? (
          <Badge variant="success">Platform LLM · {status.platformLlm.model}</Badge>
        ) : (
          <Badge>Smart Analytics</Badge>
        )}
        <Link to="/ai-settings" style={{ fontSize: '0.82rem', color: '#0f766e' }}>
          {status?.userLlm?.connected ? 'Ubah koneksi' : 'Hubungkan ChatGPT / Gemini'}
        </Link>
      </div>

      <Card title="Laporan Cepat">
        <div className="ai-quick-actions">
          <Button variant="secondary" disabled={loading} onClick={() => void handleReport('daily')}>
            📊 Harian
          </Button>
          <Button variant="secondary" disabled={loading} onClick={() => void handleReport('weekly')}>
            📈 Mingguan
          </Button>
          <Button variant="secondary" disabled={loading} onClick={() => void handleReport('monthly')}>
            📅 Bulanan
          </Button>
        </div>
      </Card>

      <div className="ai-chat-panel">
        <Card title="Chat">
        <div className="ai-messages">
          {messages.length === 0 && (
            <div className="ai-empty-state">
              Mulai dengan pertanyaan atau pilih saran di bawah.
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`ai-message ${msg.role}`}>
              <div className="ai-message-content">{renderMarkdown(msg.content)}</div>
            </div>
          ))}
          {loading && (
            <div className="ai-message assistant">
              <div className="ai-message-content">Memproses...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</p>
        )}

        <div className="ai-suggestions" style={{ marginBottom: '0.75rem' }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="ai-suggestion-chip"
              disabled={loading}
              onClick={() => void handleSend(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <form className="ai-input-row" onSubmit={onSubmit}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya tentang maintenance, tiket, SLA, sparepart..."
            disabled={loading}
          />
          <Button type="submit" loading={loading} disabled={!input.trim()}>
            Kirim
          </Button>
        </form>
        </Card>
      </div>
    </div>
  );
}
