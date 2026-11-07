import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, Key, Phone, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(phoneOrEmail, password);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Erreur lors de la connexion.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden', padding: 20
    }}>
      {/* Background Radial Glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 50% at 50% 30%, rgba(79, 124, 255, 0.08), transparent)'
      }} />

      <div className="card" style={{
        width: 420, maxWidth: '100%', padding: 36, borderRadius: 16,
        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-lg)', position: 'relative', zIndex: 1
      }}>
        {/* Logo Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
          }}>
            <Truck size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>DistribuPro</h1>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Espace Distributeur</span>
          </div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Connexion</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
          Saisissez votre identifiant et votre mot de passe temporaire ou habituel.
        </p>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontSize: 13,
            marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Phone size={12} /> Identifiant (Téléphone ou Email)
            </label>
            <input
              required
              autoFocus
              className="form-input"
              placeholder="Ex: 0555123456"
              value={phoneOrEmail}
              onChange={e => setPhoneOrEmail(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13, outline: 'none'
              }}
            />
          </div>

          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Key size={12} /> Mot de passe
            </label>
            <input
              required
              type="password"
              className="form-input"
              placeholder="Mot de passe temporaire ou personnel"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13, outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%', padding: '12px', borderRadius: 8, marginTop: 8,
              background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
              color: '#fff', fontWeight: 700, fontSize: 14, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            {loading ? 'Connexion en cours...' : (
              <>
                Se connecter <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 11 }}>
          <ShieldCheck size={14} />
          <span>Accès sécurisé réservé aux distributeurs agréés par l'administrateur.</span>
        </div>
      </div>
    </div>
  );
}
