'use client';
import { useState } from 'react';
import {
  CheckCircle, XCircle, Eye, MapPin, Phone, Package, Plus, X,
  Key, ShieldAlert, Copy, Check, UserPlus, Building2, FileText, ExternalLink, Navigation, CreditCard
} from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase';

type Status = 'all' | 'pending' | 'active' | 'suspended';

interface Distributor {
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
  productsCount?: number;
  status: 'active' | 'pending' | 'suspended';
  isFirstLogin: boolean;
  floatBalance?: number;
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

export default function DistributorsPage() {
  const [snapshot, loading] = useCollection(collection(db, 'distributors'));
  const firestoreDistributors: Distributor[] = snapshot?.docs.map(d => ({ id: d.id, ...d.data() } as Distributor)) ?? [];

  const [filter, setFilter] = useState<Status>('all');
  const [selected, setSelected] = useState<Distributor | null>(null);

  // Add modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [createdSummary, setCreatedSummary] = useState<Distributor | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    sector: '16 - Alger',
    phoneOrEmail: '',
    tempPassword: generateTempPassword(),
  });

  const openAddModal = () => {
    setForm({
      sector: '16 - Alger',
      phoneOrEmail: '',
      tempPassword: generateTempPassword(),
    });
    setIsAddModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const newCode = 'D' + String(firestoreDistributors.length + 1).padStart(3, '0');
      const newDistData: Omit<Distributor, 'id'> = {
        code: newCode,
        name: `Distributeur (${form.sector})`,
        sector: form.sector,
        phoneOrEmail: form.phoneOrEmail,
        tempPassword: form.tempPassword,
        productsCount: 0,
        status: 'active',
        isFirstLogin: true,
        floatBalance: 0,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'distributors'), newDistData);
      setIsAddModalOpen(false);
      setCreatedSummary({ id: docRef.id, ...newDistData });
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création du compte distributeur.');
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = () => {
    if (!createdSummary) return;
    const text = `Compte Distributeur (${createdSummary.sector})\nIdentifiant: ${createdSummary.phoneOrEmail}\nMot de passe temporaire: ${createdSummary.tempPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await updateDoc(doc(db, 'distributors', id), { status: nextStatus });
  };

  const filtered = firestoreDistributors.filter(d => filter === 'all' || d.status === filter);

  const counts = {
    all: firestoreDistributors.length,
    pending: firestoreDistributors.filter(d => d.status === 'pending').length,
    active: firestoreDistributors.filter(d => d.status === 'active').length,
    suspended: firestoreDistributors.filter(d => d.status === 'suspended').length,
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h2 className="page-title">Distributeurs</h2>
          <p className="page-subtitle">Gérer et ajouter des distributeurs par secteur</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <UserPlus size={16} /> Nouveau Distributeur
        </button>
      </div>

      <div className="filter-bar">
        {(['all', 'pending', 'active', 'suspended'] as Status[]).map(f => (
          <button
            key={f}
            id={`filter-dist-${f}`}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'active' ? 'Actifs' : 'Suspendus'}
            &nbsp;<span style={{ opacity: 0.7 }}>({counts[f]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement des distributeurs...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <UserPlus size={48} style={{ color: 'var(--border-light)' }} />
          <h3>Aucun distributeur trouvé</h3>
          <p>Cliquez sur "Nouveau Distributeur" pour créer un compte dans un secteur.</p>
          <button className="btn btn-primary" onClick={openAddModal}><Plus size={14} /> Nouveau Distributeur</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom / Société</th>
                  <th>Secteur</th>
                  <th>Identifiant (Tel / Email)</th>
                  <th>Produits</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{d.code || d.id?.slice(0, 6)}</td>
                    <td style={{ fontWeight: 600 }}>
                      <div>{d.name || `Distributeur (${d.sector})`}</div>
                      {d.isFirstLogin && (
                        <span style={{ fontSize: 10, color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          <ShieldAlert size={10} /> 1ère connexion en attente
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
                        <MapPin size={12} />{d.sector}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={12} />{d.phoneOrEmail}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Package size={12} />{d.productsCount || 0}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${d.status === 'active' ? 'active' : d.status === 'pending' ? 'pending' : 'suspended'}`}>
                        {d.status === 'active' ? 'Actif' : d.status === 'pending' ? 'En attente' : 'Suspendu'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button id={`view-dist-${d.id}`} className="btn btn-ghost btn-sm" onClick={() => setSelected(d)} title="Voir détails">
                          <Eye size={13} />
                        </button>
                        {d.status === 'active' && (
                          <button id={`suspend-dist-${d.id}`} className="btn btn-danger btn-sm" onClick={() => handleToggleStatus(d.id!, d.status)}>
                            <XCircle size={13} /> Suspendre
                          </button>
                        )}
                        {d.status === 'suspended' && (
                          <button id={`reactivate-dist-${d.id}`} className="btn btn-success btn-sm" onClick={() => handleToggleStatus(d.id!, d.status)}>
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
          <div className="modal" style={{ width: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={18} style={{ color: 'var(--accent)' }} />
                  {selected.name || `Distributeur (${selected.sector})`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Code Distributeur : <strong style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{selected.code || selected.id}</strong>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setSelected(null)}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Section 1: Entreprise & Identification */}
              <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={13} style={{ color: 'var(--accent)' }} /> Informations Société
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div className="form-label" style={{ fontSize: 11 }}>Nom / Enseigne</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{selected.name || '—'}</div>
                  </div>
                  <div>
                    <div className="form-label" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FileText size={10} /> Registre du Commerce (RC)
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
                    <div className="form-label" style={{ fontSize: 11 }}>Identifiant de connexion d'origine</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{selected.phoneOrEmail}</div>
                  </div>
                  <div>
                    <div className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Numéros de téléphone configurés</div>
                    {((selected.phones && selected.phones.length > 0) || selected.phone) ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(selected.phones || [selected.phone]).map((ph, idx) => (
                          <span key={idx} className="badge" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <Phone size={11} style={{ color: 'var(--accent)' }} />
                            {ph}
                            {idx === 0 && <span style={{ fontSize: 9, background: 'var(--accent-glow)', color: 'var(--accent)', padding: '1px 5px', borderRadius: 6, fontWeight: 700, marginLeft: 4 }}>Principal</span>}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Aucun numéro ajouté</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Adresse & GPS */}
              <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Navigation size={13} style={{ color: 'var(--accent)' }} /> Adresse & Localisation GPS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div className="form-label" style={{ fontSize: 11 }}>Adresse textuelle de l'entrepôt</div>
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
                  <ShieldAlert size={13} style={{ color: 'var(--accent)' }} /> Statut & Activité Compte
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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
                  <div>
                    <div className="form-label" style={{ fontSize: 11 }}>Produits au catalogue</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13, marginTop: 4 }}>
                      {selected.productsCount || 0} article(s)
                    </div>
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

      {/* CREATE DISTRIBUTOR MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal" style={{ width: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={18} style={{ color: 'var(--accent)' }} />
                Nouveau Compte Distributeur
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
                  placeholder="Ex: 0555123456 ou distributeur@email.com"
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
                  💡 Ce mot de passe sera demandé au distributeur uniquement lors de sa toute première connexion.
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
              Transmettez ces identifiants au distributeur pour qu'il puisse effectuer sa première connexion et configurer son mot de passe définitif :
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
