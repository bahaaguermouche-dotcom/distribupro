'use client';
import { useState } from 'react';
import { Wallet, TrendingUp, Store, RefreshCw } from 'lucide-react';

const MOCK_RECHARGE_POINTS = [
  { id: 'R001', name: 'Épicerie Centrale Alger', city: 'Alger', float: 150000, limit: 20000, totalProcessed: 780000, txCount: 54, status: 'active' },
  { id: 'R002', name: 'Alimentation Karima', city: 'Oran', float: 85000, limit: 15000, totalProcessed: 430000, txCount: 38, status: 'active' },
  { id: 'R003', name: 'Mini Marché Farid', city: 'Constantine', float: 12000, limit: 10000, totalProcessed: 95000, txCount: 12, status: 'low' },
];

export default function RechargePage() {
  const [selected, setSelected] = useState<typeof MOCK_RECHARGE_POINTS[0] | null>(null);

  const totalFloat = MOCK_RECHARGE_POINTS.reduce((s, r) => s + r.float, 0);
  const totalProcessed = MOCK_RECHARGE_POINTS.reduce((s, r) => s + r.totalProcessed, 0);

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h2 className="page-title">Points de Recharge</h2>
          <p className="page-subtitle">Suivi des floats et règlements</p>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card info">
          <div className="stat-top"><div className="stat-icon info"><Store size={18} /></div></div>
          <div className="stat-value">{MOCK_RECHARGE_POINTS.length}</div>
          <div className="stat-label">Points actifs</div>
        </div>
        <div className="stat-card success">
          <div className="stat-top"><div className="stat-icon success"><Wallet size={18} /></div></div>
          <div className="stat-value">{(totalFloat / 1000).toFixed(0)}k DA</div>
          <div className="stat-label">Float total disponible</div>
        </div>
        <div className="stat-card">
          <div className="stat-top"><div className="stat-icon accent"><TrendingUp size={18} /></div></div>
          <div className="stat-value">{(totalProcessed / 1000).toFixed(0)}k DA</div>
          <div className="stat-label">Total rechargé (cumulé)</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Tableau des Points de Recharge</div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Magasin</th><th>Ville</th><th>Float (DA)</th>
                <th>Limite / tx</th><th>Total traité</th><th>Transactions</th><th>État</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RECHARGE_POINTS.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{r.city}</td>
                  <td>
                    <span style={{ color: r.status === 'low' ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                      {r.float.toLocaleString('fr-DZ')} DA
                    </span>
                  </td>
                  <td>{r.limit.toLocaleString('fr-DZ')} DA</td>
                  <td>{r.totalProcessed.toLocaleString('fr-DZ')} DA</td>
                  <td>{r.txCount}</td>
                  <td>
                    <span className={`badge ${r.status === 'low' ? 'suspended' : 'active'}`}>
                      {r.status === 'low' ? '⚠ Float bas' : '✓ Normal'}
                    </span>
                  </td>
                  <td>
                    <button id={`refloat-${r.id}`} className="btn btn-sm btn-primary" onClick={() => setSelected(r)}>
                      <RefreshCw size={13} /> Re-floater
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Re-floater — {selected.name}</div>
              <button className="icon-btn" onClick={() => setSelected(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
              Float actuel : <strong style={{ color: 'var(--text-primary)' }}>{selected.float.toLocaleString('fr-DZ')} DA</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Montant à ajouter (DA)</label>
              <input className="form-input" type="number" placeholder="Ex: 100000" />
            </div>
            <div className="form-group">
              <label className="form-label">Note de règlement</label>
              <input className="form-input" type="text" placeholder="Règlement mensuel — Août 2026" />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-primary"><RefreshCw size={14} /> Confirmer le règlement</button>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
