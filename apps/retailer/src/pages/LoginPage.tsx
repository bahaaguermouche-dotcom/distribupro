import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, Key, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phoneOrEmail.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    const res = await login(phoneOrEmail, password);
    if (!res.success) {
      setError(res.error || 'Erreur de connexion.');
    }
  };

  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100vw',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at top, #1e293b 0%, #0b0f19 100%)'
    }}>
      <div className="card page-enter" style={{ width: 420, padding: 36, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 54, height: 54, borderRadius: 14, background: 'var(--accent-glow)',
            color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Store size={28} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Espace Boutique</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Connectez-vous à votre espace commerçant
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{
              padding: 12, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)',
              fontSize: 12, display: 'flex', alignItems: 'center', gap: 8
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="form-label">Identifiant (Téléphone ou Email)</label>
            <div style={{ position: 'relative' }}>
              <input
                required
                autoFocus
                type="text"
                className="form-input"
                placeholder="Ex: 0661123456 ou magasin@email.com"
                value={phoneOrEmail}
                onChange={e => setPhoneOrEmail(e.target.value)}
                style={{ paddingLeft: 38 }}
              />
              <Store size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div>
            <label className="form-label">Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                required
                type="password"
                className="form-input"
                placeholder="•••••••• ou mot de passe temporaire"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: 38 }}
              />
              <Key size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              💡 Première connexion ? Utilisez le mot de passe temporaire transmis par l'administrateur.
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', marginTop: 8,
              justifyContent: 'center', fontSize: 14, fontWeight: 700
            }}
          >
            {loading ? 'Vérification...' : 'Se connecter'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          DistribuPro Platform • Espace Détaillant & Magasin
        </div>
      </div>
    </div>
  );
}
