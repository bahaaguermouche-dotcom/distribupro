'use client';
import { useState } from 'react';
import { Bell, Search } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import DashboardPage from '@/components/pages/DashboardPage';
import DistributorsPage from '@/components/pages/DistributorsPage';
import RetailersPage from '@/components/pages/RetailersPage';
import DeliveryPage from '@/components/pages/DeliveryPage';
import RechargePage from '@/components/pages/RechargePage';
import CommissionsPage from '@/components/pages/CommissionsPage';
import CategoriesPage from '@/components/pages/CategoriesPage';
import ProductsPage from '@/components/pages/ProductsPage';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Tableau de bord', subtitle: 'Vue d\'ensemble de la plateforme' },
  distributors: { title: 'Distributeurs', subtitle: 'Gérer les distributeurs' },
  retailers: { title: 'Détaillants', subtitle: 'Gérer les magasins' },
  delivery: { title: 'Livreurs', subtitle: 'Gérer les livreurs' },
  recharge: { title: 'Points de Recharge', subtitle: 'Suivi des floats' },
  commissions: { title: 'Commissions & Frais', subtitle: 'Configuration tarifaire' },
  categories: { title: 'Catégories (Taxonomie)', subtitle: 'Gérer l\'arborescence des produits' },
  products: { title: 'Catalogue Produits', subtitle: 'Gérer la liste des produits disponibles' },
  disputes: { title: 'Litiges', subtitle: 'Gestion des litiges' },
  notifications: { title: 'Notifications', subtitle: 'Annonces système' },
  logs: { title: 'Journaux d\'activité', subtitle: 'Historique des actions' },
};

function renderPage(page: string) {
  switch (page) {
    case 'dashboard': return <DashboardPage />;
    case 'distributors': return <DistributorsPage />;
    case 'retailers': return <RetailersPage />;
    case 'delivery': return <DeliveryPage />;
    case 'recharge': return <RechargePage />;
    case 'commissions': return <CommissionsPage />;
    case 'categories': return <CategoriesPage />;
    case 'products': return <ProductsPage />;
    default:
      return (
        <div className="empty-state">
          <div style={{ fontSize: 48 }}>🚧</div>
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Page en cours de développement</h3>
          <p>Cette section sera disponible prochainement.</p>
        </div>
      );
  }
}

export default function AdminLayout() {
  const [page, setPage] = useState('dashboard');
  const pageInfo = PAGE_TITLES[page] ?? PAGE_TITLES['dashboard'];

  return (
    <div className="layout">
      <Sidebar active={page} onNavigate={setPage} />
      <div className="main">
        <header className="header">
          <div>
            <div className="header-title">{pageInfo.title}</div>
            <div className="header-subtitle">{pageInfo.subtitle}</div>
          </div>
          <div className="header-spacer" />
          <div className="header-search">
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input id="global-search" placeholder="Rechercher..." />
          </div>
          <button id="notif-btn" className="icon-btn">
            <Bell size={16} />
            <div className="notif-dot" />
          </button>
        </header>
        <main className="content">
          {renderPage(page)}
        </main>
      </div>
    </div>
  );
}
