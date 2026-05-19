'use client';

/**
 * Phase 14B — Detalle de usuario admin.
 *
 * Antes la página /admin/users solo abría un modal con info mínima. El
 * backend ya expone GET /admin/users/:id con empresa + certificados +
 * stats (totalLotes, totalPedidos, totalTransacciones); esta página lo
 * consume.
 */
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertTriangle, ShieldCheck, ShieldOff, Mail, MapPin, Building } from 'lucide-react';
import { api } from '@/lib/api';

interface Cert {
  id: string;
  numeroCertificado: string;
  estado: string;
  fechaCaducidad: string | null;
  archivoUrl: string | null;
}

interface UserDetail {
  user: {
    id: string;
    nombre: string;
    apellidos: string;
    email: string;
    telefono: string | null;
    role: string;
    estado: string;
    createdAt: string;
    empresa: {
      razonSocial: string;
      cifNif: string;
      formaJuridica: string | null;
      direccionFiscal: string;
      ciudad: string | null;
      codigoPostal: string | null;
      pais: string;
      iban: string | null;
      regimenFiscal: string | null;
    } | null;
  };
  certificados: Cert[];
  stats: {
    totalLotes: number;
    totalPedidos: number;
    totalTransacciones: number;
  };
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-ES'); } catch { return '—'; }
}

const ESTADO_BADGE: Record<string, string> = {
  VERIFICADO_ACTIVO: 'bg-green-100 text-green-700',
  EMAIL_NO_VERIFICADO: 'bg-amber-100 text-amber-700',
  PENDIENTE_VERIFICACION: 'bg-blue-100 text-blue-700',
  SUSPENDIDO: 'bg-red-100 text-red-700',
};

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<'verify' | 'reject' | 'suspend' | 'ban' | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data: res } = await api.get<{ data: UserDetail }>(`/admin/users/${id}`);
      setData(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudo cargar el usuario.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [id]);

  async function changeEstado(nuevoEstado: string) {
    setActing('verify');
    try {
      await api.patch(`/admin/users/${id}/estado`, { estado: nuevoEstado });
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudo cambiar el estado.';
      alert(msg);
    } finally {
      setActing(null);
    }
  }

  async function banUser() {
    const reason = window.prompt('Motivo del baneo (opcional):');
    if (reason === null) return; // cancelado
    setActing('ban');
    try {
      await api.post(`/admin/users/${id}/ban`, { reason });
      router.push('/admin/users');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudo banear el usuario.';
      alert(msg);
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <p className="text-sm text-red-700">{error ?? 'Usuario no encontrado.'}</p>
        <Link href="/admin/users" className="text-xs text-primary-dark hover:underline">← Volver a usuarios</Link>
      </div>
    );
  }

  const u = data.user;
  const e = u.empresa;
  const estadoCls = ESTADO_BADGE[u.estado] ?? 'bg-muted text-text-secondary';

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-foreground">
        <ArrowLeft className="w-3.5 h-3.5" /> Volver a usuarios
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">{u.nombre} {u.apellidos}</h1>
          <p className="text-xs text-text-secondary flex items-center gap-1 mt-1">
            <Mail className="w-3 h-3" /> {u.email}
            {u.telefono && <span className="ml-2">· {u.telefono}</span>}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${estadoCls}`}>{u.estado}</span>
            <span className="text-[11px] text-text-secondary">{u.role}</span>
            <span className="text-[11px] text-text-muted">Alta: {fmtDate(u.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {u.estado !== 'VERIFICADO_ACTIVO' && u.estado !== 'SUSPENDIDO' && (
            <button
              onClick={() => changeEstado('VERIFICADO_ACTIVO')}
              disabled={acting !== null}
              className="text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Verificar
            </button>
          )}
          {u.estado === 'VERIFICADO_ACTIVO' && (
            <button
              onClick={() => changeEstado('SUSPENDIDO')}
              disabled={acting !== null}
              className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 flex items-center gap-1.5"
            >
              <ShieldOff className="w-3.5 h-3.5" />
              Suspender
            </button>
          )}
          <button
            onClick={banUser}
            disabled={acting !== null || u.estado === 'SUSPENDIDO'}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 flex items-center gap-1.5"
          >
            <ShieldOff className="w-3.5 h-3.5" />
            Banear (registra bloqueo)
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-card p-4">
          <p className="text-[11px] text-text-secondary uppercase tracking-wide">Lotes</p>
          <p className="text-2xl font-bold text-foreground mt-1">{data.stats.totalLotes}</p>
        </div>
        <div className="bg-card border border-border rounded-card p-4">
          <p className="text-[11px] text-text-secondary uppercase tracking-wide">Pedidos</p>
          <p className="text-2xl font-bold text-foreground mt-1">{data.stats.totalPedidos}</p>
        </div>
        <div className="bg-card border border-border rounded-card p-4">
          <p className="text-[11px] text-text-secondary uppercase tracking-wide">Transacciones</p>
          <p className="text-2xl font-bold text-foreground mt-1">{data.stats.totalTransacciones}</p>
        </div>
      </div>

      {/* Empresa */}
      <div className="bg-card border border-border rounded-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Building className="w-4 h-4 text-text-secondary" /> Empresa
        </h2>
        {!e ? (
          <p className="text-xs text-text-secondary">Este usuario no tiene datos de empresa registrados.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-y-2 gap-x-6 text-xs">
            <dt className="text-text-secondary">Razón social</dt>
            <dd className="font-medium">{e.razonSocial}</dd>
            <dt className="text-text-secondary">CIF/NIF</dt>
            <dd className="font-medium">{e.cifNif}</dd>
            {e.formaJuridica && <><dt className="text-text-secondary">Forma jurídica</dt><dd>{e.formaJuridica}</dd></>}
            <dt className="text-text-secondary">Dirección</dt>
            <dd className="font-medium">
              <MapPin className="w-3 h-3 inline mr-1" />
              {e.direccionFiscal}
              {e.ciudad && <>, {e.ciudad}</>}
              {e.codigoPostal && <> {e.codigoPostal}</>}
              {e.pais && <>, {e.pais}</>}
            </dd>
            {e.iban && <><dt className="text-text-secondary">IBAN</dt><dd className="font-mono text-[11px]">{e.iban}</dd></>}
            {e.regimenFiscal && <><dt className="text-text-secondary">Régimen fiscal</dt><dd>{e.regimenFiscal}</dd></>}
          </dl>
        )}
      </div>

      {/* Certificados */}
      <div className="bg-card border border-border rounded-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Certificados ({data.certificados.length})</h2>
        {data.certificados.length === 0 ? (
          <p className="text-xs text-text-secondary">No hay certificados subidos.</p>
        ) : (
          <div className="space-y-2">
            {data.certificados.map((c) => (
              <div key={c.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-foreground">{c.numeroCertificado}</p>
                  <p className="text-[11px] text-text-secondary">
                    {c.estado} · Caduca: {fmtDate(c.fechaCaducidad)}
                  </p>
                </div>
                {c.archivoUrl && (
                  <a href={c.archivoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-dark hover:underline">
                    Ver archivo
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
