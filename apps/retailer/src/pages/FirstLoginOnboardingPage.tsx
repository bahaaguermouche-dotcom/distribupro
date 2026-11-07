import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LocationPickerMap from '../components/LocationPickerMap';
import { Store, MapPin, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function FirstLoginOnboardingPage() {
  const { user, completeFirstLogin } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [storeName, setStoreName] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [phone, setPhone] = useState(user?.phoneOrEmail || '');
  const [address, setAddress] = useState('');

  // Location state (Default center of Algeria / Sector)
  const [lat, setLat] = useState<number>(36.7538); // Alger default
  const [lng, setLng] = useState<number>(3.0588);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !phone.trim() || !address.trim()) {
      setError('Veuillez remplir tous les champs obligatoires (*).');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleNextStep2 = () => {
    setError('');
    setStep(3);
  };

  const handleSubmitFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const ok = await completeFirstLogin({
        storeName: storeName.trim(),
        rcNumber: rcNumber.trim(),
        address: address.trim(),
        phone: phone.trim(),
        newPassword,
        lat,
        lng,
      });

      if (!ok) {
        setError('Erreur lors de la sauvegarde de votre profil boutique. Veuillez réessayer.');
      }
    } catch (err) {
      console.error(err);
      setError('Une erreur est survenue lors de la configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at top, #1e293b 0%, #0b0f19 100%)', padding: '32px 16px', boxSizing: 'border-box', overflowY: 'auto'
    }}>
      <div className="card page-enter" style={{
        width: 620, maxWidth: '100%', padding: 36, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        maxHeight: 'calc(100vh - 64px)', overflowY: 'auto'
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 14, background: 'var(--accent-glow)',
            color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <Store size={26} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
            Bienvenue sur DistribuPro Boutiques
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Secteur attribué : <strong style={{ color: 'var(--accent)' }}>{user?.sector}</strong>
          </p>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, position: 'relative' }}>
          {[
            { s: 1, label: 'Boutique' },
            { s: 2, label: 'Carte GPS' },
            { s: 3, label: 'Sécurité' },
          ].map((st) => {
            const active = step >= st.s;
            const current = step === st.s;
            return (
              <div key={st.s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 2, flex: 1 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: active ? 'var(--accent)' : 'var(--bg-primary)',
                  color: active ? '#fff' : 'var(--text-muted)',
                  border: `2px solid ${current ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13, transition: 'all 0.2s'
                }}>
                  {active ? (step > st.s ? <CheckCircle2 size={16} /> : st.s) : st.s}
                </div>
                <span style={{ fontSize: 11, fontWeight: current ? 700 : 500, color: current ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{
            padding: 12, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)',
            fontSize: 12, marginBottom: 20
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: INFORMATIONS BOUTIQUE */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Nom de l'Enseigne / Commerce *</label>
              <input
                required autoFocus
                type="text" className="form-input"
                placeholder="Ex: Épicerie El Baraka, Alimentation Générale..."
                value={storeName} onChange={e => setStoreName(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label">Registre du Commerce / NIF (Optionnel)</label>
                <input
                  type="text" className="form-input"
                  placeholder="Ex: RC-2026-B-12345"
                  value={rcNumber} onChange={e => setRcNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Téléphone Principal Magasin *</label>
                <input
                  required type="tel" className="form-input"
                  placeholder="Ex: 0661123456"
                  value={phone} onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Adresse physique du magasin *</label>
              <textarea
                required rows={2} className="form-input"
                placeholder="Ex: Rue Didouche Mourad, N° 14, Alger..."
                value={address} onChange={e => setAddress(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="submit" className="btn btn-primary">
                Étape suivante : Géolocalisation GPS <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: LOCALISATION GPS SUR LA CARTE */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={16} style={{ color: 'var(--accent)' }} /> Positionnez votre magasin sur la carte
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Déplacez le marqueur ou cliquez sur la carte pour définir l'emplacement exact de votre boutique :
              </p>
            </div>

            <LocationPickerMap lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} height={220} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                Retour
              </button>

              <button type="button" className="btn btn-primary" onClick={handleNextStep2}>
                Étape suivante : Mot de passe <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DÉFINIR NOUVEAU MOT DE PASSE */}
        {step === 3 && (
          <form onSubmit={handleSubmitFinal} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Nouveau Mot de Passe *</label>
              <div style={{ position: 'relative' }}>
                <input
                  required autoFocus type={showNewPassword ? 'text' : 'password'} className="form-input"
                  placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  style={{ width: '100%', paddingRight: 40, boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4
                  }}
                  title={showNewPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Au moins 6 caractères. Remplace votre mot de passe temporaire.
              </div>
            </div>

            <div>
              <label className="form-label">Confirmer le nouveau Mot de Passe *</label>
              <div style={{ position: 'relative' }}>
                <input
                  required type={showConfirmPassword ? 'text' : 'password'} className="form-input"
                  placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', paddingRight: 40, boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4
                  }}
                  title={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
                Retour
              </button>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Finalisation...' : 'Finaliser la configuration'} <CheckCircle2 size={16} />
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
