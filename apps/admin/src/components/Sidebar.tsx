'use client';
import { useState } from 'react';
import {
  LayoutDashboard, Store, Truck, Users, ShieldCheck,
  Settings, LogOut, Bell, CreditCard, FileText, Menu, X, Layers, Package
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navSections = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Catalogue',
    items: [
      { id: 'categories', label: 'Catégories & Marques', icon: Layers },
      { id: 'products', label: 'Produits', icon: Package },
    ]
  },
  {
    label: 'Utilisateurs',
    items: [
      { id: 'distributors', label: 'Distributeurs', icon: Truck },
      { id: 'retailers', label: 'Détaillants', icon: Store },
      { id: 'delivery', label: 'Livreurs', icon: Users },
    ]
  },
  {
    label: 'Finance',
    items: [
      { id: 'recharge', label: 'Points de Recharge', icon: CreditCard },
      { id: 'commissions', label: 'Commissions & Frais', icon: Settings },
    ]
  },
  {
    label: 'Système',
    items: [
      { id: 'disputes', label: 'Litiges', icon: FileText },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'logs', label: "Journaux d'activité", icon: ShieldCheck },
    ]
  }
];

interface SidebarProps {
  active: string;
  onNavigate: (id: string) => void;
}

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'AD';

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} style={{ width: collapsed ? '64px' : 'var(--sidebar-width)', transition: 'width 0.2s ease' }}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <ShieldCheck size={18} color="white" />
        </div>
        <div className="sidebar-logo-text">
          <h1>DistribuPro</h1>
          <span>Super Admin</span>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-toggle"
        >
          {collapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>

      <div className="sidebar-content" style={{ flex: 1, overflowY: 'auto' }}>
        {navSections.map((section) => (
          <div className="sidebar-section" key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            <ul className="sidebar-nav">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      id={`nav-${item.id}`}
                      className={`sidebar-nav-item ${active === item.id ? 'active' : ''} has-tooltip`}
                      onClick={() => onNavigate(item.id)}
                    >
                      <Icon size={16} style={{ flexShrink: 0 }} />
                      <span className="nav-label">{item.label}</span>
                      {collapsed && <div className="tooltip">{item.label}</div>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="sidebar-footer" style={{ flexShrink: 0, background: 'var(--bg-secondary)' }}>
        <div className="sidebar-user" onClick={() => logout()}>
          <div className="avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.email ?? 'Administrateur'}</div>
            <div className="sidebar-user-role">Super Admin</div>
          </div>
          <LogOut className="logout-icon" size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  );
}
