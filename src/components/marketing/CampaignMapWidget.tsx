'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface CampaignInfo {
  id: string;
  name: string;
  status: string;
  leads: number;
  spend: number;
}

interface MapLocation {
  name: string;
  lat: number;
  lng: number;
  radius?: number;
  campaigns: CampaignInfo[];
}

interface Props {
  isDark: boolean;
  clientId?: string | null;
  segmentId?: string | null;
  startDate?: string;
  endDate?: string;
  className?: string;
}

// ── SVG campaign pin icon ──────────────────────────────────────────────────────
function makeCampaignIcon(count: number, isDark: boolean): string {
  const color = count >= 5 ? '#f59e0b' : count >= 2 ? '#818cf8' : '#34d399';
  const label = count > 9 ? '9+' : String(count);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
    <defs>
      <filter id="sh" x="-30%" y="-20%" width="160%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.35"/>
      </filter>
    </defs>
    <!-- Pin body -->
    <path d="M20 2C12.268 2 6 8.268 6 16c0 10 14 30 14 30s14-20 14-30c0-7.732-6.268-14-14-14z"
      fill="${color}" filter="url(#sh)"/>
    <!-- Inner circle -->
    <circle cx="20" cy="16" r="8" fill="white" opacity="0.25"/>
    <!-- Megaphone icon inside -->
    <text x="20" y="20" text-anchor="middle" dominant-baseline="middle"
      font-size="12" fill="white">📢</text>
    <!-- Count badge -->
    ${count > 1 ? `<circle cx="32" cy="8" r="8" fill="#ef4444" stroke="white" stroke-width="1.5"/>
    <text x="32" y="8" text-anchor="middle" dominant-baseline="middle"
      font-size="8" font-weight="900" fill="white">${label}</text>` : ''}
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

export function CampaignMapWidget({ isDark, clientId, segmentId, startDate, endDate, className }: Props) {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const mapRef    = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);

  const cardCls = isDark
    ? 'bg-[rgba(13,20,33,0.92)] backdrop-blur-sm border border-[rgba(255,255,255,0.07)] shadow-[0_2px_16px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.03)]'
    : 'bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]';
  const tx      = isDark ? 'text-slate-300' : 'text-slate-900';
  const txFaint = isDark ? 'text-slate-500' : 'text-slate-400';

  // ── Fetch data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (clientId)  params.set('clientId',  clientId);
    if (segmentId) params.set('segmentId', segmentId);
    if (startDate) params.set('startDate', startDate);
    if (endDate)   params.set('endDate',   endDate);

    setLoading(true);
    setError(null);
    fetch(`/api/admin/campanhas/dashboard/campaign-map?${params}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok || d.error) {
          console.error('[CampaignMap] API error', r.status, d.error);
          setError(d.error ?? `HTTP ${r.status}`);
        } else {
          setLocations(d.locations ?? []);
        }
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [clientId, segmentId, startDate, endDate]);

  // ── Initialize / update Leaflet map ────────────────────────────────────────
  useEffect(() => {
    if (loading || !mapRef.current || typeof window === 'undefined') return;

    // Lazy-load Leaflet (browser only)
    import('leaflet').then(L => {
      const Lf = L.default || L;

      // Destroy existing map
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }

      if (!mapRef.current) return;

      // Dark tile layer
      const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      const map = Lf.map(mapRef.current, {
        center:          [-15.7801, -47.9292],
        zoom:            4,
        zoomControl:     true,
        attributionControl: false,
        scrollWheelZoom: false,
      });

      Lf.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: '© CARTO',
      }).addTo(map);

      if (locations.length === 0) {
        leafletRef.current = map;
        return;
      }

      const bounds: [number, number][] = [];

      for (const loc of locations) {
        bounds.push([loc.lat, loc.lng]);

        // Custom icon
        const iconUrl = makeCampaignIcon(loc.campaigns.length, isDark);
        const icon = Lf.icon({
          iconUrl,
          iconSize:   [40, 48],
          iconAnchor: [20, 48],
          popupAnchor: [0, -48],
        });

        const totalLeads = loc.campaigns.reduce((s, c) => s + c.leads, 0);
        const totalSpend = loc.campaigns.reduce((s, c) => s + c.spend, 0);

        const popupContent = `
          <div style="font-family:system-ui,-apple-system,sans-serif;min-width:200px;padding:4px">
            <p style="font-size:13px;font-weight:800;margin:0 0 8px;color:${isDark ? '#e2e8f0' : '#0f172a'}">${loc.name}</p>
            <div style="display:flex;gap:12px;margin-bottom:10px">
              <div>
                <p style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Campanhas</p>
                <p style="font-size:16px;font-weight:900;color:#818cf8;margin:0">${loc.campaigns.length}</p>
              </div>
              <div>
                <p style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Leads</p>
                <p style="font-size:16px;font-weight:900;color:#34d399;margin:0">${totalLeads}</p>
              </div>
              <div>
                <p style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Gasto</p>
                <p style="font-size:16px;font-weight:900;color:#f59e0b;margin:0">R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:8px">
              ${loc.campaigns.map(c => `
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                  <span style="width:7px;height:7px;border-radius:50%;background:${c.status === 'ACTIVE' ? '#34d399' : '#94a3b8'};flex-shrink:0"></span>
                  <span style="font-size:11px;font-weight:600;color:${isDark ? '#cbd5e1' : '#374151'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px">${c.name}</span>
                </div>
              `).join('')}
            </div>
            ${loc.radius ? `<p style="font-size:9px;color:#94a3b8;margin:6px 0 0">Raio: ${loc.radius} km</p>` : ''}
          </div>
        `;

        const popup = Lf.popup({
          className: isDark ? 'leaflet-popup-dark' : '',
          maxWidth:  240,
        }).setContent(popupContent);

        // Draw radius circle for custom_locations
        if (loc.radius) {
          Lf.circle([loc.lat, loc.lng], {
            radius:      loc.radius * 1000,
            color:       '#818cf8',
            fillColor:   '#818cf8',
            fillOpacity: 0.08,
            weight:      1.5,
            dashArray:   '4 4',
          }).addTo(map);
        }

        Lf.marker([loc.lat, loc.lng], { icon })
          .bindPopup(popup)
          .addTo(map);
      }

      if (bounds.length > 0) {
        try {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
        } catch (_) {}
      }

      leafletRef.current = map;

      // Invalidate size on window resize to prevent white lines
      const handleResize = () => {
        if (leafletRef.current) {
          leafletRef.current.invalidateSize();
        }
      };
      window.addEventListener('resize', handleResize);

      // Delay initial invalidateSize
      setTimeout(() => {
        if (leafletRef.current) {
          leafletRef.current.invalidateSize();
        }
      }, 300);

    });

    return () => {
      window.removeEventListener('resize', () => {});
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, [loading, locations, isDark]);

  // ── Summary stats ───────────────────────────────────────────────────────────
  const totalCampaigns = new Set(locations.flatMap(l => l.campaigns.map(c => c.id))).size;
  const totalLocations = locations.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`rounded-2xl p-6 flex flex-col ${cardCls} ${className || ''}`}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className={`text-sm font-black ${tx}`}>Geolocalização das Campanhas</h3>
          <p className={`text-[10px] mt-0.5 ${txFaint}`}>Distribuição geográfica dos públicos-alvo</p>
        </div>
        {!loading && (
          <div className="flex gap-2 shrink-0">
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${
              isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                     : 'bg-indigo-50 text-indigo-500 border border-indigo-100'
            }`}>
              {totalLocations} {totalLocations === 1 ? 'região' : 'regiões'}
            </span>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${
              isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                     : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}>
              {totalCampaigns} camp.
            </span>
          </div>
        )}
      </div>

      {/* ── Map or states ── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center" style={{ minHeight: 260 }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-gold-premium border-t-transparent animate-spin" />
            <p className={`text-xs ${txFaint}`}>Carregando mapa…</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center" style={{ minHeight: 260 }}>
          <p className={`text-xs ${txFaint}`}>Erro ao carregar: {error}</p>
        </div>
      ) : locations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ minHeight: 260 }}>
          <span className="text-3xl">📍</span>
          <p className={`text-xs ${txFaint}`}>Nenhuma localização configurada nas campanhas</p>
        </div>
      ) : (
        <>
          <div
            ref={mapRef}
            style={{ borderRadius: 12, overflow: 'hidden', minHeight: 260 }}
            className={`flex-1 ${isDark ? 'leaflet-dark-map' : ''}`}
          />
          {/* ── Location list ── */}
          <div className="mt-3 flex flex-col gap-1.5 max-h-28 overflow-y-auto pr-1">
            {locations.map((loc, i) => {
              const active = loc.campaigns.filter(c => c.status === 'ACTIVE').length;
              return (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">📢</span>
                    <span className={`text-[11px] font-semibold truncate ${tx}`}>{loc.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      {loc.campaigns.length} camp.
                    </span>
                    {active > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className={`text-[9px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{active} ativa{active > 1 ? 's' : ''}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
