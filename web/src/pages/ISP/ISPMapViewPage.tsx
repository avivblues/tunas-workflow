import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { APP_UI_CONFIG } from '../../config/apps';
import { listDomains, type DomainNode } from '../../services/master.service';
import { listTransactions, type TransactionHeader } from '../../services/transaction.service';

interface ClusterPin {
  domain: DomainNode;
  tickets: TransactionHeader[];
}

function detailValue(details: { fieldCode: string; value: unknown }[] | undefined, key: string) {
  const row = details?.find((d) => d.fieldCode === key);
  if (!row?.value) return '—';
  return typeof row.value === 'string' ? row.value : String(row.value);
}

function FitBounds({ pins }: { pins: ClusterPin[] }) {
  const map = useMap();

  useEffect(() => {
    if (pins.length === 0) return;
    const bounds = L.latLngBounds(
      pins.map((p) => [p.domain.latitude!, p.domain.longitude!] as [number, number]),
    );
    map.fitBounds(bounds.pad(0.25), { maxZoom: 13 });
  }, [map, pins]);

  return null;
}

const JAKARTA_CENTER: [number, number] = [-6.2088, 106.8456];

export function ISPMapViewPage() {
  const config = APP_UI_CONFIG.ISP_TICKET;
  const [domains, setDomains] = useState<DomainNode[]>([]);
  const [tickets, setTickets] = useState<TransactionHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'ALL'>('OPEN');

  useEffect(() => {
    Promise.all([
      listDomains('LOCATION'),
      listTransactions({ app_code: 'ISP_TICKET', limit: 200, with_details: true }),
    ])
      .then(([domainRows, ticketRes]) => {
        setDomains(domainRows);
        setTickets(ticketRes.items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredTickets = useMemo(
    () => (statusFilter === 'OPEN' ? tickets.filter((t) => t.status === 'OPEN') : tickets),
    [tickets, statusFilter],
  );

  const pins = useMemo<ClusterPin[]>(() => {
    const geoDomains = domains.filter((d) => d.latitude != null && d.longitude != null);
    return geoDomains
      .map((domain) => ({
        domain,
        tickets: filteredTickets.filter((t) => t.domainCode === domain.domainCode),
      }))
      .filter((p) => p.tickets.length > 0);
  }, [domains, filteredTickets]);

  const unmapped = useMemo(
    () =>
      filteredTickets.filter((t) => {
        const domain = domains.find((d) => d.domainCode === t.domainCode);
        return !domain?.latitude || !domain?.longitude;
      }),
    [filteredTickets, domains],
  );

  const markerColor = (count: number) => {
    if (count >= 3) return '#dc2626';
    if (count >= 2) return '#ea580c';
    return '#2563eb';
  };

  return (
    <div>
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1>📡 ISP Ticket Map</h1>
          <p>Open tickets grouped by cluster / area on the map</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            variant={statusFilter === 'OPEN' ? 'primary' : 'secondary'}
            onClick={() => setStatusFilter('OPEN')}
          >
            Open Only
          </Button>
          <Button
            variant={statusFilter === 'ALL' ? 'primary' : 'secondary'}
            onClick={() => setStatusFilter('ALL')}
          >
            All Tickets
          </Button>
          <Link to={config.listPath}>
            <Button variant="secondary">List View</Button>
          </Link>
          <Link to={config.createPath}>
            <Button>New Ticket</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <p>Loading map...</p>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Badge variant="info">{pins.length} clusters on map</Badge>
            <Badge variant="warning">{filteredTickets.length} tickets shown</Badge>
            {unmapped.length > 0 && (
              <Badge variant="default">{unmapped.length} without coordinates</Badge>
            )}
          </div>

          <Card title="Ticket Map">
            {pins.length === 0 ? (
              <p style={{ color: 'var(--color-muted)' }}>
                No tickets with mapped cluster coordinates. Add latitude/longitude to LOCATION domains
                in Admin → Domains.
              </p>
            ) : (
              <div className="isp-map-container">
                <MapContainer
                  center={JAKARTA_CENTER}
                  zoom={11}
                  scrollWheelZoom
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <FitBounds pins={pins} />
                  {pins.map((pin) => (
                    <CircleMarker
                      key={pin.domain.id}
                      center={[pin.domain.latitude!, pin.domain.longitude!]}
                      radius={12 + pin.tickets.length * 4}
                      pathOptions={{
                        color: markerColor(pin.tickets.length),
                        fillColor: markerColor(pin.tickets.length),
                        fillOpacity: 0.75,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: 220 }}>
                          <strong>{pin.domain.name}</strong>
                          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: 8 }}>
                            {pin.domain.domainCode} · {pin.tickets.length} ticket(s)
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {pin.tickets.map((t) => (
                              <li key={t.id} style={{ marginBottom: 6 }}>
                                <div>
                                  <strong>{detailValue(t.details, 'customer_name')}</strong>
                                </div>
                                <div style={{ fontSize: '0.8rem' }}>
                                  {t.trxNo} · {t.currentProcess}
                                </div>
                                <Link to={`/transactions/${t.id}`}>View detail →</Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            )}
          </Card>

          {unmapped.length > 0 && (
            <Card title="Tickets Without Map Coordinates">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Customer</th>
                    <th>Domain</th>
                    <th>Process</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {unmapped.map((t) => (
                    <tr key={t.id}>
                      <td>
                        {detailValue(t.details, 'title')}
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                          {t.trxNo}
                        </div>
                      </td>
                      <td>{detailValue(t.details, 'customer_name')}</td>
                      <td>
                        <code>{t.domainCode ?? '—'}</code>
                      </td>
                      <td>
                        <Badge variant="info">{t.currentProcess}</Badge>
                      </td>
                      <td>
                        <Link to={`/transactions/${t.id}`}>View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
