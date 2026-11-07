import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LocationPickerMap from '../components/LocationPickerMap';
import { Store, MapPin, Phone, Lock, Save, Plus, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();

  // Profile Form States
  const [storeName, setStoreName] = useState(user?.name || '');
  const [rcNumber, setRcNumber] = useState(user?.rcNumber || '');
  const [address, setAddress] = useState(user?.address || '');
  
  // Phone numbers (primary + additional)
  const [phones, setPhones] = useState<string[]>(
    user?.phones && user.phones.length > 0
      ? user.phones
      : [user?.phone || user?.phoneOrEmail || '']
  );
  const [newPhoneInput, setNewPhoneInput] = useState('');

  // GPS Coordinates
  const [lat, setLat] = useState<number>(user?.lat || 36.7538);
  const [lng, setLng] = useState<number>(user?.lng || 3.0588);

  // Security / Password Form
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('Les deux mots de passe ne correspondent pas.');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        name: storeName.trim(),
        rcNumber: rcNumber.trim(),
        address: address.trim(),
        phone: phones[0] || '',
        phones,
        lat,
        lng,
      };

      if (newPassword) {
        updateData.newPassword = newPassword;
      }

      const ok = await updateProfile(updateData);
      if (ok) {
        setSuccessMsg('Profil et paramètres mis à jour avec succès !');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg('Erreur lors de la mise à jour du profil.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Une erreur est survenue lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-enter" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Store size={22} style={{ color: 'var(--accent)' }} /> Paramètres du Magasin
          </h2>
          <p className="page-subtitle">Modifiez vos informations, numéros de contact, emplacement GPS et mot de passe</p>
        </div>
      </div>

      {successMsg && (
        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', color: 'var(--success)', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAlert size={16} /> {errorMsg}
        </div>
      )}

      <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* 3-COLUMN CARDS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          
          {/* CARD 1: STORE PROFILE */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Store size={16} style={{ color: 'var(--accent)' }} /> Profil Boutique
            </div>

            <div>
              <label className="form-label">Nom de l'Enseigne *</label>
              <input
                required type="text" className="form-input"
                value={storeName} onChange={e => setStoreName(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Registre du Commerce / NIF</label>
              <input
                type="text" className="form-input"
                placeholder="Ex: RC-2026-B-12345"
                value={rcNumber} onChange={e => setRcNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Secteur / Wilaya (Administrateur)</label>
              <input
                disabled type="text" className="form-input"
                value={user?.sector || ''}
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>
          </div>

          {/* CARD 2: PHONES */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone size={16} style={{ color: 'var(--accent)' }} /> Numéros de Téléphone
            </div>

            <div>
              <label className="form-label">Ajouter un autre numéro</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="tel" className="form-input"
                  placeholder="Ex: 0555 99 88 77"
                  value={newPhoneInput} onChange={e => setNewPhoneInput(e.target.value)}
                />
                <button type="button" className="btn btn-primary" onClick={handleAddPhone} style={{ flexShrink: 0 }}>
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <label className="form-label">Numéros enregistrés :</label>
              {phones.map((ph, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={13} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontWeight: 600 }}>{ph}</span>
                    {idx === 0 && <span style={{ fontSize: 10, background: 'var(--accent-glow)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>Principal</span>}
                  </div>
                  <button type="button" onClick={() => handleRemovePhone(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 2 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* CARD 3: ADDRESS & GPS MAP */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={16} style={{ color: 'var(--accent)' }} /> Adresse & Carte GPS
            </div>

            <div>
              <label className="form-label">Adresse textuelle</label>
              <input
                type="text" className="form-input"
                placeholder="Ex: Rue 1er Novembre, N° 4..."
                value={address} onChange={e => setAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Coordonnées GPS</label>
              <LocationPickerMap lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} height={150} />
            </div>
          </div>
        </div>

        {/* STANDALONE CARD: SECURITY / PASSWORD */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={16} style={{ color: 'var(--accent)' }} /> Sécurité & Mot de passe
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Nouveau Mot de Passe (Optionnel)</label>
              <input
                type="password" className="form-input"
                placeholder="Laisser vide pour ne pas modifier"
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Confirmer le nouveau Mot de Passe</label>
              <input
                type="password" className="form-input"
                placeholder="Confirmer le nouveau mot de passe"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 28px', fontSize: 14, fontWeight: 700 }}>
            <Save size={16} /> {saving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
}
