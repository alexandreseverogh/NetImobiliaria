'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/marketing-utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface LocationEntry {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

interface Props {
  locations: LocationEntry[];
  onChange: (locations: LocationEntry[]) => void;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
}

const DEFAULT_CENTER: [number, number] = [-8.047562, -34.877003];
const DEFAULT_ZOOM = 5;
const MARKER_ICON_URL         = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png';
const MARKER_ICON_RETINA_URL  = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png';
const MARKER_SHADOW_URL       = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

const inputCls =
  'px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function formatLocationName(displayName: string): string {
  const parts = displayName.split(',').map(p => p.trim());
  return parts.length >= 3 ? `${parts[0]}, ${parts[1]}, ${parts[2]}` : parts.slice(0, 3).join(', ');
}

/* ══════════════════════════════════════════════════════════
   LOCATION PICKER
══════════════════════════════════════════════════════════ */
export function LocationPicker({ locations, onChange }: Props) {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mapOpen, setMapOpen]     = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationEntry | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocations = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=br&addressdetails=1`,
        { headers: { 'User-Agent': 'TrafegoPago/1.0' } }
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchLocations(value), 400);
  }

  function addLocation(result: NominatimResult) {
    const entry: LocationEntry = {
      id:        generateId(),
      name:      formatLocationName(result.display_name),
      latitude:  parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      radius:    25,
    };
    onChange([...locations, entry]);
    setQuery(''); setResults([]); setShowResults(false);
  }

  function removeLocation(id: string) { onChange(locations.filter(l => l.id !== id)); }
  function updateRadius(id: string, radius: number) {
    onChange(locations.map(l => l.id === id ? { ...l, radius: Math.max(1, Math.min(200, radius)) } : l));
  }
  function openMapForNew()               { setEditingLocation(null); setMapOpen(true); }
  function openMapForEdit(loc: LocationEntry) { setEditingLocation(loc); setMapOpen(true); }

  function handleMapSave(entry: LocationEntry) {
    if (editingLocation) onChange(locations.map(l => l.id === editingLocation.id ? entry : l));
    else                 onChange([...locations, entry]);
    setMapOpen(false); setEditingLocation(null);
  }

  return (
    <div className="space-y-3">

      {/* Selected locations list */}
      {locations.length > 0 && (
        <div className="space-y-2">
          {locations.map(loc => (
            <div key={loc.id}
              className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
              <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-gray-800 font-medium flex-1 truncate">{loc.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number" value={loc.radius}
                  onChange={e => updateRadius(loc.id, parseInt(e.target.value) || 1)}
                  min={1} max={200}
                  className="w-14 text-center text-xs bg-white border border-gray-200 rounded-lg py-1 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <span className="text-xs text-gray-400 font-medium">km</span>
              </div>
              <button onClick={() => openMapForEdit(loc)}
                className="text-gray-400 hover:text-gray-700 transition-colors p-1" title="Ver no mapa">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </button>
              <button onClick={() => removeLocation(loc.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Remover">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search + map button */}
      <div ref={wrapperRef} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={e => handleInputChange(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              placeholder="Buscar cidade, bairro ou endereço..."
              className={cn(inputCls, 'w-full pr-8')}
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-gold-premium border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <button
            onClick={openMapForNew}
            className="px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all shrink-0"
            title="Selecionar no mapa"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
        </div>

        {/* Dropdown results */}
        {showResults && results.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {results.map(r => (
              <button key={r.place_id} onClick={() => addLocation(r)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 flex items-start gap-2">
                <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-gray-700">{formatLocationName(r.display_name)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {locations.length === 0 && (
        <p className="text-xs text-gray-400">
          Brasil inteiro (padrão). Adicione localidades para restringir a área de exibição.
        </p>
      )}

      {mapOpen && (
        <MapModal
          initial={editingLocation}
          onSave={handleMapSave}
          onClose={() => { setMapOpen(false); setEditingLocation(null); }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAP MODAL
══════════════════════════════════════════════════════════ */
interface MapModalProps {
  initial: LocationEntry | null;
  onSave: (entry: LocationEntry) => void;
  onClose: () => void;
}

function MapModal({ initial, onSave, onClose }: MapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<L.Map | null>(null);
  const markerRef       = useRef<L.Marker | null>(null);
  const circleRef       = useRef<L.Circle | null>(null);

  const [position, setPosition] = useState<{ lat: number; lng: number }>(
    initial ? { lat: initial.latitude, lng: initial.longitude } : { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] }
  );
  const [radius, setRadius] = useState(initial?.radius ?? 25);
  const [name, setName]     = useState(initial?.name ?? '');
  const [mapSearch, setMapSearch] = useState('');
  const [hasPin, setHasPin] = useState(!!initial);

  function placePin(map: L.Map, lat: number, lng: number, zoomTo = true) {
    setPosition({ lat, lng });
    setHasPin(true);

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current!.getLatLng();
        setPosition({ lat: pos.lat, lng: pos.lng });
        if (circleRef.current) circleRef.current.setLatLng(pos);
        reverseGeocode(pos.lat, pos.lng);
      });
    }

    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
    } else {
      circleRef.current = L.circle([lat, lng], {
        radius: radius * 1000, color: '#c5a028', fillColor: '#c5a028', fillOpacity: 0.12, weight: 2,
      }).addTo(map);
    }

    if (zoomTo && circleRef.current) {
      map.fitBounds(circleRef.current.getBounds(), { padding: [40, 40] });
    }

    reverseGeocode(lat, lng);
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: MARKER_ICON_RETINA_URL,
      iconUrl:       MARKER_ICON_URL,
      shadowUrl:     MARKER_SHADOW_URL,
    });

    const center: [number, number] = initial
      ? [initial.latitude, initial.longitude]
      : DEFAULT_CENTER;

    const map = L.map(mapContainerRef.current, {
      center, zoom: initial ? 12 : DEFAULT_ZOOM, scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    if (!initial) {
      navigator.geolocation.getCurrentPosition(
        pos => { map.setView([pos.coords.latitude, pos.coords.longitude], 13); },
        () => {},
        { timeout: 5000 }
      );
    }

    if (initial) {
      const marker = L.marker([initial.latitude, initial.longitude], { draggable: true }).addTo(map);
      const circle = L.circle([initial.latitude, initial.longitude], {
        radius: initial.radius * 1000, color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.12, weight: 2,
      }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setPosition({ lat: pos.lat, lng: pos.lng });
        circle.setLatLng(pos);
        reverseGeocode(pos.lat, pos.lng);
      });
      markerRef.current = marker;
      circleRef.current = circle;
      map.fitBounds(circle.getBounds(), { padding: [30, 30] });
    }

    map.on('click', (e: L.LeafletMouseEvent) => { placePin(map, e.latlng.lat, e.latlng.lng, false); });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null; markerRef.current = null; circleRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius * 1000);
      if (mapRef.current && circleRef.current) {
        mapRef.current.fitBounds(circleRef.current.getBounds(), { padding: [30, 30] });
      }
    }
  }, [radius]);

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'User-Agent': 'TrafegoPago/1.0' } }
      );
      const data = await res.json();
      if (data.display_name) setName(formatLocationName(data.display_name));
    } catch { /* ignore */ }
  }

  async function handleMapSearch() {
    if (mapSearch.length < 3 || !mapRef.current) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(mapSearch)}&format=json&limit=1&countrycodes=br`,
        { headers: { 'User-Agent': 'TrafegoPago/1.0' } }
      );
      const data: NominatimResult[] = await res.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setName(formatLocationName(data[0].display_name));
        placePin(mapRef.current, lat, lng);
      }
    } catch { /* ignore */ }
  }

  function handleSave() {
    if (!hasPin) return;
    onSave({
      id:        initial?.id ?? generateId(),
      name:      name || `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`,
      latitude:  position.lat,
      longitude: position.lng,
      radius,
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-5xl max-h-[92vh] m-4 shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-base font-bold text-gray-900">
            {initial ? 'Editar Localidade' : 'Selecionar no Mapa'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex gap-2 shrink-0">
            <input
              type="text"
              value={mapSearch}
              onChange={e => setMapSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMapSearch()}
              placeholder="Buscar local no mapa..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            />
            <button
              onClick={handleMapSearch}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
            >
              Buscar
            </button>
          </div>

          <div
            ref={mapContainerRef}
            className="w-full flex-1 min-h-[400px] rounded-xl overflow-hidden border border-gray-200"
          />

          {hasPin
            ? <p className="text-xs text-gray-500 text-center shrink-0">{name}</p>
            : <p className="text-xs text-gray-400 text-center shrink-0">Clique no mapa ou busque um local para posicionar o ponto</p>
          }

          <div className="flex items-center gap-4 shrink-0">
            <label className="text-sm text-gray-500 shrink-0">Raio de abrangência:</label>
            <input
              type="range" min={1} max={200} value={radius}
              onChange={e => setRadius(parseInt(e.target.value))}
              className="flex-1 accent-gold-premium"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number" value={radius}
                onChange={e => setRadius(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
                min={1} max={200}
                className="w-16 text-center text-sm bg-white border border-gray-200 rounded-xl py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-sm text-gray-500">km</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-white transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!hasPin}
            className={cn(
              'px-5 py-2.5 rounded-xl text-sm font-black transition-all',
              hasPin
                ? 'bg-gold-premium text-navy-dark hover:bg-gold shadow-sm'
                : 'bg-gray-300 text-white cursor-not-allowed opacity-60'
            )}
          >
            {initial ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}
