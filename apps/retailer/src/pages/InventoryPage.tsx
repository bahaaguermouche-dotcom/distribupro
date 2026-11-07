import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Package, Search, Edit2,
  TrendingUp, DollarSign, X, Eye, RefreshCw,
  Building2, ToggleLeft, ToggleRight, Box
} from 'lucide-react';
import {
  collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface RetailerStockItem {
  id: string;
  retailerId: string;
  distributorId: string;
  distributorName: string;
  productId: string;
  productName: string;
  productImageUrl?: string;
  description?: string;
  categoryName?: string;
  brandName?: string;
  itemsPerBox?: number;
  purchasePrice: number; // Retailer buying price paid to distributor
  retailSellPrice: number; // Retailer selling price to end customer
  stockQuantity: number; // Total stock = shelfStock + reserveStock
  shelfStock?: number; // Stock exposed on store counter / shelf
  reserveStock?: number; // Stock stored in warehouse / reserve
  isActiveForSale?: boolean; // True = visible on counter sales page
  manufacturingDate?: string;
  expiryDate?: string;
  lastUpdated?: any;
}

export default function InventoryPage() {
  const { user } = useAuth();

  const [inventory, setInventory] = useState<RetailerStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low' | 'out'>('all');

  // Modal 1: Edit Retail Sell Price
  const [editingItem, setEditingItem] = useState<RetailerStockItem | null>(null);
  const [newSellPrice, setNewSellPrice] = useState<number | ''>('');
  const [updatingPrice, setUpdatingPrice] = useState(false);

  // Modal 2: Product Details (Fiche Détaillée)
  const [detailsItem, setDetailsItem] = useState<RetailerStockItem | null>(null);

  // Modal 3: Manage Stock Locations (Rayon vs Réserve) & Active Status
  const [stockManageItem, setStockManageItem] = useState<RetailerStockItem | null>(null);
  const [editShelfStock, setEditShelfStock] = useState<number | ''>('');
  const [editReserveStock, setEditReserveStock] = useState<number | ''>('');
  const [editIsActiveForSale, setEditIsActiveForSale] = useState<boolean>(true);
  const [updatingStockLocation, setUpdatingStockLocation] = useState(false);

  // 1. Listen to retailer's inventory in real-time
  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, 'retailer_inventory'),
      where('retailerId', '==', user.id)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items: RetailerStockItem[] = snapshot.docs.map(d => {
        const data = d.data();
        const total = data.stockQuantity || 0;
        const shelf = data.shelfStock !== undefined ? data.shelfStock : total;
        const reserve = data.reserveStock !== undefined ? data.reserveStock : 0;
        return {
          id: d.id,
          ...data,
          shelfStock: shelf,
          reserveStock: reserve,
          isActiveForSale: data.isActiveForSale !== false
        } as RetailerStockItem;
      });
      setInventory(items);
      setLoading(false);
    }, err => {
      console.error('Error fetching inventory:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.id]);

  // Filtering
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.categoryName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.distributorName || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'low') return item.stockQuantity > 0 && item.stockQuantity <= 5;
    if (filterType === 'out') return item.stockQuantity === 0;
    return true;
  });

  // Calculate Warehouse Stats
  const totalItems = inventory.reduce((sum, item) => sum + item.stockQuantity, 0);
  const totalValuation = inventory.reduce((sum, item) => sum + (item.purchasePrice * item.stockQuantity), 0);
  const potentialProfit = inventory.reduce((sum, item) => {
    const itemsPerBox = item.itemsPerBox || 1;
    const unitBuy = item.purchasePrice / itemsPerBox;
    const unitMargin = item.retailSellPrice - unitBuy;
    const cartonMargin = unitMargin * itemsPerBox;
    return sum + (cartonMargin * item.stockQuantity);
  }, 0);

  // Update Retail Sell Price
  const handleUpdatePrice = async () => {
    if (!editingItem || !newSellPrice || newSellPrice <= 0) return;
    setUpdatingPrice(true);

    try {
      const itemRef = doc(db, 'retailer_inventory', editingItem.id);
      await updateDoc(itemRef, {
        retailSellPrice: Number(newSellPrice),
        lastUpdated: serverTimestamp()
      });
      setEditingItem(null);
    } catch (err) {
      console.error('Error updating price:', err);
    } finally {
      setUpdatingPrice(false);
    }
  };

  // Open Stock Location & Visibility Modal
  const openStockManageModal = (item: RetailerStockItem) => {
    const shelf = item.shelfStock !== undefined ? item.shelfStock : item.stockQuantity;
    const reserve = item.reserveStock !== undefined ? item.reserveStock : 0;
    setStockManageItem(item);
    setEditShelfStock(shelf);
    setEditReserveStock(reserve);
    setEditIsActiveForSale(item.isActiveForSale !== false);
  };

  // Save Stock Locations (Rayon ↔ Réserve)
  const handleUpdateStockLocation = async () => {
    if (!stockManageItem) return;
    setUpdatingStockLocation(true);

    try {
      const shelf = editShelfStock === '' ? 0 : Math.max(0, Number(editShelfStock));
      const reserve = editReserveStock === '' ? 0 : Math.max(0, Number(editReserveStock));
      const total = shelf + reserve;

      const itemRef = doc(db, 'retailer_inventory', stockManageItem.id);
      await updateDoc(itemRef, {
        shelfStock: shelf,
        reserveStock: reserve,
        stockQuantity: total,
        isActiveForSale: editIsActiveForSale,
        lastUpdated: serverTimestamp()
      });
      setStockManageItem(null);
    } catch (err) {
      console.error('Error updating stock location:', err);
      alert('Erreur lors de la mise à jour des emplacements de stock.');
    } finally {
      setUpdatingStockLocation(false);
    }
  };

  return (
    <div className="page-enter" style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={24} style={{ color: 'var(--accent)' }} /> Mon Entrepôt / Stocks Magasin
          </h2>
          <p className="page-subtitle">Gestion complète du stock, répartition entre Rayon (Comptoir) et Réserve</p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
        <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={24} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
              {totalItems}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Total Cartons en Stock</div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(79, 124, 255, 0.15)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>
              {totalValuation.toLocaleString('fr-DZ')} DA
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Valeur Totale du Stock (Prix d'achat)</div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--success)', lineHeight: 1 }}>
              +{potentialProfit.toLocaleString('fr-DZ')} DA
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Bénéfice Potentiel Estimé</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="card" style={{ padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div className="search-bar" style={{ flex: 1 }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Rechercher par nom de produit, catégorie ou fournisseur..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
              background: filterType === 'all' ? 'var(--accent)' : 'transparent',
              color: filterType === 'all' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer'
            }}
          >
            Tous ({inventory.length})
          </button>
          <button
            onClick={() => setFilterType('low')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
              background: filterType === 'low' ? 'var(--warning)' : 'transparent',
              color: filterType === 'low' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer'
            }}
          >
            Stock Faible ({inventory.filter(i => i.stockQuantity > 0 && i.stockQuantity <= 5).length})
          </button>
          <button
            onClick={() => setFilterType('out')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
              background: filterType === 'out' ? 'var(--danger)' : 'transparent',
              color: filterType === 'out' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer'
            }}
          >
            Rupture ({inventory.filter(i => i.stockQuantity === 0).length})
          </button>
        </div>
      </div>

      {/* Stock Grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Chargement de votre entrepôt...
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Package size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div>Aucun produit disponible dans votre entrepôt pour le moment.</div>
          <p style={{ fontSize: 12, marginTop: 4 }}>Effectuez un achat auprès d'un distributeur pour alimenter votre stock.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 20 }}>
          {filteredInventory.map(item => {
            const shelf = item.shelfStock !== undefined ? item.shelfStock : item.stockQuantity;
            const reserve = item.reserveStock !== undefined ? item.reserveStock : 0;
            const isActive = item.isActiveForSale !== false;

            return (
              <div key={item.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
                <div>
                  {/* Top Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                      {item.categoryName || 'Général'} {item.brandName ? `• ${item.brandName}` : ''}
                    </span>

                    {item.stockQuantity === 0 ? (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }}>
                        Rupture de stock
                      </span>
                    ) : isActive ? (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: 'rgba(34, 197, 94, 0.15)', color: 'var(--success)' }}>
                        🟢 En Vente au Comptoir
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: 'var(--bg-primary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        ⚪ Hors Rayon (Masqué)
                      </span>
                    )}
                  </div>

                  {/* Product Image & Info */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div
                      onClick={() => setDetailsItem(item)}
                      style={{
                        width: 60, height: 60, borderRadius: 10, background: 'var(--bg-primary)',
                        overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                      }}
                      title="Voir la fiche détaillée du produit"
                    >
                      {item.productImageUrl ? (
                        <img src={item.productImageUrl} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <Package size={26} style={{ opacity: 0.3 }} />
                      )}
                    </div>
                    <div>
                      <h4
                        onClick={() => setDetailsItem(item)}
                        style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, cursor: 'pointer' }}
                        title="Voir la fiche détaillée"
                      >
                        {item.productName}
                      </h4>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Fournisseur : <strong>{item.distributorName}</strong>
                      </div>
                      {item.itemsPerBox && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {item.itemsPerBox} pièces / carton
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stock Location Breakdown Card (Rayon vs Réserve) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>🏪 Rayon (Caisse)</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--success)', marginTop: 2 }}>{shelf} carton(s)</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', opacity: 0.9, marginTop: 1 }}>
                        {Math.round(shelf * (item.itemsPerBox || 1))} pièce(s) dispo.
                      </div>
                    </div>

                    <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(79, 124, 255, 0.1)', border: '1px solid rgba(79, 124, 255, 0.2)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>🏭 Réserve (Entrepôt)</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', marginTop: 2 }}>{reserve} carton(s)</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', opacity: 0.9, marginTop: 1 }}>
                        {Math.round(reserve * (item.itemsPerBox || 1))} pièce(s) réserve
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown Card */}
                  {(() => {
                    const itemsPerBox = item.itemsPerBox || 1;
                    const unitBuyPrice = item.purchasePrice / itemsPerBox;
                    const unitSellPrice = item.retailSellPrice;
                    const unitMargin = unitSellPrice - unitBuyPrice;
                    const marginPercent = unitBuyPrice > 0 ? Math.round((unitMargin / unitBuyPrice) * 100) : 0;
                    const cartonSellPrice = unitSellPrice * itemsPerBox;
                    const cartonMargin = unitMargin * itemsPerBox;

                    return (
                      <div style={{ padding: 10, borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Prix d'Achat Carton :</span>
                          <strong style={{ color: 'var(--text-primary)' }}>
                            {item.purchasePrice.toLocaleString('fr-DZ')} DA ({unitBuyPrice.toFixed(2)} DA/pc)
                          </strong>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Prix Vente Détail (pièce) :</span>
                          <strong style={{ color: 'var(--accent)' }}>
                            {unitSellPrice.toLocaleString('fr-DZ')} DA/pc ({cartonSellPrice.toLocaleString('fr-DZ')} DA/carton)
                          </strong>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, paddingTop: 3, borderTop: '1px dashed var(--border)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Marge Estimée / pc :</span>
                          <strong style={{ color: unitMargin >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {unitMargin >= 0 ? '+' : ''}{unitMargin.toFixed(2)} DA/pc (+{cartonMargin.toLocaleString('fr-DZ')} DA/carton, {marginPercent}%)
                          </strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Card Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 6, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setDetailsItem(item)}
                    title="Fiche produit détaillée"
                    style={{ padding: '6px 8px' }}
                  >
                    <Eye size={14} />
                  </button>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => openStockManageModal(item)}
                    title="Transfert Rayon ↔ Réserve & Masquage"
                    style={{ padding: '6px 8px', fontSize: 11, fontWeight: 600, justifyContent: 'center' }}
                  >
                    <RefreshCw size={12} /> Stock & Rayon
                  </button>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setEditingItem(item); setNewSellPrice(item.retailSellPrice); }}
                    style={{ padding: '6px 8px', fontSize: 11, fontWeight: 600, justifyContent: 'center' }}
                    title="Ajuster le prix de vente au détail"
                  >
                    <Edit2 size={12} /> Modifier Prix
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: PRODUCT DETAILS (FICHE DÉTAILLÉE) */}
      {detailsItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="card page-enter" style={{ width: 500, maxWidth: '90%', padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={18} style={{ color: 'var(--accent)' }} /> Fiche Produit Détaillée
              </h3>
              <button onClick={() => setDetailsItem(null)} className="btn btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 90, height: 90, borderRadius: 12, background: 'var(--bg-primary)',
                overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {detailsItem.productImageUrl ? (
                  <img src={detailsItem.productImageUrl} alt={detailsItem.productName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <Package size={40} style={{ opacity: 0.3 }} />
                )}
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                  {detailsItem.categoryName || 'Général'} {detailsItem.brandName ? `• ${detailsItem.brandName}` : ''}
                </div>
                <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                  {detailsItem.productName}
                </h4>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={14} /> Fournisseur : <strong>{detailsItem.distributorName}</strong>
                </div>
                {detailsItem.itemsPerBox && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Box size={14} /> Conditionnement : <strong>{detailsItem.itemsPerBox} pièces / carton</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Specifications Card */}
            <div style={{ background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Prix d'Achat payé :</span>
                <strong style={{ color: 'var(--text-primary)' }}>{detailsItem.purchasePrice.toLocaleString('fr-DZ')} DA</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Prix Vente Détail :</span>
                <strong style={{ color: 'var(--accent)' }}>{detailsItem.retailSellPrice.toLocaleString('fr-DZ')} DA</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingTop: 6, borderTop: '1px dashed var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Marge bénéficiaire nette :</span>
                <strong style={{ color: 'var(--success)' }}>
                  +{(detailsItem.retailSellPrice - detailsItem.purchasePrice).toLocaleString('fr-DZ')} DA
                </strong>
              </div>

              {detailsItem.expiryDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--warning)', paddingTop: 6, borderTop: '1px dashed var(--border)' }}>
                  <span>Date de péremption (DLC) :</span>
                  <strong>{detailsItem.expiryDate}</strong>
                </div>
              )}
            </div>

            {/* Locations breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>🏪 EN RAYON (COMPTOIR)</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--success)', marginTop: 2 }}>
                  {detailsItem.shelfStock !== undefined ? detailsItem.shelfStock : detailsItem.stockQuantity} cartons
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', marginTop: 2 }}>
                  {Math.round((detailsItem.shelfStock !== undefined ? detailsItem.shelfStock : detailsItem.stockQuantity) * (detailsItem.itemsPerBox || 1))} pièce(s) disponible(s)
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(79, 124, 255, 0.1)', border: '1px solid rgba(79, 124, 255, 0.2)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>🏭 EN RÉSERVE (ENTREPÔT)</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent)', marginTop: 2 }}>
                  {detailsItem.reserveStock !== undefined ? detailsItem.reserveStock : 0} cartons
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>
                  {Math.round((detailsItem.reserveStock !== undefined ? detailsItem.reserveStock : 0) * (detailsItem.itemsPerBox || 1))} pièce(s) en réserve
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setDetailsItem(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: STOCK LOCATIONS (RAYON ↔ RÉSERVE) & VISIBILITY */}
      {stockManageItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="card page-enter" style={{ width: 460, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={18} style={{ color: 'var(--accent)' }} /> Gérer le Stock & Rayon
              </h3>
              <button onClick={() => setStockManageItem(null)} className="btn btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {stockManageItem.productName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Définissez le nombre de cartons placés en rayon (comptoir) et en réserve (entrepôt).
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label className="form-label">🏪 Quantité en Rayon *</label>
                <input
                  type="number"
                  min={0}
                  className="form-input"
                  value={editShelfStock}
                  onChange={e => setEditShelfStock(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ex: 2"
                />
              </div>

              <div>
                <label className="form-label">🏭 Quantité en Réserve *</label>
                <input
                  type="number"
                  min={0}
                  className="form-input"
                  value={editReserveStock}
                  onChange={e => setEditReserveStock(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ex: 6"
                />
              </div>
            </div>

            {/* Visibility Toggle */}
            <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Disponible en Vente au Comptoir</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Affiche ou masque le produit sur la page de caisse</div>
              </div>

              <button
                type="button"
                onClick={() => setEditIsActiveForSale(!editIsActiveForSale)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: editIsActiveForSale ? 'var(--success)' : 'var(--text-muted)'
                }}
              >
                {editIsActiveForSale ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setStockManageItem(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleUpdateStockLocation} disabled={updatingStockLocation}>
                {updatingStockLocation ? 'Mise à jour...' : 'Enregistrer les emplacements'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT RETAIL SELL PRICE */}
      {editingItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="card page-enter" style={{ width: 480, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit2 size={18} style={{ color: 'var(--accent)' }} /> Ajuster le Prix de Vente
              </h3>
              <button onClick={() => setEditingItem(null)} className="btn btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>

            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              {editingItem.productName}
            </div>

            <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', marginBottom: 18, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Conditionnement :</span>
                <strong>{editingItem.itemsPerBox || 1} pièces / carton</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Prix d'achat carton :</span>
                <strong>{editingItem.purchasePrice.toLocaleString('fr-DZ')} DA</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Coût d'achat unitaire par pièce :</span>
                <strong style={{ color: 'var(--accent)' }}>{((editingItem.purchasePrice || 1) / (editingItem.itemsPerBox || 1)).toFixed(2)} DA / pièce</strong>
              </div>
            </div>

            {(() => {
              const itemsPerBox = editingItem.itemsPerBox || 1;
              const unitBuy = editingItem.purchasePrice / itemsPerBox;
              const valSell = newSellPrice !== '' ? Number(newSellPrice) : 0;
              const unitMargin = valSell - unitBuy;
              const cartonRevenue = valSell * itemsPerBox;
              const cartonMargin = unitMargin * itemsPerBox;
              const marginPercent = unitBuy > 0 ? Math.round((unitMargin / unitBuy) * 100) : 0;

              return (
                <div style={{ marginBottom: 20 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Nouveau Prix de Vente au Détail PAR PIÈCE (DA) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0.01}
                    className="form-input"
                    value={newSellPrice}
                    onChange={e => setNewSellPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ex: 15"
                    style={{ fontSize: 15, fontWeight: 700, padding: 12 }}
                  />

                  {/* Live Profit Preview Box inside Modal */}
                  {newSellPrice !== '' && valSell > 0 && (
                    <div style={{
                      marginTop: 14, padding: 12, borderRadius: 10,
                      background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)',
                      display: 'flex', flexDirection: 'column', gap: 6
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>
                        📊 Aperçu des Bénéfices au Détail
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 2 }}>
                        <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Marge Net / Pièce</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: unitMargin >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: 2 }}>
                            {unitMargin >= 0 ? '+' : ''}{unitMargin.toFixed(2)} DA ({marginPercent}%)
                          </div>
                        </div>
                        <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Marge Net / Carton</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: cartonMargin >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: 2 }}>
                            {cartonMargin >= 0 ? '+' : ''}{cartonMargin.toLocaleString('fr-DZ')} DA
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Revenu total par carton ({itemsPerBox} pcs) :</span>
                        <strong>{cartonRevenue.toLocaleString('fr-DZ')} DA</strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setEditingItem(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleUpdatePrice} disabled={updatingPrice}>
                {updatingPrice ? 'Enregistrement...' : 'Enregistrer le nouveau prix'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
