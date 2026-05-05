'use client';

import { useEffect, useState, useMemo } from 'react';
import { Star, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { MatchCard, type Match } from '@/components/ui/MatchCard';
import { ContributeModal } from '@/components/ui/ContributeModal';

type Tab = 'best' | 'distance' | 'newest';

interface IncotermPrefs {
  recommended: string;
  selected: string[];
  done: boolean;
}

function loadIncotermPrefs(): IncotermPrefs | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('primaria_incoterms');
    if (!raw) return null;
    return JSON.parse(raw) as IncotermPrefs;
  } catch {
    return null;
  }
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'best', label: 'Best Match' },
  { key: 'distance', label: 'Closest Distance' },
  { key: 'newest', label: 'Newest' },
];

interface ApiMatchItem {
  id: string;
  loteId: string;
  pedidoId: string;
  cantidadKg: string;
  precioKg: string;
  calibresJson: unknown;
  estado: string;
  scoreMatching: number | null;
  scoreDetalle: unknown;
  createdAt?: string;
  pedido: {
    id: string;
    destinoFinal: string | null;
    calibresSolicitados: unknown;
    producto: { nombre: string };
    variedad: { nombre: string } | null;
  };
  lote: {
    id: string;
    calibres: unknown;
    direccionRecogida: string;
  };
  distanceKm?: number;
  coverage?: number;
}

function sortMatches(matches: Match[], tab: Tab): Match[] {
  const copy = [...matches];
  if (tab === 'best') {
    return copy.sort((a, b) => (b.scoreMatching ?? 0) - (a.scoreMatching ?? 0));
  }
  if (tab === 'distance') {
    return copy.sort((a, b) => {
      const da = a.distanceKm ?? Infinity;
      const db = b.distanceKm ?? Infinity;
      return da - db;
    });
  }
  // newest — sort by createdAt descending (not in Match type, keep original order as fallback)
  return copy;
}

function computeTotalProfit(matches: Match[]): number {
  return matches.reduce((sum, m) => {
    const qty = parseFloat(m.cantidadKg);
    const price = parseFloat(m.precioKg);
    return sum + (isNaN(qty) || isNaN(price) ? 0 : qty * price);
  }, 0);
}

