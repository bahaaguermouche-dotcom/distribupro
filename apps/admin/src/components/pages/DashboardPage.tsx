'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Users, Store, Truck, CreditCard, ShoppingCart, AlertTriangle } from 'lucide-react';

const revenueData = [
  { month: 'Fév', commissions: 42000, rechargements: 18000 },
  { month: 'Mar', commissions: 58000, rechargements: 22000 },
  { month: 'Avr', commissions: 51000, rechargements: 19000 },
  { month: 'Mai', commissions: 74000, rechargements: 31000 },
  { month: 'Jun', commissions: 68000, rechargements: 27000 },
  { month: 'Juil', commissions: 89000, rechargements: 38000 },
  { month: 'Aoû', commissions: 95000, rechargements: 42000 },
];

const ordersData = [
  { day: 'Lun', b2b: 45, b2c: 79 },
  { day: 'Mar', b2b: 32, b2c: 66 },
  { day: 'Mer', b2b: 58, b2c: 99 },
  { day: 'Jeu', b2b: 51, b2c: 92 },
  { day: 'Ven', b2b: 63, b2c: 126 },
  { day: 'Sam', b2b: 72, b2c: 129 },
  { day: 'Dim', b2b: 15, b2c: 72 },
];

const cityDistribution = [
  { name: 'Alger', value: 45 },
  { name: 'Oran', value: 25 },
  { name: 'Constantine', value: 15 },
  { name: 'Sétif', value: 10 },
  { name: 'Autres', value: 5 },
];
const COLORS = ['#4f7cff', '#7c3aed', '#06b6d4', '#f59e0b', '#8892b0'];

const recentActivity = [
  { color: 'var(--warning)', text: 'Nouveau distributeur en attente d\'approbation : Société Amine & Frères', time: 'Il y a 5 min' },
  { color: 'var(--success)', text: 'Détaillant "Épicerie Centrale" approuvé avec succès', time: 'Il y a 23 min' },
  { color: 'var(--info)', text: 'Point de Recharge assigné au magasin "Alimentation Karima"', time: 'Il y a 1h' },
  { color: 'var(--danger)', text: 'Litige ouvert entre Distributeur #14 et Détaillant #7', time: 'Il y a 2h' },
  { color: 'var(--success)', text: 'Livreur "Mohamed Salah" approuvé — Véhicule : Camionnette', time: 'Il y a 3h' },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{name: string; value: number; color: string}>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p style={{ fontWeight: 700, marginBottom: 6 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: <strong>{p.value.toLocaleString('fr-DZ')} DA</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h2 className="page-title">Tableau de bord</h2>
          <p className="page-subtitle">Vue d&apos;ensemble de la plateforme — Août 2026</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card success">
          <div className="stat-top">
            <div className="stat-icon success"><Store size={18} /></div>
            <div className="stat-trend up"><TrendingUp size={13} /> +12%</div>
          </div>
          <div className="stat-value">148</div>
          <div className="stat-label">Détaillants actifs</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-top">
            <div className="stat-icon warning"><Truck size={18} /></div>
            <div className="stat-trend up"><TrendingUp size={13} /> +4%</div>
          </div>
          <div className="stat-value">32</div>
          <div className="stat-label">Distributeurs actifs</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon accent"><Users size={18} /></div>
            <div className="stat-trend up"><TrendingUp size={13} /> +28%</div>
          </div>
          <div className="stat-value">2 417</div>
          <div className="stat-label">Consommateurs inscrits</div>
        </div>
        <div className="stat-card info">
          <div className="stat-top">
            <div className="stat-icon info"><ShoppingCart size={18} /></div>
            <div className="stat-trend up"><TrendingUp size={13} /> +7%</div>
          </div>
          <div className="stat-value">1 089</div>
          <div className="stat-label">Commandes ce mois</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon accent"><CreditCard size={18} /></div>
            <div className="stat-trend up"><TrendingUp size={13} /> +19%</div>
          </div>
          <div className="stat-value">137 000 DA</div>
          <div className="stat-label">Commissions ce mois</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-top">
            <div className="stat-icon danger"><AlertTriangle size={18} /></div>
            <div className="stat-trend down"><TrendingDown size={13} /> -2</div>
          </div>
          <div className="stat-value">8</div>
          <div className="stat-label">En attente d&apos;approbation</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Revenus de la plateforme</div>
              <div className="card-subtitle">Commissions + Rechargements (DA)</div>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f7cff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f7cff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rechGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="commissions" name="Commissions" stroke="#4f7cff" fill="url(#commGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="rechargements" name="Rechargements" stroke="#06b6d4" fill="url(#rechGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Répartition par région</div>
              <div className="card-subtitle">Volume des commandes</div>
            </div>
          </div>
          <div className="chart-container" style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cityDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {cityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '12px' }} formatter={(v) => [`${v}%`]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2-1 mb-6">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Commandes / Semaine</div>
              <div className="card-subtitle">7 derniers jours</div>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersData} barSize={12} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--accent-glow)' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="b2b" name="Magasin → Distributeur" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="b2c" name="Client → Magasin" fill="#4f7cff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Activité récente</div>
        </div>
        {recentActivity.map((a, i) => (
          <div className="activity-item" key={i}>
            <div className="activity-dot" style={{ background: a.color }} />
            <div className="activity-content">
              <div className="activity-text">{a.text}</div>
              <div className="activity-time">{a.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
