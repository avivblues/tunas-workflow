import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { useAuth } from '../../context/AuthContext';
import type { ConnectorCatalogItem, InstalledConnector } from '../../services/connector.service';
import {
  formatSupportedApps,
  getInstallLabel,
  getRatingStars,
  installConnector,
  listInstalledConnectors,
  listMarketplace,
  syncCustomApiAssets,
  syncOdooAssets,
  syncGoogleCalendar,
  testConnector,
  uninstallConnector,
  updateConnector,
} from '../../services/connector.service';
import {
  getIntegrationStatus,
  runIntegrationWorker,
  type IntegrationStatus,
} from '../../services/integration.service';
import { IotConnectorPanel } from '../../components/organisms/IotConnectorPanel';
import { IspConnectorPanel } from '../../components/organisms/IspConnectorPanel';
import './IntegrationMarketplacePage.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

const OUTBOUND_TYPES = new Set(['SLACK', 'TEAMS']);
const SYNC_TYPES = new Set(['ODOO', 'GOOGLE_CALENDAR', 'CUSTOM_API']);
const TESTABLE_TYPES = new Set([
  'ODOO',
  'SLACK',
  'TEAMS',
  'GOOGLE_CALENDAR',
  'ANYDESK',
  'CUSTOM_API',
]);

const COMPACT_WHEN_ALL = new Set(['ISP', 'IOT']);

function pricingBadge(pricing: string) {
  if (pricing === 'FREE') return <Badge variant="success">FREE</Badge>;
  if (pricing === 'PAID') return <Badge variant="warning">PAID</Badge>;
  return <Badge>COMING SOON</Badge>;
}

function showFullConnectorDetails(
  connector: InstalledConnector,
  hasActiveFilters: boolean,
  expandedConnectorId: string | null,
) {
  if (expandedConnectorId === connector.id) return true;
  if (!COMPACT_WHEN_ALL.has(connector.type)) return true;
  return hasActiveFilters;
}

function IspConnectionStatus({ connector }: { connector: InstalledConnector }) {
  if (!connector.active) {
    return (
      <div className="connector-status-row">
        <span className="connector-status-label">Status koneksi:</span>
        <Badge variant="warning">Tidak aktif</Badge>
      </div>
    );
  }

  const hasWebhook = Boolean(connector.config.webhook_secret);
  const callbackUrl = String(connector.config.callback_url ?? '').trim();
  const hasCallback = callbackUrl.length > 0;
  const connected = hasWebhook && hasCallback;

  return (
    <div className="connector-status-block">
      <div className="connector-status-row">
        <span className="connector-status-label">Status koneksi:</span>
        {connected ? (
          <Badge variant="success">Terhubung</Badge>
        ) : (
          <Badge variant="warning">Belum terhubung</Badge>
        )}
      </div>
      <div className="connector-status-details">
        <span className={hasWebhook ? 'connector-status-ok' : 'connector-status-muted'}>
          Inbound webhook {hasWebhook ? 'siap' : 'belum dikonfigurasi'}
        </span>
        <span className="connector-status-sep">·</span>
        <span className={hasCallback ? 'connector-status-ok' : 'connector-status-muted'}>
          Outbound callback {hasCallback ? 'terkonfigurasi' : 'belum di-set'}
        </span>
      </div>
    </div>
  );
}

function IotConnectionStatus({ active, mqttConnected }: { active: boolean; mqttConnected?: boolean }) {
  if (!active) {
    return <Badge variant="warning">Tidak aktif</Badge>;
  }
  return (
    <div className="connector-status-row">
      <span className="connector-status-label">Status koneksi:</span>
      {mqttConnected ? (
        <Badge variant="success">MQTT terhubung</Badge>
      ) : (
        <Badge variant="warning">MQTT tidak terhubung</Badge>
      )}
    </div>
  );
}

