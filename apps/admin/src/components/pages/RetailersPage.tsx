'use client';
import { useState } from 'react';
import {
  CheckCircle, XCircle, Eye, MapPin, Phone, Plus, X,
  Key, ShieldAlert, Copy, Check, Store, Building2, FileText, ExternalLink, Navigation, Wallet, Star
} from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase';

type Status = 'all' | 'pending' | 'active' | 'suspended';

interface Retailer {
  id?: string;
  code?: string;
  name?: string;
  rcNumber?: string;
  sector: string;
  phone?: string;
  phones?: string[];
  phoneOrEmail: string;
  address?: string;
  lat?: number;
  lng?: number;
  tempPassword?: string;
  status: 'active' | 'pending' | 'suspended';
  isFirstLogin: boolean;
  walletBalance?: number;
  isRechargePoint?: boolean;
  rating?: number;
  createdAt?: unknown;
}

const WILAYAS = [
  '01 - Adrar', '02 - Chlef', '03 - Laghouat', '04 - Oum El Bouaghi', '05 - Batna',
  '06 - Béjaïa', '07 - Biskra', '08 - Béchar', '09 - Blida', '10 - Bouira',
  '11 - Tamanrasset', '12 - Tébessa', '13 - Tlemcen', '14 - Tiaret', '15 - Tizi Ouzou',
  '16 - Alger', '17 - Djelfa', '18 - Jijel', '19 - Sétif', '20 - Saïda',
  '21 - Skikda', '22 - Sidi Bel Abbès', '23 - Annaba', '24 - Guelma', '25 - Constantine',
  '26 - Médéa', '27 - Mostaganem', '28 - M\'Sila', '29 - Mascara', '30 - Ouargla',
  '31 - Oran', '32 - El Bayadh', '33 - Illizi', '34 - Bordj Bou Arréridj', '35 - Boumerdès',
  '36 - El Tarf', '37 - Tindouf', '38 - Tissemsilt', '39 - El Oued', '40 - Khenchela',
  '41 - Souk Ahras', '42 - Tipaza', '43 - Mila', '44 - Aïn Defla', '45 - Naâma',
  '46 - Aïn Témouchent', '47 - Ghardaïa', '48 - Relizane', '49 - Timimoun', '50 - Bordj Badji Mokhtar',
  '51 - Ouled Djellal', '52 - Béni Abbès', '53 - In Salah', '54 - In Guezzam', '55 - Touggourt',
  '56 - Djanet', '57 - El M\'Ghair', '58 - El Meniaa'
];

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'TEMP-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function RetailersPage() {
  const [snapshot, loading] = useCollection(collection(db, 'retailers'));
  const firestoreRetailers: Retailer[] = snapshot?.docs.map(d => ({ id: d.id, ...d.data() } as Retailer)) ?? [];

  const [filter, setFilter] = useState<Status>('all');
  const [selected, setSelected] = useState<Retailer | null>(null);

  // Add modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [createdSummary, setCreatedSummary] = useState<Retailer | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    sector: '31 - Oran',
    phoneOrEmail: '',
    tempPassword: generateTempPassword(),
  });

  const openAddModal = () => {
    setForm({
      sector: '31 - Oran',
      phoneOrEmail: '',
      tempPassword: generateTempPassword(),
    });
    setIsAddModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const newCode = 'R' + String(firestoreRetailers.length + 1).padStart(3, '0');
      const newRetailerData: Omit<Retailer, 'id'> = {
        code: newCode,
        name: `Boutique / Détaillant (${form.sector})`,
        sector: form.sector,
        phoneOrEmail: form.phoneOrEmail,
        tempPassword: form.tempPassword,
        status: 'active',
        isFirstLogin: true,
        walletBalance: 0,
        isRechargePoint: false,
        rating: 5.0,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'retailers'), newRetailerData);
      setIsAddModalOpen(false);
      setCreatedSummary({ id: docRef.id, ...newRetailerData });
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création du compte magasin.');
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = () => {
    if (!createdSummary) return;
    const text = `Compte Détaillant (${createdSummary.sector})\nIdentifiant: ${createdSummary.phoneOrEmail}\nMot de passe temporaire: ${createdSummary.tempPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await updateDoc(doc(db, 'retailers', id), { status: nextStatus });
  };

  const filtered = firestoreRetailers.filter(r => filter === 'all' || r.status === filter);

  const counts = {
    all: firestoreRetailers.length,
    pending: firestoreRetailers.filter(r => r.status === 'pending').length,
    active: firestoreRetailers.filter(r => r.status === 'active').length,
    suspended: firestoreRetailers.filter(r => r.status === 'suspended').length,
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h2 className="page-title">Détaillants & Boutiques</h2>
          <p className="page-subtitle">Gérer et ajouter des magasins par secteur/wilaya</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Store size={16} /> Nouveau Détaillant
        </button>
      </div>

      <div className="filter-bar">
        {(['all', 'pending', 'active', 'suspended'] as Status[]).map(f => (
          <button
            key={f}
            id={`filter-ret-${f}`}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'active' ? 'Actifs' : 'Suspendus'}
            &nbsp;<span style={{ opacity: 0.7 }}>({counts[f]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement des détaillants...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Store size={48} style={{ color: 'var(--border-light)' }} />
          <h3>Aucun détaillant trouvé</h3>
          <p>Cliquez sur "Nouveau Détaillant" pour créer un compte magasin.</p>
          <button className="btn btn-primary" onClick={openAddModal}><Plus size={14} /> Nouveau Détaillant</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom / Boutique</th>
                  <th>Secteur</th>
                  <th>Identifiant (Tel / Email)</th>
                  <th>Portefeuille</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.code || r.id?.slice(0, 6)}</td>
                    <td style={{ fontWeight: 600 }}>
                      <div>{r.name || `Boutique (${r.sector})`}</div>
                      {r.isFirstLogin && (
                        <span style={{ fontSize: 10, color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          <ShieldAlert size={10} /> 1ère connexion en attente
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
                        <MapPin size={12} />{r.sector}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={12} />{r.phoneOrEmail}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: 'var(--accent)' }}>
                        <Wallet size={12} />{(r.walletBalance || 0).toLocaleString('fr-DZ')} DA
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'active' ? 'active' : r.status === 'pending' ? 'pending' : 'suspended'}`}>
                        {r.status === 'active' ? 'Actif' : r.status === 'pending' ? 'En attente' : 'Suspendu'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button id={`view-ret-${r.id}`} className="btn btn-ghost btn-sm" onClick={() => setSelected(r)} title="Voir détails">
                          <Eye size={13} />
                        </button>
                        {r.status === 'active' && (
                          <button id={`suspend-ret-${r.id}`} className="btn btn-danger btn-sm" onClick={() => handleToggleStatus(r.id!, r.status)}>
                            <XCircle size={13} /> Suspendre
                          </button>
                        )}
                        {r.status === 'suspended' && (
                          <button id={`reactivate-ret-${r.id}`} className="btn btn-success btn-sm" onClick={() => handleToggleStatus(r.id!, r.status)}>
                            <CheckCircle size={13} /> Réactiver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ width: 540, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Store size={18} style={{ color: 'var(--accent)' }} />
                  {selected.name || `Détaillant (${selected.sector})`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Code Magasin : <strong style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{selected.code || selected.id}</strong>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setSelected(null)}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Section 1: Informations Magasin */}
              <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={13} style={{ color: 'var(--accent)' }} /> Informations Boutique
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div className="form-label" style={{ fontSize: 11 }}>Nom de l'Enseigne</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{selected.name || '—'}</div>
                  </div>
                  <div>
                    <div className="form-label" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FileText size={10} /> Registre / NIF
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{selected.rcNumber || 'Non renseigné'}</div>
                  </div>
                  <div>
                    <div className="form-label" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={10} /> Secteur (Wilaya)
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{selected.sector}</div>
                  </div>
                  <div>
                    <div className="form-label" style={{ fontSize: 11 }}>Code ID</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>{selected.code || selected.id}</div>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact & Téléphones */}
              <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={13} style={{ color: 'var(--accent)' }} /> Coordonnées & Contacts
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div className="form-label" style={{ fontSize: 11 }}>Identifiant de connexion</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{selected.phoneOrEmail}</div>
                  </div>
                  <div>
                    <div className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Téléphone Magasin</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>{selected.phone || 'Non renseigné'}</div>
                  </div>
                </div>
              </div>

              {/* Section 3: Adresse & GPS */}
              <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Navigation size={13} style={{ color: 'var(--accent)' }} /> Adresse & Carte GPS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div className="form-label" style={{ fontSize: 11 }}>Adresse textuelle</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>{selected.address || 'Non renseignée'}</div>
                  </div>

                  <div>
                    <div className="form-label" style={{ fontSize: 11 }}>Coordonnées GPS</div>
                    {selected.lat && selected.lng ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--accent)', background: 'var(--accent-glow)', padding: '4px 8px', borderRadius: 6 }}>
                          📍 Lat: {selected.lat.toFixed(5)}, Lng: {selected.lng.toFixed(5)}
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${selected.lat},${selected.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-ghost"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)' }}
                        >
                          Voir sur Google Maps <ExternalLink size={12} />
                        </a>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Position GPS non enregistrée</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Statut & Activité */}
              <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldAlert size={13} style={{ color: 'var(--accent)' }} /> Statut & Configuration
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div className="form-label" style={{ fontSize: 11 }}>Statut du Compte</div>
                    <span className={`badge ${selected.status === 'active' ? 'active' : selected.status === 'pending' ? 'pending' : 'suspended'}`} style={{ marginTop: 4 }}>
                      {selected.status === 'active' ? 'Actif' : selected.status === 'pending' ? 'En attente' : 'Suspendu'}
                    </span>
                  </div>
                  <div>
                    <div className="form-label" style={{ fontSize: 11 }}>Configuration Onboarding</div>
                    <span className={`badge ${selected.isFirstLogin ? 'warning' : 'info'}`} style={{ marginTop: 4, background: selected.isFirstLogin ? 'rgba(234,179,8,0.1)' : 'var(--accent-glow)', color: selected.isFirstLogin ? 'var(--warning)' : 'var(--accent)' }}>
                      {selected.isFirstLogin ? '1ère connexion en attente' : 'Profil configuré'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE RETAILER MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal" style={{ width: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Store size={18} style={{ color: 'var(--accent)' }} />
                Nouveau Compte Détaillant / Magasin
              </div>
              <button className="icon-btn" style={{ width: 32, height: 32, border: 'none' }} onClick={() => setIsAddModalOpen(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreate}>
              {/* Sector */}
              <div className="form-group">
                <label className="form-label">Secteur / Wilaya *</label>
                <select className="form-input" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}>
                  {WILAYAS.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              {/* Phone or Email */}
              <div className="form-group">
                <label className="form-label">Identifiant de connexion (Tel ou Email) *</label>
                <input
                  required autoFocus className="form-input"
                  placeholder="Ex: 0661123456 ou magasin.oran@email.com"
                  value={form.phoneOrEmail}
                  onChange={e => setForm({ ...form, phoneOrEmail: e.target.value })}
                />
              </div>

              {/* Temporary Password */}
              <div className="form-group">
                <div className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Mot de passe temporaire *</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tempPassword: generateTempPassword() })}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer' }}
                  >
                    🔄 Régénérer
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    required className="form-input"
                    value={form.tempPassword}
                    onChange={e => setForm({ ...form, tempPassword: e.target.value })}
                    style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}
                  />
                  <Key size={14} style={{ position: 'absolute', right: 12, top: 12, color: 'var(--text-muted)' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  💡 Ce mot de passe sera demandé au commerçant uniquement lors de sa toute première connexion.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsAddModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Création...' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUMMARY MODAL AFTER CREATION */}
      {createdSummary && (
        <div className="modal-overlay" onClick={() => setCreatedSummary(null)}>
          <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)' }}>
                <CheckCircle size={20} /> Compte créé avec succès !
              </div>
              <button className="icon-btn" style={{ width: 32, height: 32, border: 'none' }} onClick={() => setCreatedSummary(null)}><X size={16} /></button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Transmettez ces identifiants au commerçant pour qu'il puisse effectuer sa première connexion et configurer sa boutique :
            </p>

            <div style={{
              background: 'var(--bg-primary)', padding: 16, borderRadius: 10,
              border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Secteur :</span>
                <strong style={{ color: 'var(--text-primary)' }}>{createdSummary.sector}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Identifiant :</span>
                <strong style={{ color: 'var(--text-primary)' }}>{createdSummary.phoneOrEmail}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Mot de passe temporaire :</span>
                <strong style={{ color: 'var(--accent)', fontFamily: 'monospace', fontSize: 15 }}>{createdSummary.tempPassword}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={copyCredentials}>
                {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                {copied ? 'Copié !' : 'Copier les identifiants'}
              </button>
              <button className="btn btn-primary" onClick={() => setCreatedSummary(null)}>Terminé</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
