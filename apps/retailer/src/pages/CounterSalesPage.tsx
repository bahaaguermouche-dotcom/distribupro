import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Store, ShoppingBag, Search, Plus, Minus, X, CheckCircle2,
  Package, RefreshCw, Printer
} from 'lucide-react';
import {
  collection, query, where, onSnapshot, updateDoc, doc, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RetailerStockItem } from './InventoryPage';

export interface CartSaleItem {
  product: RetailerStockItem;
  quantity: number;
}

export default function CounterSalesPage() {
  const { user } = useAuth();

  const [inventory, setInventory] = useState<RetailerStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart
  const [cart, setCart] = useState<CartSaleItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');
  const [submittingSale, setSubmittingSale] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState<string | null>(null);
  const [receiptSale, setReceiptSale] = useState<any | null>(null);

  // Transfering reserve stock state
  const [transferringId, setTransferringId] = useState<string | null>(null);

  // 1. Listen to retailer inventory in real-time
  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, 'retailer_inventory'),
      where('retailerId', '==', user.id)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items: RetailerStockItem[] = snapshot.docs.map(d => {
        const data = d.data();
        const stockQty = data.stockQuantity || 0;
        const shelf = data.shelfStock !== undefined ? data.shelfStock : stockQty;
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
      console.error('Error fetching inventory for POS:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.id]);

  // Categories list for filter
  const categoryNames = Array.from(new Set(inventory.map(p => p.categoryName).filter(Boolean))) as string[];

  // Filter products active for counter sale
  const activeProducts = inventory.filter(item => {
    if (item.isActiveForSale === false) return false;
    const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.brandName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.categoryName === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart operations
  const addToCart = (product: RetailerStockItem) => {
    const currentShelf = product.shelfStock ?? product.stockQuantity;
    if (currentShelf <= 0) {
      alert('Ce produit n\'a pas de stock disponible en rayon.');
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= currentShelf) {
          alert(`Stock maximum disponible en rayon atteint (${currentShelf} cartons).`);
          return prev;
        }
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number, maxShelf: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > maxShelf) {
          alert(`Stock en rayon insuffisant (${maxShelf} max).`);
          return { ...item, quantity: maxShelf };
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as CartSaleItem[]);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const cartTotalRevenue = cart.reduce((sum, i) => sum + (i.product.retailSellPrice * i.quantity), 0);
  const cartTotalProfit = cart.reduce((sum, i) => {
    const itemsPerBox = i.product.itemsPerBox || 1;
    const unitBuy = i.product.purchasePrice / itemsPerBox;
    return sum + ((i.product.retailSellPrice - unitBuy) * i.quantity);
  }, 0);
  const totalCartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  // Transfer 1 Carton from Reserve to Shelf
  const handleQuickTransferFromReserve = async (item: RetailerStockItem, qtyToMove: number = 1) => {
    if (!item.id || (item.reserveStock || 0) < qtyToMove) return;
    setTransferringId(item.id);

    try {
      const currentShelf = item.shelfStock ?? item.stockQuantity;
      const currentReserve = item.reserveStock ?? 0;

      await updateDoc(doc(db, 'retailer_inventory', item.id), {
        shelfStock: currentShelf + qtyToMove,
        reserveStock: currentReserve - qtyToMove,
        lastUpdated: serverTimestamp()
      });
    } catch (err) {
      console.error('Error transferring reserve stock:', err);
      alert('Erreur lors du transfert de la réserve.');
    } finally {
      setTransferringId(null);
    }
  };

  // Submit Sale & Print Receipt
  const handleValidateSale = async () => {
    if (cart.length === 0 || !user?.id) return;
    setSubmittingSale(true);

    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randHex = Math.floor(Math.random() * 900 + 100);
      const saleNumber = `VENTE-${dateStr}-${randHex}`;

      const saleItems = cart.map(i => ({
        productId: i.product.productId || i.product.id,
        productName: i.product.productName,
        productImageUrl: i.product.productImageUrl || '',
        categoryName: i.product.categoryName || '',
        brandName: i.product.brandName || '',
        purchasePrice: i.product.purchasePrice,
        retailSellPrice: i.product.retailSellPrice,
        quantity: i.quantity,
        itemsPerBox: i.product.itemsPerBox || 1,
        totalRevenue: i.product.retailSellPrice * i.quantity,
        totalProfit: (i.product.retailSellPrice - ((i.product.purchasePrice || 1) / (i.product.itemsPerBox || 1))) * i.quantity
      }));

      // 1. Save sale record in retailer_sales
      const saleData = {
        retailerId: user.id,
        retailerName: user.name || 'Magasin',
        saleNumber,
        customerName: customerName.trim() || 'Client au comptoir',
        items: saleItems,
        totalRevenue: cartTotalRevenue,
        totalProfit: cartTotalProfit,
        paymentMethod,
        createdAt: serverTimestamp()
      };

      const saleRef = await addDoc(collection(db, 'retailer_sales'), saleData);

      // 2. Deduct shelf stock & total stock in retailer_inventory
      for (const item of cart) {
        const currentShelf = item.product.shelfStock ?? item.product.stockQuantity;
        const currentTotal = item.product.stockQuantity || 0;
        const itemsPerBox = item.product.itemsPerBox || 1;

        // Deduct sold pieces converted to carton fraction
        const qtyInCartons = item.quantity / itemsPerBox;
        const newShelf = Math.max(0, currentShelf - qtyInCartons);
        const newTotal = Math.max(0, currentTotal - qtyInCartons);

        await updateDoc(doc(db, 'retailer_inventory', item.product.id), {
          shelfStock: newShelf,
          stockQuantity: newTotal,
          lastUpdated: serverTimestamp()
        });
      }

      setReceiptSale({
        id: saleRef.id,
        ...saleData,
        dateFormatted: now.toLocaleString('fr-FR')
      });

      setCart([]);
      setCustomerName('');
      setSaleSuccess('Vente enregistrée avec succès !');
      setTimeout(() => setSaleSuccess(null), 5000);
    } catch (err) {
      console.error('Error recording sale:', err);
      alert('Erreur lors de l\'enregistrement de la vente.');
    } finally {
      setSubmittingSale(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Main POS Section */}
      <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Store size={22} style={{ color: 'var(--accent)' }} /> Vente au Comptoir (Caisse & Rayons)
            </h2>
            <p className="page-subtitle">Vendez directement aux clients finaux à partir des produits exposés en rayon</p>
          </div>

          {saleSuccess && (
            <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} /> {saleSuccess}
            </div>
          )}
        </div>

        {/* Toolbar: Search & Categories */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher un produit à vendre..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px 12px 42px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', outline: 'none', fontSize: 13
              }}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{
              padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
              fontSize: 13, cursor: 'pointer', minWidth: 170
            }}
          >
            <option value="all">Toutes les catégories</option>
            {categoryNames.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            Chargement des produits du magasin...
          </div>
        ) : activeProducts.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Package size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Aucun produit actif pour la vente au comptoir</div>
            <p style={{ fontSize: 12, marginTop: 4 }}>
              Activez des produits ou transférez du stock en rayon depuis la page <strong>Mon Entrepôt / Stocks</strong>.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {activeProducts.map(product => {
              const shelf = product.shelfStock ?? product.stockQuantity;
              const reserve = product.reserveStock ?? 0;
              const isShelfEmpty = shelf <= 0;
              const isReserveAvailable = reserve > 0;

              return (
                <div
                  key={product.id}
                  className="card"
                  style={{
                    padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12,
                    border: '1px solid var(--border)', transition: 'all 0.2s',
                    opacity: isShelfEmpty ? 0.7 : 1
                  }}
                >
                  <div>
                    {/* Image */}
                    <div style={{
                      width: '100%', height: 120, borderRadius: 8, background: 'var(--bg-primary)',
                      overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {product.productImageUrl ? (
                        <img src={product.productImageUrl} alt={product.productName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <Package size={36} style={{ opacity: 0.3 }} />
                      )}
                    </div>

                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 2 }}>
                      {product.categoryName || 'Général'} {product.brandName ? `• ${product.brandName}` : ''}
                    </div>

                    <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                      {product.productName}
                    </h4>

                    {/* Stock Badges */}
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {!isShelfEmpty ? (
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          🏪 Rayon : <strong>{shelf} carton(s) ({Math.round(shelf * (product.itemsPerBox || 1))} pcs)</strong>
                        </div>
                      ) : isReserveAvailable ? (
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          ⚠️ Rupture Rayon (Réserve : {reserve} cartons / {Math.round(reserve * (product.itemsPerBox || 1))} pcs)
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          🔴 Rupture Totale en Boutique
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent)', marginBottom: 8 }}>
                      {product.retailSellPrice.toLocaleString('fr-DZ')} DA / pièce
                    </div>

                    {isShelfEmpty && isReserveAvailable ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={transferringId === product.id}
                        onClick={() => handleQuickTransferFromReserve(product, 1)}
                        style={{
                          width: '100%', padding: '7px 10px', fontSize: 11, fontWeight: 700,
                          color: 'var(--warning)', border: '1px solid var(--warning)', background: 'rgba(245, 158, 11, 0.1)',
                          justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <RefreshCw size={12} /> Transférer +1 du stock réserve
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        disabled={isShelfEmpty}
                        onClick={() => addToCart(product)}
                        style={{ width: '100%', padding: '8px 12px', fontSize: 12, justifyContent: 'center' }}
                      >
                        <Plus size={14} /> Ajouter à la Caisse
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      <div style={{
        width: 380, flexShrink: 0, borderLeft: '1px solid var(--border)',
        background: 'var(--bg-card)', padding: 20, display: 'flex',
        flexDirection: 'column', justifyContent: 'space-between'
      }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingBag size={18} style={{ color: 'var(--accent)' }} /> Ticket Caisse & Panier Client ({totalCartCount})
          </h3>

          {/* Cart Items */}
          <div style={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
            {cart.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                Panier de caisse vide. Cliquez sur un produit à gauche pour l'ajouter.
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} style={{ padding: 10, borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product.productName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                      {item.product.retailSellPrice.toLocaleString('fr-DZ')} DA × {item.quantity} = {(item.product.retailSellPrice * item.quantity).toLocaleString('fr-DZ')} DA
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, -1, item.product.shelfStock || item.product.stockQuantity)}
                      style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Minus size={11} />
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 700, width: 20, textAlign: 'center' }}>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, 1, item.product.shelfStock || item.product.stockQuantity)}
                      style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 2 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer & Checkout */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Nom / Référence Client (Optionnel)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Client passage"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              style={{ padding: '8px 12px', fontSize: 12 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Mode de Paiement</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                style={{
                  padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: paymentMethod === 'cash' ? 'var(--accent)' : 'var(--bg-primary)',
                  color: paymentMethod === 'cash' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                💵 Espèces
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('wallet')}
                style={{
                  padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: paymentMethod === 'wallet' ? 'var(--accent)' : 'var(--bg-primary)',
                  color: paymentMethod === 'wallet' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                💳 Portefeuille
              </button>
            </div>
          </div>

          {/* Total & Profit Breakdown */}
          <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Vente :</span>
              <strong style={{ fontSize: 16, color: 'var(--accent)' }}>{cartTotalRevenue.toLocaleString('fr-DZ')} DA</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Bénéfice Net Estimé :</span>
              <strong style={{ color: 'var(--success)' }}>+{cartTotalProfit.toLocaleString('fr-DZ')} DA</strong>
            </div>
          </div>

          <button
            className="btn btn-primary"
            disabled={cart.length === 0 || submittingSale}
            onClick={handleValidateSale}
            style={{ width: '100%', padding: 12, fontSize: 13, fontWeight: 800, justifyContent: 'center' }}
          >
            {submittingSale ? 'Validation...' : 'Valider la Vente au Comptoir'}
          </button>
        </div>
      </div>

      {/* PRINT RECEIPT MODAL */}
      {receiptSale && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="card page-enter" style={{ width: 440, padding: 28, background: '#fff', color: '#1e293b' }}>
            <div style={{ textAlign: 'center', marginBottom: 16, borderBottom: '2px dashed #cbd5e1', paddingBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{user?.name || 'Vente Boutique'}</h3>
              <p style={{ fontSize: 11, color: '#64748b' }}>Reçu de Vente au Comptoir • {receiptSale.saleNumber}</p>
              <p style={{ fontSize: 11, color: '#64748b' }}>Date : {receiptSale.dateFormatted}</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#475569' }}>Articles :</div>
              {receiptSale.items?.map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span>{item.productName} × {item.quantity}</span>
                  <strong>{item.totalRevenue?.toLocaleString('fr-DZ')} DA</strong>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 900 }}>
                <span>Total Payé :</span>
                <strong style={{ color: '#2563eb' }}>{receiptSale.totalRevenue?.toLocaleString('fr-DZ')} DA</strong>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Mode de règlement : <strong>{receiptSale.paymentMethod === 'cash' ? 'Espèces' : 'Portefeuille Numérique'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setReceiptSale(null)}
                className="btn btn-ghost"
                style={{ flex: 1, padding: 10, color: '#64748b', border: '1px solid #cbd5e1' }}
              >
                Fermer
              </button>
              <button
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ flex: 1, padding: 10, background: '#2563eb', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Printer size={16} /> Imprimer Reçu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
