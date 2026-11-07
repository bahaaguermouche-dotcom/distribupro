import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  Package, ScanBarcode, TrendingUp, AlertTriangle, LayoutDashboard,
  ShoppingCart, Settings, LogOut, MapPin, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import CatalogPage from './pages/CatalogPage';
import OrdersPage from './pages/OrdersPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import FirstLoginOnboardingPage from './pages/FirstLoginOnboardingPage';
import CustomAnalyticsWidget from './components/CustomAnalyticsWidget';
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
      {/* Sidebar Header & Toggle */}
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
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Logiciel Entrepôt</p>
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

      {/* Navigation */}
      <nav style={{ padding: collapsed ? '16px 8px' : '16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {[
          { id: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
          { id: '/catalog', icon: Package, label: 'Catalogue & Stock' },
          { id: '/orders', icon: ShoppingCart, label: 'Commandes' },
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
              {user?.name || 'Distributeur'}
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

function Dashboard() {
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  useBarcodeScanner((barcode) => {
    setScannedCode(barcode);
    setTimeout(() => setScannedCode(null), 3000);
  });

  return (
    <div className="page-enter" style={{ padding: 32, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h2 className="page-title">Tableau de bord</h2>
          <p className="page-subtitle">Mode Hors-ligne : <span style={{ color: 'var(--success)' }}>Activé</span></p>
        </div>
      </div>
      
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-top"><div className="stat-icon accent"><Package size={18} /></div></div>
          <div className="stat-value">1 245</div><div className="stat-label">Produits en stock</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-top"><div className="stat-icon warning"><AlertTriangle size={18} /></div></div>
          <div className="stat-value">12</div><div className="stat-label">Produits en stock faible</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-top"><div className="stat-icon danger"><AlertTriangle size={18} /></div></div>
          <div className="stat-value">3</div><div className="stat-label">Péremptions proches</div>
        </div>
        <div className="stat-card success">
          <div className="stat-top"><div className="stat-icon success"><TrendingUp size={18} /></div></div>
          <div className="stat-value">8</div><div className="stat-label">Commandes à préparer</div>
        </div>
      </div>

      <div className="empty-state" style={{ minHeight: 180, border: '2px dashed var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-card)', transition: 'all 0.3s', marginBottom: 32 }}>
        {scannedCode ? (
          <div style={{ color: 'var(--success)', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Package size={30} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700 }}>Code scanné !</h3>
            <p style={{ fontSize: 26, fontFamily: 'monospace', marginTop: 8, color: 'var(--text-primary)' }}>{scannedCode}</p>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 13 }}>Recherche du produit dans la base de données...</p>
          </div>
        ) : (
          <>
            <ScanBarcode size={48} color="var(--accent)" style={{ marginBottom: 16, opacity: 0.8 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Prêt à scanner</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 13 }}>Branchez votre douchette USB et scannez un produit pour commencer.</p>
          </>
        )}
      </div>

      {/* Custom Analytics & Charts Creator */}
      <CustomAnalyticsWidget />
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/orders" element={<OrdersPage />} />
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
