import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2, Phone, MapPin, FileText, CheckCircle, Save, Plus, Trash2, Edit3, Lock, Navigation
} from 'lucide-react';
import LocationPickerMap from '../components/LocationPickerMap';

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [rcNumber, setRcNumber] = useState(user?.rcNumber || '');
  const [address, setAddress] = useState(user?.address || '');
  const [lat, setLat] = useState<number>(user?.lat || 36.7538);
  const [lng, setLng] = useState<number>(user?.lng || 3.0588);

  // Phone numbers array
  const [phones, setPhones] = useState<string[]>(user?.phones || [user?.phone || user?.phoneOrEmail || '']);
  const [newPhoneInput, setNewPhoneInput] = useState('');

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddPhone = () => {
    if (!newPhoneInput.trim()) return;
    if (phones.includes(newPhoneInput.trim())) return;
    setPhones([...phones, newPhoneInput.trim()]);
    setNewPhoneInput('');
  };

  const handleRemovePhone = (index: number) => {
    if (phones.length <= 1) {
      alert('Vous devez conserver au moins un numéro de téléphone.');
      return;
    }
    setPhones(phones.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword && newPassword.length < 6) {
      setErrorMsg('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas.');
      return;
    }

    setSaving(true);
    const success = await updateProfile({
      name,
      rcNumber,
      address,
      phone: phones[0] || '',
      phones,
      lat,
      lng,
      ...(newPassword ? { newPassword } : {}),
    });
    setSaving(false);

    if (success) {
      setSuccessMsg('Modifications enregistrées avec succès !');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg('Erreur lors de la sauvegarde du profil.');
    }
  };

  return (
    <div className="page-enter" style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Edit3 size={24} style={{ color: 'var(--accent)' }} /> Paramètres du Compte
          </h2>
          <p className="page-subtitle">Modifiez les informations de votre profil, gérez vos numéros de téléphone et votre mot de passe</p>
        </div>
      </div>

      {successMsg && (
        <div style={{
          padding: '12px 18px', borderRadius: 10, background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.25)', color: 'var(--success)', fontSize: 13,
          marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600
        }}>
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '12px 18px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--danger)', fontSize: 13,
          marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Row of 3 Square Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>

          {/* Card 1: Profil de la Société */}
          <div className="card" style={{ padding: 22, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 320, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={16} style={{ color: 'var(--accent)' }} />
              </div>
              Profil Société
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              <div>
                <label className="form-label" style={{ marginBottom: 5, fontSize: 11 }}>
                  Nom de la Société *
                </label>
                <input
                  required
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Société El Wifak"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12 }}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, fontSize: 11 }}>
                  <FileText size={10} /> Registre du Commerce (RC)
                </label>
                <input
                  className="form-input"
                  value={rcNumber}
                  onChange={e => setRcNumber(e.target.value)}
                  placeholder="Ex: 16/00-1234567B20"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12 }}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, fontSize: 11 }}>
                  <MapPin size={10} /> Secteur (Wilaya)
                </label>
                <input
                  disabled
                  value={user?.sector || ''}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, cursor: 'not-allowed' }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Numéros de Téléphone */}
          <div className="card" style={{ padding: 22, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 320, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={16} style={{ color: 'var(--accent)' }} />
              </div>
              Téléphones
            </h3>
            <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Ajoutez plusieurs numéros de contact.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12, flex: 1, overflowY: 'auto' }}>
              {phones.map((ph, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    flex: 1, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-primary)',
                    border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <span style={{ fontWeight: 600 }}>{ph}</span>
                    {idx === 0 && (
                      <span style={{ fontSize: 8, color: 'var(--accent)', background: 'var(--accent-glow)', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
                        Principal
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePhone(idx)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--danger)', padding: 6, minWidth: 28 }}
                    title="Supprimer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="form-input"
                placeholder="Ex: 0661 99 88 77"
                value={newPhoneInput}
                onChange={e => setNewPhoneInput(e.target.value)}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 11 }}
              />
              <button
                type="button"
                onClick={handleAddPhone}
                className="btn btn-ghost"
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '7px 10px' }}
              >
                <Plus size={13} /> Ajouter
              </button>
            </div>
          </div>

          {/* Card 3: Adresse & Carte GPS */}
          <div className="card" style={{ padding: 22, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 320, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={16} style={{ color: 'var(--accent)' }} />
              </div>
              Adresse & GPS
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              <div>
                <label className="form-label" style={{ marginBottom: 5, fontSize: 11 }}>Adresse de l'entrepôt</label>
                <input
                  className="form-input"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Ex: Zone Industrielle Lot N° 45"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12 }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, fontSize: 11 }}>
                  <Navigation size={10} /> Point GPS sur la carte
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
            </div>
          </div>

        </div>

        {/* Section Mot de Passe — Full Width Below */}
        <div className="card" style={{ padding: 24, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={16} style={{ color: 'var(--accent)' }} />
            </div>
            Modifier votre Mot de Passe
          </h3>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 18 }}>
            Laissez vide si vous ne souhaitez pas le modifier.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600 }}>
            <div>
              <label className="form-label" style={{ marginBottom: 5, fontSize: 12 }}>Nouveau mot de passe</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Au moins 6 caractères"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: 5, fontSize: 12 }}>Confirmer le mot de passe</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Répétez le mot de passe"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{
              padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: 'linear-gradient(135deg, var(--accent), #7c3aed)', color: '#fff',
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex',
              alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(79, 124, 255, 0.3)'
            }}
          >
            <Save size={18} />
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
}