function MarketplaceAppCard({
  item,
  installed,
  busy,
  onInstall,
  onConfigure,
  onUninstall,
}: {
  item: ConnectorCatalogItem;
  installed: boolean;
  busy: boolean;
  onInstall: (item: ConnectorCatalogItem) => void;
  onConfigure: (type: string) => void;
  onUninstall: (type: string) => void;
}) {
  return (
    <article className="app-card-market">
      <div className="app-card-header">
        <span className="app-card-icon" aria-hidden>
          {item.icon}
        </span>
        <div>
          <h3 className="app-card-title">{item.name}</h3>
          <div className="app-card-vendor">by {item.vendor}</div>
        </div>
      </div>

      <p className="app-card-desc">{item.description}</p>

      <div className="app-card-meta">
        <span className="app-card-rating">
          {getRatingStars(item.rating)} {item.rating.toFixed(1)}
        </span>
        <span>·</span>
        <span>{getInstallLabel(item.installCount)}</span>
      </div>

      <div className="app-card-features">{item.features.join(' · ')}</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {pricingBadge(item.pricing)}
        {item.popular && <Badge variant="success">Popular</Badge>}
        {item.webhook && <Badge>Inbound</Badge>}
        {item.outbound && <Badge>Outbound</Badge>}
        {item.sync && <Badge>Sync</Badge>}
      </div>

      <div className="app-card-supported">
        Supported for {formatSupportedApps(item.supportedApps)}
      </div>

      {installed ? (
        <div className="app-card-installed-actions">
          <Button variant="secondary" disabled={busy} onClick={() => onConfigure(item.type)}>
            Configure
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => onUninstall(item.type)}>
            Uninstall
          </Button>
        </div>
      ) : (
        <Button
          disabled={busy || item.pricing === 'COMING_SOON'}
          onClick={() => onInstall(item)}
        >
          {item.pricing === 'COMING_SOON' ? 'Coming Soon' : 'Install'}
        </Button>
      )}
    </article>
  );
}

