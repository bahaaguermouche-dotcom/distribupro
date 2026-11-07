import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Building2, Key, MapPin, FileText, Phone, CheckCircle, ArrowRight, Navigation, Eye, EyeOff } from 'lucide-react';
import LocationPickerMap from '../components/LocationPickerMap';

export default function FirstLoginOnboardingPage() {
  const { user, completeFirstLogin } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [phone, setPhone] = useState(user?.phoneOrEmail || '');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number>(36.7538); // Default Alger
  const [lng, setLng] = useState<number>(3.0588);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const success = await completeFirstLogin({
      companyName,
      rcNumber,
      address,
      phone,
      newPassword,
      lat,
      lng,
    });
    setLoading(false);

    if (!success) {
      setError('Erreur lors de l\'enregistrement de vos informations. Veuillez réessayer.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', position: 'relative', overflowY: 'auto', padding: '24px 16px', boxSizing: 'border-box'
    }}>
      {/* Background Glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(79, 124, 255, 0.1), transparent)'
      }} />

      <div className="card" style={{
        width: 540, maxWidth: '100%', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', padding: 40, borderRadius: 16,
        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-lg)', position: 'relative', zIndex: 1
      }}>
        {/* Step Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--accent-glow)', border: '1px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Première Connexion — Configuration du compte
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              Bienvenue sur DistribuPro !
            </h2>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: 10,
          border: '1px solid var(--border)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10
        }}>
          <MapPin size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Secteur attribué par l'Administrateur : <strong style={{ color: 'var(--text-primary)' }}>{user?.sector}</strong>
          </span>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontSize: 13,
            marginBottom: 20
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Company Name */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Building2 size={12} /> Nom de la Société / Nom Commercial *
            </label>
            <input
              required
              autoFocus
              className="form-input"
              placeholder="Ex: Société El Wifak Distribution"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13, outline: 'none'
              }}
            />
          </div>

          {/* RC & Phone in 2 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <FileText size={12} /> Registre du Commerce (RC)
              </label>
              <input
                className="form-input"
                placeholder="Ex: 16/00-1234567B20"
                value={rcNumber}
                onChange={e => setRcNumber(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  background: 'var(--bg-primary)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 13, outline: 'none'
                }}
              />
            </div>
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Phone size={12} /> Téléphone de contact *
              </label>
              <input
                required
                className="form-input"
                placeholder="Ex: 0661 12 34 56"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  background: 'var(--bg-primary)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 13, outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Address & Map */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <MapPin size={12} /> Adresse de l'entrepôt / Siège
            </label>
            <input
              className="form-input"
              placeholder="Ex: Zone Industrielle, Lot N° 45"
              value={address}
              onChange={e => setAddress(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13, outline: 'none', marginBottom: 12
              }}
            />
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Navigation size={12} /> Emplacement exact sur la carte GPS
            </label>
            <LocationPickerMap
              lat={lat}
              lng={lng}
              onChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
            />
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

          {/* New Passwords */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Key size={12} /> Définir votre nouveau mot de passe (personnel & secret) *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                required
                type={showNewPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Au moins 6 caractères"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={{
                  width: '100%', padding: '10px 40px 10px 14px', borderRadius: 8,
                  background: 'var(--bg-primary)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4
                }}
                title={showNewPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <CheckCircle size={12} /> Confirmer le mot de passe *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                required
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Répétez votre mot de passe"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%', padding: '10px 40px 10px 14px', borderRadius: 8,
                  background: 'var(--bg-primary)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4
                }}
                title={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%', padding: '12px', borderRadius: 8, marginTop: 12,
              background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
              color: '#fff', fontWeight: 700, fontSize: 14, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            {loading ? 'Validation en cours...' : (
              <>
                Valider et accéder à l'application <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
