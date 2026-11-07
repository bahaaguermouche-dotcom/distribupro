'use client';
import { useState } from 'react';
import { CheckCircle, XCircle, Eye, Bike, Car, Truck, TruckIcon } from 'lucide-react';

const VEHICLE_ICONS: Record<string, React.ReactNode> = {
  'Vélo': <Bike size={14} />,
  'Voiture': <Car size={14} />,
  'Camionnette': <Truck size={14} />,
  'Camion': <TruckIcon size={14} />,
};

const MOCK_DELIVERY = [
  { id: 'L001', name: 'Mohamed Salah', city: 'Alger', phone: '0551 001 002', vehicle: 'Camionnette', deliveries: 87, rating: 4.9, status: 'active', date: '01/07/2026' },
  { id: 'L002', name: 'Karim Benali', city: 'Oran', phone: '0662 003 004', vehicle: 'Voiture', deliveries: 142, rating: 4.6, status: 'active', date: '15/05/2026' },
  { id: 'L003', name: 'Yassine Aoudia', city: 'Alger', phone: '0771 005 006', vehicle: 'Vélo', deliveries: 0, rating: 0, status: 'pending', date: '07/08/2026' },
  { id: 'L004', name: 'Sofiane Meziani', city: 'Blida', phone: '0559 007 008', vehicle: 'Camion', deliveries: 23, rating: 4.3, status: 'active', date: '10/06/2026' },
  { id: 'L005', name: 'Ryad Hadjadj', city: 'Constantine', phone: '0663 009 010', vehicle: 'Voiture', deliveries: 0, rating: 0, status: 'pending', date: '06/08/2026' },
  { id: 'L006', name: 'Bilal Cherif', city: 'Sétif', phone: '0770 011 012', vehicle: 'Camionnette', deliveries: 56, rating: 3.8, status: 'suspended', date: '20/03/2026' },
];

export default function DeliveryPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const [selected, setSelected] = useState<typeof MOCK_DELIVERY[0] | null>(null);

  const filtered = filter === 'all' ? MOCK_DELIVERY : MOCK_DELIVERY.filter(l => l.status === filter);

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h2 className="page-title">Livreurs</h2>
          <p className="page-subtitle">Gérer les livreurs et leurs véhicules</p>
        </div>
      </div>

      <div className="filter-bar">
        {(['all', 'pending', 'active', 'suspended'] as const).map(f => (
          <button key={f} id={`filter-del-${f}`} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'active' ? 'Actifs' : 'Suspendus'}
            &nbsp;<span style={{ opacity: 0.7 }}>({MOCK_DELIVERY.filter(l => f === 'all' || l.status === f).length})</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Nom</th><th>Ville</th><th>Véhicule</th>
                <th>Livraisons</th><th>Note</th><th>Statut</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{l.id}</td>
                  <td style={{ fontWeight: 600 }}>{l.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{l.city}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {VEHICLE_ICONS[l.vehicle]}{l.vehicle}
                    </span>
                  </td>
                  <td>{l.deliveries}</td>
                  <td style={{ color: l.rating > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {l.rating > 0 ? `⭐ ${l.rating}` : '—'}
                  </td>
                  <td>
                    <span className={`badge ${l.status === 'active' ? 'active' : l.status === 'pending' ? 'pending' : 'suspended'}`}>
                      {l.status === 'active' ? 'Actif' : l.status === 'pending' ? 'En attente' : 'Suspendu'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button id={`view-del-${l.id}`} className="btn btn-ghost btn-sm" onClick={() => setSelected(l)}><Eye size={13} /></button>
                      {l.status === 'pending' && (
                        <>
                          <button id={`approve-del-${l.id}`} className="btn btn-success btn-sm"><CheckCircle size={13} /></button>
                          <button id={`reject-del-${l.id}`} className="btn btn-danger btn-sm"><XCircle size={13} /></button>
                        </>
                      )}
                      {l.status === 'active' && <button className="btn btn-danger btn-sm"><XCircle size={13} /></button>}
                      {l.status === 'suspended' && <button className="btn btn-success btn-sm"><CheckCircle size={13} /></button>}
                    </div>
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
              <div className="modal-title">Livreur — {selected.name}</div>
              <button className="icon-btn" onClick={() => setSelected(null)}><XCircle size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {[
                ['ID', selected.id], ['Ville', selected.city],
                ['Téléphone', selected.phone], ['Véhicule', selected.vehicle],
                ['Livraisons totales', selected.deliveries], ['Note moyenne', selected.rating || '—'],
              ].map(([k, v]) => (
                <div key={k}><div className="form-label">{k}</div><div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v}</div></div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              {selected.status === 'pending' && <><button className="btn btn-success"><CheckCircle size={14} /> Approuver</button><button className="btn btn-danger"><XCircle size={14} /> Rejeter</button></>}
              {selected.status === 'active' && <button className="btn btn-danger"><XCircle size={14} /> Suspendre</button>}
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
