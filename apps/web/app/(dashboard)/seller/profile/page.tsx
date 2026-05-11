'use client';
import { useState, useEffect, useCallback } from 'react';
import { Lock, Building2, User, FileCheck2, Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { IncotermWizard } from '@/components/ui/IncotermWizard';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

type Tab = 'account' | 'company' | 'documents' | 'contracts';

const INCOTERMS_INFO = [
  { code: 'EXW', name: 'Ex Works', scope: 'Nacional', desc: 'El comprador recoge en tu explotación y gestiona todo el transporte.' },
  { code: 'FCA', name: 'Franco Transportista', scope: 'Intra-UE', desc: 'Entregas al transportista del comprador en un punto acordado (lonja, cooperativa).' },
  { code: 'CPT', name: 'Transporte Pagado Hasta', scope: 'Intra-UE', desc: 'Tú contratas el transporte hasta destino; el riesgo pasa al primer transportista.' },
  { code: 'CIP', name: 'Transporte y Seguro Pagados', scope: 'Intra-UE', desc: 'Como CPT pero también contratas el seguro mínimo (110% del valor). Ideal para perecederos.' },
  { code: 'DAP', name: 'Entregado en Lugar', scope: 'Internacional', desc: 'Entregas en el destino del comprador. Él solo descarga y gestiona importación.' },
  { code: 'DPU', name: 'Entregado y Descargado', scope: 'Internacional', desc: 'Como DAP pero también te encargas de la descarga en destino.' },
  { code: 'DDP', name: 'Entregado con Derechos Pagados', scope: 'Internacional', desc: 'Máxima responsabilidad: pagas aduanas de importación. Solo para exportadores experimentados.' },
  { code: 'FOB', name: 'Franco a Bordo', scope: 'Solo marítimo', desc: 'Solo transporte marítimo. Entregas a bordo del buque en el puerto de origen.' },
  { code: 'CIF', name: 'Coste, Seguro y Flete', scope: 'Solo marítimo', desc: 'Solo marítimo. Pagas flete y seguro hasta destino; riesgo pasa al embarcar.' },
];

interface Certificate {
  id: string;
  tipo: string;
  estado: string;
  fechaExpiracion: string | null;
}

const LANGUAGE_OPTIONS = [
  { value: 'ES', label: 'Spanish (ES)' },
  { value: 'EN', label: 'English (EN)' },
];

const DOC_TYPE_OPTIONS = [
  { value: 'GLOBAL_GAP', label: 'GlobalG.A.P.' },
  { value: 'BRC', label: 'BRC Food Safety' },
  { value: 'IFS', label: 'IFS Food' },
  { value: 'ORGANIC', label: 'Organic Certificate' },
  { value: 'ISO_22000', label: 'ISO 22000' },
  { value: 'OTROS', label: 'Other' },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export default function SellerProfilePage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('account');

  // Account settings state
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState('ES');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Contracts / Incoterms state
  const [incotermData, setIncotermData] = useState<{ recommended: string; selected: string[] } | null>(null);
  const [selectedIncoterms, setSelectedIncoterms] = useState<string[]>([]);
  const [savingContracts, setSavingContracts] = useState(false);
  const [contractsSaved, setContractsSaved] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Documents state
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [docType, setDocType] = useState('GLOBAL_GAP');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fetchCertificates = useCallback(async () => {
    setLoadingCerts(true);
    try {
      const res = await api.get<{ data: Certificate[] }>('/certificates');
      setCertificates(res.data.data ?? []);
    } catch {
      // silently fail
    } finally {
      setLoadingCerts(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'documents') {
      fetchCertificates();
    }
    if (activeTab === 'contracts') {
      // Load from API first, fallback to localStorage
      api.get('/auth/profile')
        .then(({ data }) => {
          const prefs = data.data?.preferenciasIncoterm as { recommended: string; selected: string[] } | null;
          if (prefs && prefs.selected?.length > 0) {
            setIncotermData(prefs);
            setSelectedIncoterms(prefs.selected ?? []);
            // Sync to localStorage
            localStorage.setItem('primaria_incoterms', JSON.stringify({ ...prefs, done: true }));
          } else {
            // Fallback to localStorage (e.g. wizard just completed, not yet saved to DB)
            try {
              const raw = localStorage.getItem('primaria_incoterms');
              if (raw) {
                const stored: { recommended: string; selected: string[] } = JSON.parse(raw);
                setIncotermData(stored);
                setSelectedIncoterms(stored.selected ?? []);
              } else {
                setIncotermData(null);
                setSelectedIncoterms([]);
              }
            } catch {
              setIncotermData(null);
              setSelectedIncoterms([]);
            }
          }
        })
        .catch(() => {
          // Fallback to localStorage if API fails
          try {
            const raw = localStorage.getItem('primaria_incoterms');
            if (raw) {
              const stored: { recommended: string; selected: string[] } = JSON.parse(raw);
              setIncotermData(stored);
              setSelectedIncoterms(stored.selected ?? []);
            }
          } catch { /* ignore */ }
        });
    }
  }, [activeTab, fetchCertificates]);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    setAccountError(null);
    setAccountSuccess(false);
    try {
      await api.patch('/auth/profile', { telefono: phone, idiomaPreferido: language });
      setAccountSuccess(true);
      setTimeout(() => setAccountSuccess(false), 3000);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setAccountError(msg ?? 'Failed to save changes.');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);
    try {
      await api.patch('/auth/profile', { currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setPasswordError(msg ?? 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;
    setUploadingDoc(true);
    setUploadError(null);
    setUploadSuccess(false);
    try {
      // Step 1: upload file
      const formData = new FormData();
      formData.append('file', docFile);
      const uploadRes = await api.post<{ data: { url: string } }>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl = uploadRes.data.data.url;

      // Step 2: create certificate record
      await api.post('/certificates', {
        tipo: docType,
        archivoUrl: fileUrl,
      });

      setUploadSuccess(true);
      setDocFile(null);
      setDocType('GLOBAL_GAP');
      await fetchCertificates();
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setUploadError(msg ?? 'Failed to upload document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSaveContracts = async () => {
    setSavingContracts(true);
    try {
      const current = incotermData ?? { recommended: '', selected: [] };
      const updated = { ...current, selected: selectedIncoterms };
      // Save to DB via API
      await api.patch('/auth/profile', { preferenciasIncoterm: updated });
      // Also sync to localStorage
      localStorage.setItem('primaria_incoterms', JSON.stringify({ ...updated, done: true }));
      setIncotermData(updated);
      setContractsSaved(true);
      setTimeout(() => setContractsSaved(false), 3000);
    } catch {
      // Fallback: at least save to localStorage
      const current = incotermData ?? { recommended: '', selected: [] };
      const updated = { ...current, selected: selectedIncoterms };
      localStorage.setItem('primaria_incoterms', JSON.stringify(updated));
      setIncotermData(updated);
      setContractsSaved(true);
      setTimeout(() => setContractsSaved(false), 3000);
    } finally {
      setSavingContracts(false);
    }
  };

  const toggleIncoterm = (code: string) => {
    setSelectedIncoterms((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'account', label: 'Account Settings', icon: User },
    { key: 'company', label: 'Company Information', icon: Building2 },
    { key: 'documents', label: 'My Documents', icon: FileCheck2 },
    { key: 'contracts', label: 'Incoterms', icon: FileText },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500">Manage your account, company details and certifications.</p>
      </div>

      {/* Sub-nav tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={[
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 cursor-pointer',
              activeTab === key
                ? 'border-primary text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Account Settings */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Contact info */}
          <div className="bg-surface rounded-card border border-border p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Contact Person</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Name</p>
                <p className="text-sm font-medium text-gray-900">
                  {user?.nombre} {user?.apellidos}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Email</p>
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Editable fields */}
          <form onSubmit={handleSaveAccount} className="bg-surface rounded-card border border-border p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Preferences</h2>
            <Input
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 600 000 000"
            />
            <Select
              label="Preferred Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={LANGUAGE_OPTIONS}
            />
            {accountError && (
              <p role="alert" className="text-xs text-red-500">⚠ {accountError}</p>
            )}
            {accountSuccess && (
              <p className="text-xs text-green-600">Changes saved successfully.</p>
            )}
            <div className="flex justify-end">
              <Button type="submit" loading={savingAccount}>
                Save Changes
              </Button>
            </div>
          </form>

          {/* Change password */}
          <form onSubmit={handleChangePassword} className="bg-surface rounded-card border border-border p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Change Password</h2>
            </div>
            <Input
              label="Current Password"
              showPasswordToggle
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New Password"
              showPasswordToggle
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm New Password"
              showPasswordToggle
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
            />
            {passwordError && (
              <p role="alert" className="text-xs text-red-500">⚠ {passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-xs text-green-600">Password updated successfully.</p>
            )}
            <div className="flex justify-end">
              <Button
                type="submit"
                loading={savingPassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
              >
                Update Password
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Company Information */}
      {activeTab === 'company' && (
        <div className="space-y-4">
          {/* Locked banner */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-card bg-yellow-50 border border-primary/30">
            <Lock className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-secondary">
              Company information is locked once verified. Contact{' '}
              <a href="mailto:support@primar-ia.com" className="underline font-medium">
                support@primar-ia.com
              </a>{' '}
              to request changes.
            </p>
          </div>

          <div className="bg-surface rounded-card border border-border p-6 space-y-4">
            {[
              { label: 'Legal Name', value: '—' },
              { label: 'CIF / NIF', value: '—' },
              { label: 'Legal Form', value: '—' },
              { label: 'Address', value: '—' },
              { label: 'City', value: '—' },
              { label: 'Postal Code', value: '—' },
              { label: 'Country', value: '—' },
              { label: 'IBAN', value: 'Managed securely by Stripe' },
            ].map(({ label, value }) => (
              <div key={label} className="grid grid-cols-2 gap-4 py-2 border-b border-border last:border-0">
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-sm text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contracts / Incoterms */}
      {activeTab === 'contracts' && (
        <div className="space-y-6">
          {showWizard && (
            <div className="bg-white rounded-card border border-border p-1 mb-4">
              <IncotermWizard onComplete={() => {
                setShowWizard(false);
                try {
                  const raw = localStorage.getItem('primaria_incoterms');
                  if (raw) {
                    const stored: { recommended: string; selected: string[] } = JSON.parse(raw);
                    setIncotermData(stored);
                    setSelectedIncoterms(stored.selected ?? []);
                    // Persist to DB immediately
                    api.patch('/auth/profile', { preferenciasIncoterm: stored }).catch(() => {});
                  }
                } catch { /* ignore */ }
              }} />
            </div>
          )}

          {!showWizard && (
          <>
          {/* Recommended incoterm highlight */}
          <div className="bg-green-50 border border-green-200 rounded-card p-5">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
              Recomendado para ti
            </p>
            {incotermData?.recommended ? (
              <>
                <p className="text-sm text-green-900 font-medium">
                  Basado en tu configuración inicial:{' '}
                  <span className="font-bold">[{incotermData.recommended}]</span>{' '}
                  {INCOTERMS_INFO.find((i) => i.code === incotermData.recommended)?.name ?? ''}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Modifica tus selecciones abajo o vuelve a ejecutar el asistente.
                </p>
              </>
            ) : (
              <p className="text-sm text-green-800">
                Aún no tienes un incoterm recomendado. Ejecuta el asistente de contratos para obtener una sugerencia personalizada.
              </p>
            )}
          </div>

          {/* Incoterm toggle list */}
          <div className="bg-surface rounded-card border border-border p-6 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Selecciona tus Incoterms</h2>
            {INCOTERMS_INFO.map(({ code, name, scope, desc }) => {
              const isChecked = selectedIncoterms.includes(code);
              const isRecommended = incotermData?.recommended === code;
              return (
                <label
                  key={code}
                  className={[
                    'flex items-start gap-3 p-3 rounded-input border cursor-pointer transition-colors',
                    isRecommended
                      ? 'border-green-300 bg-green-50'
                      : isChecked
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-gray-50 hover:bg-gray-100',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-primary flex-shrink-0"
                    checked={isChecked}
                    onChange={() => toggleIncoterm(code)}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{code}</span>
                      <span className="text-sm text-gray-700">{name}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{scope}</span>
                      {isRecommended && (
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {contractsSaved && (
              <p className="text-xs text-green-600">Cambios guardados correctamente.</p>
            )}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('primaria_incoterms');
                  api.patch('/auth/profile', { preferenciasIncoterm: null }).catch(() => {});
                  setShowWizard(true);
                  setIncotermData(null);
                  setSelectedIncoterms([]);
                }}
                className="text-sm text-primary underline hover:no-underline"
              >
                Volver a ejecutar el asistente de contratos
              </button>
              <Button
                type="button"
                loading={savingContracts}
                onClick={handleSaveContracts}
              >
                Guardar cambios
              </Button>
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* My Documents (Seller only) */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Existing certificates */}
          <div className="bg-surface rounded-card border border-border p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Certificates</h2>
            {loadingCerts ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse h-10 bg-gray-100 rounded-input" />
                ))}
              </div>
            ) : certificates.length === 0 ? (
              <div className="text-center py-8">
                <FileCheck2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No documents uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Table header */}
                <div className="grid grid-cols-3 gap-4 px-3 py-1.5 text-xs font-medium text-gray-500">
                  <span>Type</span>
                  <span>Status</span>
                  <span>Expiry</span>
                </div>
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="grid grid-cols-3 gap-4 items-center px-3 py-2.5 rounded-input border border-border bg-gray-50"
                  >
                    <span className="text-sm text-gray-900 font-medium">{cert.tipo}</span>
                    <StatusBadge status={cert.estado} />
                    <span className="text-xs text-gray-500">{formatDate(cert.fechaExpiracion)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload new document */}
          <form
            onSubmit={handleUploadDocument}
            className="bg-surface rounded-card border border-border p-6 space-y-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Upload className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Upload New Document</h2>
            </div>

            <Select
              label="Document Type"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              options={DOC_TYPE_OPTIONS}
              required
            />

            <FileDropzone
              label="Document File"
              hint="PDF up to 10 MB"
              accept=".pdf,image/*"
              maxSizeMB={10}
              onFileSelect={setDocFile}
            />

            {uploadError && (
              <p role="alert" className="text-xs text-red-500">⚠ {uploadError}</p>
            )}
            {uploadSuccess && (
              <p className="text-xs text-green-600">Document uploaded successfully.</p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                loading={uploadingDoc}
                disabled={!docFile || uploadingDoc}
              >
                Upload Document
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
