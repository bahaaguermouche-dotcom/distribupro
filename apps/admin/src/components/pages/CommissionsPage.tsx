'use client';
import { useState } from 'react';
import { Save, Percent, Truck, MapPin } from 'lucide-react';

export default function CommissionsPage() {
  const [commDist, setCommDist] = useState('3');
  const [commRet, setCommRet] = useState('5');
  const [baseDelivery, setBaseDelivery] = useState('200');
  const [perKm, setPerKm] = useState('15');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h2 className="page-title">Commissions & Frais</h2>
          <p className="page-subtitle">Configurer les taux de commission et les frais de livraison</p>
        </div>
        <button id="save-commissions" className="btn btn-primary" onClick={handleSave}>
          <Save size={14} /> {saved ? 'Enregistré ✓' : 'Enregistrer'}
        </button>
      </div>

      <div className="grid-2">
        {/* Commissions */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title"><Percent size={15} style={{ display: 'inline', marginRight: 6 }} />Commissions plateforme</div>
              <div className="card-subtitle">Prélevées sur chaque transaction</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Commission sur ventes distributeur (%)</label>
            <input className="form-input" type="number" min="0" max="20" step="0.5"
              value={commDist} onChange={e => setCommDist(e.target.value)} />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              Appliquée sur chaque commande passée par un détaillant à un distributeur.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Commission sur ventes détaillant (%)</label>
            <input className="form-input" type="number" min="0" max="20" step="0.5"
              value={commRet} onChange={e => setCommRet(e.target.value)} />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              Appliquée sur chaque vente effectuée par un détaillant à un consommateur.
            </p>
          </div>

          <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginTop: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Aperçu — Commande de 10 000 DA</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Commission distributeur', `${(10000 * Number(commDist) / 100).toLocaleString('fr-DZ')} DA`],
                ['Commission détaillant', `${(10000 * Number(commRet) / 100).toLocaleString('fr-DZ')} DA`],
                ['Total plateforme', `${(10000 * (Number(commDist) + Number(commRet)) / 100).toLocaleString('fr-DZ')} DA`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Delivery fees */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title"><Truck size={15} style={{ display: 'inline', marginRight: 6 }} />Frais de livraison</div>
              <div className="card-subtitle">Calcul basé sur la distance</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Frais de base (DA)</label>
            <input className="form-input" type="number" min="0" value={baseDelivery} onChange={e => setBaseDelivery(e.target.value)} />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Appliqués à chaque livraison, peu importe la distance.</p>
          </div>
          <div className="form-group">
            <label className="form-label">Tarif par km supplémentaire (DA)</label>
            <input className="form-input" type="number" min="0" value={perKm} onChange={e => setPerKm(e.target.value)} />
          </div>

          <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginTop: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
              <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />Exemples de frais
            </p>
            {[2, 5, 10, 20].map(km => (
              <div key={km} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{km} km</span>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                  {(Number(baseDelivery) + km * Number(perKm)).toLocaleString('fr-DZ')} DA
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