export default function SellerMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('best');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reservingAll, setReservingAll] = useState(false);
  const [incotermPrefs, setIncotermPrefs] = useState<IncotermPrefs | null>(null);
  const [incotermFilter, setIncotermFilter] = useState<Set<string>>(new Set());
  const [showIncotermFilter, setShowIncotermFilter] = useState(false);

  async function fetchMatches() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: ApiMatchItem[] }>(
        '/matching/seller/matches'
      );
      setMatches((res.data.data ?? []) as Match[]);
    } catch {
      setError('Failed to load matches. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMatches();
    const prefs = loadIncotermPrefs();
    if (prefs?.done) {
      setIncotermPrefs(prefs);
      // Auto-select recommended incoterms from the wizard
      setIncotermFilter(new Set(prefs.selected));
    }
  }, []);

  // Filter matches by incoterm if filter is active
  const filtered = useMemo(() => {
    if (!incotermPrefs?.done || incotermFilter.size === 0) return matches;
    return matches.filter((m) => {
      // The match pedido has an incoterm field — filter by it
      const pedidoIncoterm = (m.pedido as { incoterm?: string }).incoterm;
      if (!pedidoIncoterm) return true;
      return incotermFilter.has(pedidoIncoterm);
    });
  }, [matches, incotermFilter, incotermPrefs]);

  const sorted = useMemo(() => sortMatches(filtered, activeTab), [filtered, activeTab]);
  const totalProfit = useMemo(() => computeTotalProfit(filtered), [filtered]);

  function handleContribute(match: Match) {
    setSelectedMatch(match);
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    setSelectedMatch(null);
  }

  function handleModalSuccess() {
    fetchMatches();
  }

  async function handleReserveAll() {
    const pending = matches.filter(
      (m) => m.estado === 'PROPUESTO' || m.estado === 'ENVIADO_VENDEDOR'
    );
    if (pending.length === 0) return;

    const confirmed = window.confirm(
      `Accept all ${pending.length} pending matches? We'll contribute the maximum feasible quantity for each, sorted by profitability.`
    );
    if (!confirmed) return;

    setReservingAll(true);
    let failCount = 0;

    // Sort by scoreMatching desc (most profitable first)
    const sorted = [...pending].sort((a, b) => (b.scoreMatching ?? 0) - (a.scoreMatching ?? 0));

    // Track how much of each lot we've already committed in this batch
    const lotCommitted: Record<string, number> = {};

    for (const match of sorted) {
      try {
        type LoteCalibre = { calibre: string; cantidad_kg: number; precio_min_kg: number };
        type PedCalibre = { calibre: string; cantidad_kg: number; precio_max_kg: number };
        const loteCalibres = (match.lote?.calibres as LoteCalibre[] | null) ?? [];
        const pedidoCalibres = (match.pedido.calibresSolicitados as PedCalibre[] | null) ?? [];

        // Get already committed kg on this lot
        const loteKey = match.loteId ?? match.lote?.id ?? '';
        const alreadyCommitted = lotCommitted[loteKey] ?? 0;

        const calibresContribucion = loteCalibres
          .flatMap((lc) => {
            const pc = pedidoCalibres.find(
              (p) => p.calibre === lc.calibre && lc.precio_min_kg <= p.precio_max_kg
            );
            if (!pc) return [];
            // Remaining lot capacity for this calibre
            const availableKg = Math.max(0, lc.cantidad_kg - alreadyCommitted);
            const cantidad_kg = Math.min(availableKg, pc.cantidad_kg);
            if (cantidad_kg <= 0) return [];
            return [{ calibre: lc.calibre, cantidad_kg }];
          });

        if (calibresContribucion.length === 0 || calibresContribucion.every((c) => c.cantidad_kg <= 0)) {
          // Skip — no capacity left
          continue;
        }

        await api.post(`/matching/matches/${match.id}/contribute`, { calibresContribucion });

        // Track committed kg for this lot
        const totalContributed = calibresContribucion.reduce((s, c) => s + c.cantidad_kg, 0);
        lotCommitted[loteKey] = (lotCommitted[loteKey] ?? 0) + totalContributed;

      } catch {
        failCount += 1;
      }
    }

    setReservingAll(false);
    fetchMatches();

    if (failCount > 0) {
      alert(`${failCount} match${failCount > 1 ? 'es' : ''} could not be reserved. Please try again individually.`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Your Matching Orders</h1>
        <p className="text-sm text-text-secondary mt-1">
          Orders that best match your published lots.
        </p>
      </div>

      {/* Incoterm filter — shown when wizard has been completed */}
      {incotermPrefs?.done && (
        <div className="bg-white border border-border rounded-card px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-text-primary">
                Incoterm filter
                {incotermPrefs.recommended && (
                  <span className="ml-2 text-xs text-text-secondary">
                    (Recommended: <span className="font-semibold text-primary">{incotermPrefs.recommended}</span>)
                  </span>
                )}
              </span>
              <span className="text-xs text-text-secondary">
                {incotermFilter.size} / {incotermPrefs.selected.length} selected
              </span>
            </div>
            <button
              onClick={() => setShowIncotermFilter((v) => !v)}
              className="text-xs text-primary hover:underline"
            >
              {showIncotermFilter ? 'Hide' : 'Edit'}
            </button>
          </div>

          {showIncotermFilter && (
            <div className="mt-3 flex flex-wrap gap-2">
              {incotermPrefs.selected.map((code) => {
                const active = incotermFilter.has(code);
                const isRec = code === incotermPrefs.recommended;
                return (
                  <button
                    key={code}
                    onClick={() => setIncotermFilter((prev) => {
                      const next = new Set(prev);
                      active ? next.delete(code) : next.add(code);
                      return next;
                    })}
                    className={[
                      'px-3 py-1 rounded-badge text-xs font-medium border transition-colors',
                      active
                        ? isRec
                          ? 'bg-primary text-gray-900 border-primary'
                          : 'bg-primary/10 border-primary text-text-primary'
                        : 'bg-white border-border text-text-muted line-through',
                    ].join(' ')}
                  >
                    {code}{isRec ? ' ★' : ''}
                  </button>
                );
              })}
              <button
                onClick={() => setIncotermFilter(new Set(incotermPrefs.selected))}
                className="text-xs text-text-secondary hover:text-text-primary underline ml-1"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      )}

      {/* Automated Best Match banner */}
      {!loading && matches.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-yellow-50 border border-primary/40 rounded-card px-5 py-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary flex-shrink-0 fill-primary" />
            <div>
              <p className="font-semibold text-text-primary text-sm">
                Automated Best Match
              </p>
              <p className="text-xs text-text-secondary">
                Est. Potential Revenue:{' '}
                <span className="font-bold text-text-primary">
                  €{totalProfit.toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="ml-1 text-text-secondary font-normal">(across all pending matches)</span>
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleReserveAll}
            disabled={reservingAll}
          >
            {reservingAll ? 'Reserving...' : 'Review & Reserve All'}
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-input w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'px-4 py-1.5 text-sm font-medium rounded transition-colors duration-150',
              activeTab === tab.key
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-card border border-border p-5 h-32 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-card px-5 py-4 text-sm text-red-600">
          {error}
          <button
            onClick={fetchMatches}
            className="ml-3 underline font-medium hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Star className="w-8 h-8 text-gray-300" />
          </div>
          <p className="font-semibold text-text-primary mb-1">No matching orders found yet.</p>
          <p className="text-sm text-text-secondary max-w-sm">
            Make sure your lots are published so buyers can find them.
          </p>
        </div>
      )}

      {!loading && !error && sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map((match) => (
            <MatchCard key={match.id} match={match} onContribute={handleContribute} />
          ))}
        </div>
      )}

      {/* Contribute modal */}
      <ContributeModal
        match={selectedMatch}
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
