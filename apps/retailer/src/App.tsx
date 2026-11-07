import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  Store, ShoppingCart, Wallet, Settings, LogOut, MapPin,
  ChevronLeft, ChevronRight, LayoutDashboard, CreditCard, ShieldCheck, Package
} from 'lucide-react';
import LoginPage from './pages/LoginPage';
import FirstLoginOnboardingPage from './pages/FirstLoginOnboardingPage';
import SettingsPage from './pages/SettingsPage';
import PurchasesPage from './pages/PurchasesPage';
import InventoryPage from './pages/InventoryPage';
import CounterSalesPage from './pages/CounterSalesPage';
import { AuthProvider, useAuth } from './context/AuthContext';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="sidebar"
      style={{
        width: collapsed ? 72 : 260,
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-card)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease-in-out',
        position: 'relative'
      }}
    >
      {/* Header */}
      <div style={{
        padding: collapsed ? '20px 12px' : '24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {!collapsed && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>DistribuPro</h1>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Espace Boutique & Détaillant</p>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Déplier le menu" : "Réduire le menu"}
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            width: 28, height: 28, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', margin: collapsed ? '0 auto' : '0'
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ padding: collapsed ? '16px 8px' : '16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {[
          { id: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
          { id: '/counter-sales', icon: Store, label: 'Vente au Comptoir' },
          { id: '/catalog', icon: ShoppingCart, label: 'Acheter des Produits' },
          { id: '/inventory', icon: Package, label: 'Mon Entrepôt / Stocks' },
          { id: '/wallet', icon: Wallet, label: 'Portefeuille & Recharge' },
          { id: '/settings', icon: Settings, label: 'Paramètres' },
        ].map(item => {
          const Icon = item.icon;
          const active = path === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: 12, padding: collapsed ? '12px' : '10px 16px',
                borderRadius: 'var(--radius)', background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer',
                textAlign: 'left', fontWeight: active ? 600 : 500, transition: 'all 0.2s'
              }}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div style={{
        padding: collapsed ? '12px' : '16px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between'
      }}>
        {!collapsed && (
          <div style={{ minWidth: 0, paddingRight: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Magasin'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={10} /> {user?.sector}
            </div>
          </div>
        )}
        <button
          onClick={logout}
          title="Déconnexion"
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}

function RetailerDashboard() {
  const { user } = useAuth();

  return (
    <div className="page-enter" style={{ padding: 32, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Store size={22} style={{ color: 'var(--accent)' }} /> Tableau de Bord Magasin
          </h2>
          <p className="page-subtitle">Bienvenue, <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong> • Secteur {user?.sector}</p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <Wallet size={24} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>
              {(user?.walletBalance || 0).toLocaleString('fr-DZ')} DA
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Solde Portefeuille Numérique</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <ShoppingCart size={24} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>0</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Commandes en cours</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>Actif</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Statut du Compte Magasin</div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="card" style={{ padding: 24, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CreditCard size={18} style={{ color: 'var(--accent)' }} /> Espace Client & Commande Directe
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Votre boutique est configurée et prête pour passer des commandes directement auprès des distributeurs agréés de votre secteur. Vous pourrez également régler vos achats instantanément en utilisant votre portefeuille numérique sans espèces.
        </p>
      </div>
    </div>
  );
}

function MainAppContent() {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  if (user.isFirstLogin) {
    return <FirstLoginOnboardingPage />;
  }

  return (
    <div className="layout" style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Routes>
          <Route path="/" element={<RetailerDashboard />} />
          <Route path="/counter-sales" element={<CounterSalesPage />} />
          <Route path="/catalog" element={<PurchasesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/wallet" element={<div style={{ padding: 40 }}>💳 Portefeuille Numérique & Point de Recharge (En cours de développement)</div>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<div style={{ padding: 40 }}>🚧 Page en construction</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