export function IntegrationMarketplacePage() {
  const { user } = useAuth();
  const tenantCode = user?.tenant?.code ?? '01';

  const [catalog, setCatalog] = useState<ConnectorCatalogItem[]>([]);
  const [appFilters, setAppFilters] = useState<{ code: string; label: string }[]>([]);
  const [categories, setCategories] = useState<string[]>(['ALL']);
  const [pricingFilters, setPricingFilters] = useState<string[]>(['ALL']);
  const [installed, setInstalled] = useState<InstalledConnector[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [appFilter, setAppFilter] = useState('ALL');
  const [pricingFilter, setPricingFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [configuring, setConfiguring] = useState<ConnectorCatalogItem | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [expandedConnectorId, setExpandedConnectorId] = useState<string | null>(null);
  const catalogSectionRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const installedSectionRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters =
    search !== '' || appFilter !== 'ALL' || category !== 'ALL' || pricingFilter !== 'ALL';

  function scrollToFilteredContent() {
    requestAnimationFrame(() => {
      mainContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function applyAppFilter(code: string) {
    setAppFilter(code);
    scrollToFilteredContent();
  }

  function applyCategoryFilter(cat: string) {
    setCategory(cat);
    scrollToFilteredContent();
  }

  function applyPricingFilter(price: string) {
    setPricingFilter(price);
    scrollToFilteredContent();
  }

  function clearFilters() {
    setSearch('');
    setAppFilter('ALL');
    setCategory('ALL');
    setPricingFilter('ALL');
  }

  async function load() {
    const [market, list, status] = await Promise.all([
      listMarketplace(),
      listInstalledConnectors(),
      getIntegrationStatus().catch(() => null),
    ]);
    setCatalog(market.items);
    setAppFilters(market.appFilters);
    setCategories(market.categories);
    setPricingFilters(market.pricingFilters);
    setInstalled(list);
    setIntegrationStatus(status);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const installedTypes = new Set(installed.map((c) => c.type));

  const filtered = useMemo(
    () => catalog.filter((item) => {
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.vendor.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === 'ALL' || item.category === category;
      const matchPricing = pricingFilter === 'ALL' || item.pricing === pricingFilter;
      const matchApp =
        appFilter === 'ALL' ||
        item.supportedApps.includes('ALL') ||
        item.supportedApps.includes(appFilter);
      return matchSearch && matchCategory && matchPricing && matchApp;
    }),
    [catalog, search, category, pricingFilter, appFilter],
  );

  const filteredInstalled = useMemo(() => {
    if (!hasActiveFilters) return installed;
    return installed.filter((connector) => {
      const catalogItem = catalog.find((c) => c.type === connector.type);
      if (!catalogItem) return false;
      const matchSearch =
        !search ||
        catalogItem.name.toLowerCase().includes(search.toLowerCase()) ||
        catalogItem.description.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === 'ALL' || catalogItem.category === category;
      const matchPricing = pricingFilter === 'ALL' || catalogItem.pricing === pricingFilter;
      const matchApp =
        appFilter === 'ALL' ||
        catalogItem.supportedApps.includes('ALL') ||
        catalogItem.supportedApps.includes(appFilter);
      return matchSearch && matchCategory && matchPricing && matchApp;
    });
  }, [installed, catalog, search, category, pricingFilter, appFilter, hasActiveFilters]);

  const popularApps = useMemo(
    () => catalog.filter((item) => item.popular).slice(0, 6),
    [catalog],
  );

  function openConfigureModal(item: ConnectorCatalogItem) {
    const defaults: Record<string, string> = {};
    for (const field of item.configFields) {
      if (field.key === 'asset_model') defaults[field.key] = 'maintenance.equipment';
      else if (field.key === 'tunasiot_base_url') defaults[field.key] = 'https://app.tunasiot.com';
      else defaults[field.key] = '';
    }
    setConfigForm(defaults);
    setConfiguring(item);
  }

  async function handleInstall(item: ConnectorCatalogItem) {
    if (item.pricing === 'COMING_SOON') return;
    if (item.configFields.length > 0) {
      openConfigureModal(item);
      return;
    }
    setBusy(true);
    try {
      await installConnector({ type: item.type, name: item.name });
      setMessage(`${item.name} installed`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Install failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfiguredInstall(e: FormEvent) {
    e.preventDefault();
    if (!configuring) return;
    setBusy(true);
    try {
      await installConnector({
        type: configuring.type,
        name: configuring.name,
        config: configForm,
      });
      setMessage(`${configuring.name} installed`);
      setConfiguring(null);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Install failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleConnectorTest(id: string, type: string) {
    setBusy(true);
    try {
      await testConnector(id);
      if (type === 'SLACK') setMessage('Test message sent to Slack');
      else if (type === 'TEAMS') setMessage('Test message sent to Microsoft Teams');
      else if (type === 'GOOGLE_CALENDAR') setMessage('Google Calendar connected');
      else if (type === 'ANYDESK') setMessage('AnyDesk configuration valid');
      else setMessage('Connection test successful');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleOdooSync(id: string) {
    setBusy(true);
    try {
      const result = await syncOdooAssets(id);
      setMessage(
        `Sync done — ${result.created} created, ${result.updated} updated (${result.total} total)`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleCalendarSync(id: string) {
    setBusy(true);
    try {
      const result = await syncGoogleCalendar(id);
      setMessage(
        `Calendar sync — ${result.created} created, ${result.updated} updated, ${result.deleted} removed`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Calendar sync failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleCustomApiSync(id: string) {
    setBusy(true);
    try {
      const result = await syncCustomApiAssets(id);
      setMessage(
        `Custom API sync — ${result.created} created, ${result.updated} updated (${result.total} total)`,
      );
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Custom API sync failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleRunWorker() {
    setBusy(true);
    try {
      const result = await runIntegrationWorker();
      setMessage(
        `Worker run — events: ${result.events.processed}/${result.events.total}, Odoo: ${result.odoo.synced} synced, Custom API: ${result.customApi.synced} synced`,
      );
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Worker run failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(connector: InstalledConnector) {
    setBusy(true);
    try {
      await updateConnector(connector.id, { active: !connector.active });
      setMessage(`${catalogName(connector)} ${connector.active ? 'disabled' : 'enabled'}`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  function openConnectorConfig(connectorId: string) {
    setExpandedConnectorId(connectorId);
    requestAnimationFrame(() => {
      installedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function closeConnectorConfig() {
    setExpandedConnectorId(null);
  }

  function findInstalledByType(type: string) {
    return installed.find((c) => c.type === type);
  }

  function handleConfigureByType(type: string) {
    const connector = findInstalledByType(type);
    if (connector) openConnectorConfig(connector.id);
  }

  async function handleUninstall(connector: InstalledConnector) {
    const name = catalogName(connector);
    if (!window.confirm(`Uninstall ${name}? Webhook URL and settings will be removed.`)) return;
    setBusy(true);
    try {
      await uninstallConnector(connector.id);
      if (expandedConnectorId === connector.id) setExpandedConnectorId(null);
      setMessage(`${name} uninstalled`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Uninstall failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleUninstallByType(type: string) {
    const connector = findInstalledByType(type);
    if (connector) await handleUninstall(connector);
  }

  function webhookUrl(type: string) {
    if (type === 'ISP') return `${API_BASE}/integration/isp/${tenantCode}/webhook`;
    if (type === 'IOT') return `${API_BASE}/integration/iot/${tenantCode}/work-order`;
    return '';
  }

  function catalogIcon(type: string) {
    return catalog.find((c) => c.type === type)?.icon ?? '🔌';
  }

  function catalogName(connector: InstalledConnector) {
    return catalog.find((c) => c.type === connector.type)?.name ?? connector.name;
  }

  return (
    <div className="marketplace-page">
      <header className="marketplace-hero">
        <h1>Tunas Integration Marketplace</h1>
        <p>Connect your workflow platform to ERP, IoT, billing, Slack, Teams, and more.</p>
        <div className="marketplace-search">
          <Input
            placeholder="Search apps"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value) scrollToFilteredContent();
            }}
          />
        </div>
      </header>

      {message && <div className="marketplace-message">{message}</div>}

      {integrationStatus && (
        <Card title="Integration Status">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
              <span>
                <strong>Event queue:</strong> {integrationStatus.queue.pending} pending ·{' '}
                {integrationStatus.queue.processedLast24h} processed (24h)
              </span>
              <span>
                <strong>Connectors:</strong> {integrationStatus.connectors.filter((c) => c.active).length}{' '}
                active / {integrationStatus.connectors.length} installed
              </span>
              {integrationStatus.mqtt && (
                <span>
                  <strong>MQTT:</strong>{' '}
                  {integrationStatus.mqtt.enabled
                    ? integrationStatus.mqtt.connected
                      ? 'connected'
                      : 'enabled (disconnected)'
                    : 'disabled'}
                </span>
              )}
            </div>
            <Button disabled={busy} variant="secondary" onClick={handleRunWorker}>
              Run Worker Now
            </Button>
          </div>
        </Card>
      )}

      <div className="marketplace-layout">
        <aside className="marketplace-sidebar" aria-label="Marketplace filters">
          <Card title="Products">
            <div className="filter-list">
              {appFilters.map((app) => (
                <button
                  key={app.code}
                  type="button"
                  className={`filter-btn ${appFilter === app.code ? 'active' : ''}`}
                  onClick={() => applyAppFilter(app.code)}
                >
                  {app.label}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Category">
            <div className="filter-list">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`filter-btn ${category === cat ? 'active' : ''}`}
                  onClick={() => applyCategoryFilter(cat)}
                >
                  {cat === 'ALL' ? 'All' : cat.replace('_', ' ')}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Payment">
            <div className="filter-list">
              {pricingFilters.map((price) => (
                <button
                  key={price}
                  type="button"
                  className={`filter-btn ${pricingFilter === price ? 'active' : ''}`}
                  onClick={() => applyPricingFilter(price)}
                >
                  {price === 'ALL' ? 'All' : price.replace('_', ' ')}
                </button>
              ))}
            </div>
          </Card>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} style={{ width: '100%' }}>
              Clear filters
            </Button>
          )}
        </aside>

        <div className="marketplace-main" ref={mainContentRef}>
          {hasActiveFilters && (
            <div className="marketplace-active-filters">
              <span className="marketplace-active-filters-label">Active filters:</span>
              {appFilter !== 'ALL' && (
                <button type="button" className="filter-chip" onClick={() => applyAppFilter('ALL')}>
                  {appFilters.find((a) => a.code === appFilter)?.label ?? appFilter} ×
                </button>
              )}
              {category !== 'ALL' && (
                <button type="button" className="filter-chip" onClick={() => applyCategoryFilter('ALL')}>
                  {category} ×
                </button>
              )}
              {pricingFilter !== 'ALL' && (
                <button
                  type="button"
                  className="filter-chip"
                  onClick={() => applyPricingFilter('ALL')}
                >
                  {pricingFilter} ×
                </button>
              )}
              {search && (
                <button
                  type="button"
                  className="filter-chip"
                  onClick={() => {
                    setSearch('');
                    scrollToFilteredContent();
                  }}
                >
                  &quot;{search}&quot; ×
                </button>
              )}
              <span className="marketplace-filter-count">
                {filtered.length} app{filtered.length !== 1 ? 's' : ''} · {filteredInstalled.length}{' '}
                installed
              </span>
            </div>
          )}

          {filteredInstalled.length > 0 && (
            <section ref={installedSectionRef} className="marketplace-installed-section">
              <h2 className="marketplace-section-title">
                {hasActiveFilters ? 'Matching Installed Connectors' : 'Installed Connectors'}
              </h2>
              <p className="marketplace-section-sub">
                {hasActiveFilters
                  ? 'Installed integrations that match your current filters.'
                  : 'Manage active integrations for your tenant.'}
              </p>
              <div className={`installed-list ${!hasActiveFilters ? 'installed-list-compact' : ''}`}>
                {filteredInstalled.map((connector) => {
                  const secret = connector.config.webhook_secret as string | undefined;
                  const url = webhookUrl(connector.type);
                  const isOutbound = OUTBOUND_TYPES.has(connector.type);
                  const fullDetails = showFullConnectorDetails(
                    connector,
                    hasActiveFilters,
                    expandedConnectorId,
                  );
                  const displayName = catalogName(connector);
                  const isExpanded = expandedConnectorId === connector.id;

                  return (
                    <div
                      key={connector.id}
                      className={`installed-card ${!fullDetails ? 'installed-card-compact' : ''} ${isExpanded ? 'installed-card-expanded' : ''}`}
                    >
                      <div className="installed-card-header">
                        <div className="installed-card-identity">
                          <span className="installed-card-icon" aria-hidden>
                            {catalogIcon(connector.type)}
                          </span>
                          <div>
                            <strong>{displayName}</strong>
                            <div className="installed-card-meta">
                              {connector.type} · {connector.active ? 'Active' : 'Inactive'}
                            </div>
                          </div>
                        </div>
                        <div className="installed-card-header-actions">
                          {isExpanded && (
                            <Button variant="ghost" onClick={closeConnectorConfig}>
                              Tutup
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            disabled={busy}
                            onClick={() => toggleActive(connector)}
                          >
                            {connector.active ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      </div>

                      {!fullDetails && connector.type === 'ISP' && (
                        <IspConnectionStatus connector={connector} />
                      )}

                      {!fullDetails && connector.type === 'IOT' && (
                        <IotConnectionStatus
                          active={connector.active}
                          mqttConnected={integrationStatus?.mqtt?.connected}
                        />
                      )}

                      {!fullDetails && (
                        <div className="installed-card-actions">
                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() => openConnectorConfig(connector.id)}
                          >
                            Configure
                          </Button>
                          <Button
                            variant="danger"
                            disabled={busy}
                            onClick={() => handleUninstall(connector)}
                          >
                            Uninstall
                          </Button>
                        </div>
                      )}

                      {fullDetails && url && secret && (
                        <div className="installed-card-webhook">
                          <div>
                            <strong>Webhook URL:</strong>{' '}
                            <code>{url}</code>
                          </div>
                          <div>
                            <strong>Header:</strong>{' '}
                            <code>X-Webhook-Secret: {secret}</code>
                          </div>
                        </div>
                      )}

                      {fullDetails && connector.type === 'IOT' && connector.active && (
                        <IotConnectorPanel
                          connectorId={connector.id}
                          mqttConnected={integrationStatus?.mqtt?.connected}
                          onSaved={(msg) => setMessage(msg)}
                        />
                      )}

                      {fullDetails && connector.type === 'ISP' && connector.active && (
                        <IspConnectorPanel
                          connector={connector}
                          tenantCode={tenantCode}
                          onSaved={(msg) => {
                            setMessage(msg);
                            load().catch(console.error);
                          }}
                        />
                      )}

                      {fullDetails &&
                        (TESTABLE_TYPES.has(connector.type) || SYNC_TYPES.has(connector.type)) && (
                        <div
                          style={{
                            marginTop: '0.75rem',
                            display: 'flex',
                            gap: '0.5rem',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                          }}
                        >
                          {TESTABLE_TYPES.has(connector.type) && (
                            <Button
                              variant="secondary"
                              disabled={busy}
                              onClick={() => handleConnectorTest(connector.id, connector.type)}
                            >
                              Test Connection
                            </Button>
                          )}
                          {connector.type === 'ODOO' && (
                            <Button disabled={busy} onClick={() => handleOdooSync(connector.id)}>
                              Sync Assets
                            </Button>
                          )}
                          {connector.type === 'GOOGLE_CALENDAR' && (
                            <Button disabled={busy} onClick={() => handleCalendarSync(connector.id)}>
                              Sync PM Calendar
                            </Button>
                          )}
                          {connector.type === 'CUSTOM_API' && (
                            <Button disabled={busy} onClick={() => handleCustomApiSync(connector.id)}>
                              Sync Assets
                            </Button>
                          )}
                          {typeof connector.config.last_sync_at === 'string' && (
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                              Last sync: {new Date(connector.config.last_sync_at).toLocaleString()}
                              {typeof connector.config.last_sync_status === 'string'
                                ? ` (${connector.config.last_sync_status})`
                                : ''}
                            </span>
                          )}
                          {isOutbound &&
                            typeof connector.config.webhook_url === 'string' && (
                              <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                                Webhook configured
                                {typeof connector.config.channel_label === 'string' &&
                                connector.config.channel_label
                                  ? ` · #${connector.config.channel_label}`
                                  : ''}
                              </span>
                            )}
                          {connector.type === 'ANYDESK' &&
                            typeof connector.config.support_anydesk_id === 'string' && (
                              <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                                Support ID: {connector.config.support_anydesk_id}
                              </span>
                            )}
                        </div>
                      )}

                      {fullDetails && (
                        <div className="installed-card-actions">
                          <Button
                            variant="danger"
                            disabled={busy}
                            onClick={() => handleUninstall(connector)}
                          >
                            Uninstall
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {installed.length > 0 && filteredInstalled.length === 0 && hasActiveFilters && (
            <div className="marketplace-empty marketplace-empty-inline">
              No installed connectors match the current filters.
            </div>
          )}

          {!hasActiveFilters && (
            <section>
              <h2 className="marketplace-section-title">Popular Apps</h2>
              <p className="marketplace-section-sub">
                Most frequently installed apps by Tunas Workflow customers.
              </p>
              <div className="marketplace-grid">
                {popularApps.map((item) => (
                  <MarketplaceAppCard
                    key={`popular-${item.type}`}
                    item={item}
                    installed={installedTypes.has(item.type)}
                    busy={busy}
                    onInstall={handleInstall}
                    onConfigure={handleConfigureByType}
                    onUninstall={handleUninstallByType}
                  />
                ))}
              </div>
            </section>
          )}

          <section ref={catalogSectionRef} className="marketplace-catalog-section">
            <h2 className="marketplace-section-title">
              {hasActiveFilters ? 'Filtered Apps' : 'All Apps'}
            </h2>
            {hasActiveFilters && (
              <p className="marketplace-section-sub">
                Showing {filtered.length} of {catalog.length} marketplace apps.
              </p>
            )}
            {filtered.length === 0 ? (
              <div className="marketplace-empty">No apps match your filters.</div>
            ) : (
              <div className="marketplace-grid">
                {filtered.map((item) => (
                  <MarketplaceAppCard
                    key={item.type}
                    item={item}
                    installed={installedTypes.has(item.type)}
                    busy={busy}
                    onInstall={handleInstall}
                    onConfigure={handleConfigureByType}
                    onUninstall={handleUninstallByType}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {configuring && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <Card title={`Configure ${configuring.name}`}>
            <form
              onSubmit={handleConfiguredInstall}
              style={{ display: 'grid', gap: '0.75rem', minWidth: 360 }}
            >
              {configuring.configFields.map((field) =>
                field.type === 'textarea' ? (
                  <label key={field.key} className="input-group">
                    <span className="input-label">{field.label}</span>
                    <textarea
                      className="input-field"
                      rows={6}
                      value={configForm[field.key] ?? ''}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, [field.key]: e.target.value })
                      }
                      required={field.required}
                      style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                  </label>
                ) : (
                  <Input
                    key={field.key}
                    label={field.label}
                    type={field.type === 'password' ? 'password' : 'text'}
                    value={configForm[field.key] ?? ''}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, [field.key]: e.target.value })
                    }
                    required={field.required}
                  />
                ),
              )}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <Button type="button" variant="ghost" onClick={() => setConfiguring(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  Install
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
