import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingCart, Search, Plus, Minus, Trash2, Printer,
  CheckCircle2, Package, Clock, User, Phone, Receipt,
  X, Tag, History
} from 'lucide-react';
import {
  collection, query, where, onSnapshot, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DistributorProduct, deductDistributorStockByPriority } from './CatalogPage';

export interface CartItem {
  product: DistributorProduct;
  quantity: number;
}

export interface DistributorOrder {
  id?: string;
  distributorId: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  items: {
    productId: string;
    productName: string;
    productImageUrl?: string;
    buyPrice: number;
    sellPrice: number;
    quantity: number;
    itemsPerBox?: number;
    total: number;
  }[];
  subtotal: number;
  totalAmount: number;
  totalProfit: number;
  paymentMethod: 'cash' | 'check' | 'transfer' | 'wallet';
  status: 'completed' | 'cancelled';
  createdAt?: any;
}

export default function OrdersPage() {
  const { user } = useAuth();

  // Active tab: POS / Prise de commande VS Historique
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');

  // Firestore Inventory & Orders
  const [inventory, setInventory] = useState<DistributorProduct[]>([]);
  const [ordersHistory, setOrdersHistory] = useState<DistributorOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters on POS Catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check' | 'transfer' | 'wallet'>('cash');
  const [savingOrder, setSavingOrder] = useState(false);

  // Receipt / Printable Modal
  const [receiptOrder, setReceiptOrder] = useState<DistributorOrder | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // 1. Listen to distributor inventory in real-time
  useEffect(() => {
    if (!user?.id) return;
    const qInv = query(
      collection(db, 'distributor_products'),
      where('distributorId', '==', user.id)
    );

    const unsubInv = onSnapshot(qInv, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DistributorProduct));
      setInventory(items);
      setLoading(false);
    }, err => {
      console.error('Error fetching inventory:', err);
      setLoading(false);
    });

    return () => unsubInv();
  }, [user?.id]);

  // 2. Listen to distributor order history in real-time
  useEffect(() => {
    if (!user?.id) return;
    const qOrd = query(
      collection(db, 'distributor_orders'),
      where('distributorId', '==', user.id)
    );

    const unsubOrd = onSnapshot(qOrd, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DistributorOrder));
      // Sort newest first
      items.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setOrdersHistory(items);
    }, err => {
      console.error('Error fetching orders history:', err);
    });

    return () => unsubOrd();
  }, [user?.id]);

  // Cart operations
  const addToCart = (product: DistributorProduct, totalAvailableStock: number) => {
    if (totalAvailableStock <= 0) {
      alert('Ce produit est actuellement en rupture de stock.');
      return;
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.product.productName === product.productName);
      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].quantity;
        if (currentQty >= totalAvailableStock) {
          alert(`Stock maximum disponible atteint (${totalAvailableStock} pcs).`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: currentQty + 1 };
        return updated;
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (productId: string, newQty: number, totalAvailableStock: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.product.id === productId || item.product.productName === productId) {
        if (newQty > totalAvailableStock) {
          alert(`Stock maximum disponible : ${totalAvailableStock} pcs.`);
          return { ...item, quantity: totalAvailableStock };
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
  };

  // Cart Totals
  const totalAmount = cart.reduce((acc, item) => acc + (item.product.sellPrice * item.quantity), 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Validate Sale & Deduct Stock
  const handleValidateOrder = async () => {
    if (!user?.id) return;
    if (cart.length === 0) {
      alert('Votre panier est vide.');
      return;
    }

    setSavingOrder(true);
    try {
      // Generate order number
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randHex = Math.floor(Math.random() * 900 + 100);
      const orderNumber = `CMD-${dateStr}-${randHex}`;

      let totalProfit = 0;
      const orderItems = cart.map(item => {
        const itemTotal = item.product.sellPrice * item.quantity;
        const profit = (item.product.sellPrice - item.product.buyPrice) * item.quantity;
        totalProfit += profit;

        return {
          productId: item.product.id || '',
          productName: item.product.productName,
          productImageUrl: item.product.productImageUrl || '',
          buyPrice: item.product.buyPrice,
          sellPrice: item.product.sellPrice,
          quantity: item.quantity,
          itemsPerBox: item.product.itemsPerBox || 1,
          total: itemTotal
        };
      });

      const orderData: Omit<DistributorOrder, 'id'> = {
        distributorId: user.id,
        orderNumber,
        customerName: customerName.trim() || 'Client de passage',
        customerPhone: customerPhone.trim() || '',
        items: orderItems,
        subtotal: totalAmount,
        totalAmount,
        totalProfit,
        paymentMethod,
        status: 'completed',
        createdAt: serverTimestamp()
      };

      // 1. Save order in Firestore
      const docRef = await addDoc(collection(db, 'distributor_orders'), orderData);

      // 2. Deduct inventory stock across batches by priority (FEFO)
      for (const item of cart) {
        await deductDistributorStockByPriority(user.id, item.product.productName, item.quantity);
      }

      // 3. Set order receipt for print modal
      const completedOrder: DistributorOrder = {
        id: docRef.id,
        ...orderData,
        createdAt: { seconds: Math.floor(now.getTime() / 1000) }
      };

      setReceiptOrder(completedOrder);
      clearCart();
    } catch (err) {
      console.error('Error saving order:', err);
      alert('Erreur lors de la validation de la commande.');
    } finally {
      setSavingOrder(false);
    }
  };

  // Print Action
  const handlePrintReceipt = () => {
    window.print();
  };

  // Unique categories for filter
  const categoryNames = Array.from(new Set(inventory.map(p => p.categoryName).filter(Boolean)));

  // Grouped inventory products by productName for single-card display
  interface GroupedPOSProduct {
    productName: string;
    productImageUrl?: string;
    categoryName?: string;
    brandName?: string;
    itemsPerBox?: number;
    totalStock: number;
    activeBatch: DistributorProduct;
    batches: DistributorProduct[];
  }

  const groupedPOSMap = new Map<string, GroupedPOSProduct>();

  inventory.forEach(p => {
    const matchesSearch =
      p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brandName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.categoryName === selectedCategory;
    if (!matchesSearch || !matchesCategory) return;

    if (!groupedPOSMap.has(p.productName)) {
      groupedPOSMap.set(p.productName, {
        productName: p.productName,
        productImageUrl: p.productImageUrl,
        categoryName: p.categoryName,
        brandName: p.brandName,
        itemsPerBox: p.itemsPerBox,
        totalStock: p.isBlocked ? 0 : p.stockQuantity,
        activeBatch: p,
        batches: [p]
      });
    } else {
      const existing = groupedPOSMap.get(p.productName)!;
      if (!p.isBlocked) {
        existing.totalStock += p.stockQuantity;
      }
      existing.batches.push(p);
    }
  });

  groupedPOSMap.forEach(group => {
    group.batches.sort((a, b) => {
      const prioA = a.priority ?? 999;
      const prioB = b.priority ?? 999;
      if (prioA !== prioB) return prioA - prioB;
      const expA = a.expiryDate || '9999-12-31';
      const expB = b.expiryDate || '9999-12-31';
      return expA.localeCompare(expB);
    });

    const firstInStock = group.batches.find(b => b.stockQuantity > 0 && !b.isBlocked);
    if (firstInStock) {
      group.activeBatch = firstInStock;
    } else {
      group.activeBatch = group.batches[0];
    }
  });

  const groupedCatalog = Array.from(groupedPOSMap.values());

  return (
    <div className="page-enter" style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
      
      {/* Header & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexShrink: 0 }}>
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingCart size={22} style={{ color: 'var(--accent)' }} /> Prise de Commande & Ventes
          </h2>
          <p className="page-subtitle">Caisse POS entrepôt, encaissement direct et impression de tickets</p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('pos')}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
              background: activeTab === 'pos' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'pos' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <ShoppingCart size={15} /> Nouvelle Vente
          </button>

          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
              background: activeTab === 'history' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'history' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <History size={15} /> Historique ({ordersHistory.length})
          </button>
        </div>
      </div>

      {/* POS VIEW */}
      {activeTab === 'pos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, flex: 1, minHeight: 0 }}>
          
          {/* LEFT: PRODUCTS CATALOG */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou marque..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px 10px 40px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg-card)',
                    color: 'var(--text-primary)', fontSize: 13, outline: 'none'
                  }}
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13,
                  outline: 'none', cursor: 'pointer', minWidth: 160
                }}
              >
                <option value="all">Toutes catégories</option>
                {categoryNames.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Catalog Grid */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement des produits...</div>
              ) : groupedCatalog.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Aucun produit disponible en stock.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
                  {groupedCatalog.map(group => {
                    const activeItem = group.activeBatch;
                    const isOutOfStock = group.totalStock <= 0;
                    const cartItem = cart.find(ci => ci.product.productName === group.productName);
                    const qtyInCart = cartItem ? cartItem.quantity : 0;

                    return (
                      <div
                        key={group.productName}
                        className="card"
                        style={{
                          padding: 14, borderRadius: 12, background: 'var(--bg-card)',
                          border: `1px solid ${qtyInCart > 0 ? 'var(--accent)' : 'var(--border)'}`,
                          display: 'flex', flexDirection: 'column', gap: 10,
                          opacity: isOutOfStock ? 0.55 : 1, transition: 'all 0.15s',
                          position: 'relative'
                        }}
                      >
                        {qtyInCart > 0 && (
                          <div style={{
                            position: 'absolute', top: 8, right: 8, width: 22, height: 22,
                            borderRadius: '50%', background: 'var(--accent)', color: '#fff',
                            fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {qtyInCart}
                          </div>
                        )}

                        <div style={{
                          width: '100%', height: 100, borderRadius: 8,
                          background: group.productImageUrl ? `url(${group.productImageUrl}) center/cover no-repeat` : 'var(--bg-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)'
                        }}>
                          {!group.productImageUrl && <Package size={24} style={{ color: 'var(--text-muted)' }} />}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, height: 32, overflow: 'hidden' }}>
                            {group.productName}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Tag size={10} /> {group.categoryName || 'Général'} {group.brandName ? `• ${group.brandName}` : ''}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>
                              {activeItem.sellPrice.toLocaleString('fr-DZ')} DA
                            </div>
                            <div style={{ fontSize: 10, color: isOutOfStock ? 'var(--danger)' : 'var(--text-secondary)' }}>
                              Stock: {group.totalStock} pcs {group.batches.length > 1 ? `(${group.batches.length} lots)` : ''}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => addToCart(activeItem, group.totalStock)}
                            style={{
                              padding: '6px 12px', borderRadius: 8, border: 'none',
                              background: isOutOfStock ? 'var(--bg-primary)' : 'var(--accent-glow)',
                              color: isOutOfStock ? 'var(--text-muted)' : 'var(--accent)',
                              fontWeight: 700, fontSize: 12, cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4
                            }}
                          >
                            <Plus size={14} /> Ajout
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: CART & CHECKOUT */}
          <div className="card" style={{ padding: 18, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingCart size={17} style={{ color: 'var(--accent)' }} /> Panier en cours
              </h3>
              {cart.length > 0 && (
                <button onClick={clearCart} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Trash2 size={12} /> Vider
                </button>
              )}
            </div>

            {/* Customer Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label className="form-label" style={{ fontSize: 11, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <User size={11} /> Nom du Client / Magasin
                </label>
                <input
                  className="form-input"
                  placeholder="Ex: Épicerie El Baraka"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12 }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 11, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={11} /> Téléphone Client (Optionnel)
                </label>
                <input
                  className="form-input"
                  placeholder="Ex: 0661 22 33 44"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12 }}
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
              {cart.length === 0 ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  Panier vide. Cliquez sur un produit à gauche pour l'ajouter.
                </div>
              ) : cart.map(item => (
                <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product.productName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                      {item.product.sellPrice.toLocaleString('fr-DZ')} DA × {item.quantity} = {(item.product.sellPrice * item.quantity).toLocaleString('fr-DZ')} DA
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  {(() => {
                    const itemTotalStock = inventory.filter(p => p.productName === item.product.productName && !p.isBlocked).reduce((sum, p) => sum + (p.stockQuantity || 0), 0);
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id!, item.quantity - 1, itemTotalStock)}
                          style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Minus size={11} />
                        </button>
                        <span style={{ fontSize: 12, fontWeight: 700, width: 22, textAlign: 'center' }}>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id!, item.quantity + 1, itemTotalStock)}
                          style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id!)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}
                    title="Retirer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Payment Method */}
            <div>
              <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Mode de Paiement</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer' }}
              >
                <option value="cash">💵 Espèces / Comptant</option>
                <option value="wallet">💳 Portefeuille Numérique (Digital Wallet)</option>
                <option value="transfer">🏦 Virement Bancaire</option>
                <option value="check">📜 Chèque</option>
              </select>
            </div>

            {/* Summary & Checkout Button */}
            <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                <span>Articles ({totalItemsCount})</span>
                <span>{totalAmount.toLocaleString('fr-DZ')} DA</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                <span>TOTAL À PAYER</span>
                <span style={{ color: 'var(--accent)' }}>{totalAmount.toLocaleString('fr-DZ')} DA</span>
              </div>

              <button
                type="button"
                disabled={cart.length === 0 || savingOrder}
                onClick={handleValidateOrder}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                  background: cart.length === 0 ? 'var(--bg-primary)' : 'linear-gradient(135deg, var(--accent), #7c3aed)',
                  color: cart.length === 0 ? 'var(--text-muted)' : '#fff',
                  fontWeight: 700, fontSize: 14, cursor: cart.length === 0 || savingOrder ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: cart.length > 0 ? '0 4px 12px rgba(79, 124, 255, 0.3)' : 'none'
                }}
              >
                <CheckCircle2 size={18} />
                {savingOrder ? 'Enregistrement...' : 'Valider la Vente'}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* HISTORY VIEW */}
      {activeTab === 'history' && (
        <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 14, border: '1px solid var(--border)' }}>
          {ordersHistory.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              Aucune vente enregistrée pour le moment.
            </div>
          ) : (
            <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12 }}>N° Commande</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12 }}>Client / Magasin</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12 }}>Articles</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12 }}>Paiement</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textAlign: 'right' }}>Total (DA)</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersHistory.map(ord => {
                    const dateStr = ord.createdAt?.seconds ? new Date(ord.createdAt.seconds * 1000).toLocaleString('fr-DZ') : 'Aujourd\'hui';
                    return (
                      <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>{ord.orderNumber}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Clock size={10} /> {dateStr}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{ord.customerName}</div>
                          {ord.customerPhone && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ord.customerPhone}</div>
                          )}
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text-secondary)' }}>
                          {ord.items.length} article(s) ({(ord.items || []).reduce((a, b) => a + b.quantity, 0)} pcs)
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontSize: 11, background: 'var(--bg-primary)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                            {ord.paymentMethod === 'cash' ? '💵 Espèces' : ord.paymentMethod === 'wallet' ? '💳 Portefeuille' : ord.paymentMethod === 'transfer' ? '🏦 Virement' : '📜 Chèque'}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)', fontSize: 14 }}>
                          {ord.totalAmount.toLocaleString('fr-DZ')} DA
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setReceiptOrder(ord)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)' }}
                          >
                            <Printer size={13} /> Imprimer Ticket
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RECEIPT / PRINTABLE MODAL */}
      {receiptOrder && (
        <div className="modal-overlay" onClick={() => setReceiptOrder(null)}>
          <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Receipt size={18} style={{ color: 'var(--accent)' }} /> Ticket de Caisse / Facture
              </div>
              <button className="icon-btn" onClick={() => setReceiptOrder(null)} style={{ border: 'none' }}><X size={16} /></button>
            </div>

            {/* Receipt Printable Preview Container */}
            <div
              ref={printRef}
              id="printable-receipt"
              style={{
                background: '#fff', color: '#000', padding: 20, borderRadius: 8,
                fontFamily: 'Courier New, monospace', fontSize: 12, lineHeight: 1.4,
                border: '1px dashed #ccc', marginBottom: 20
              }}
            >
              {/* Receipt Header */}
              <div style={{ textAlign: 'center', marginBottom: 12, borderBottom: '1px dashed #000', paddingBottom: 10 }}>
                <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>
                  {user?.name || 'ENTREPÔT DISTRIBUPRO'}
                </h2>
                <div style={{ fontSize: 11, marginTop: 2 }}>Wilaya: {user?.sector}</div>
                {user?.rcNumber && <div style={{ fontSize: 10 }}>RC: {user.rcNumber}</div>}
                {user?.phone && <div style={{ fontSize: 10 }}>Tel: {user.phone}</div>}
                <div style={{ fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>TICKET DE CAISSE</div>
              </div>

              {/* Order Meta */}
              <div style={{ marginBottom: 10, fontSize: 11 }}>
                <div>N° Ticket : <strong>{receiptOrder.orderNumber}</strong></div>
                <div>Client : {receiptOrder.customerName}</div>
                <div>Date : {receiptOrder.createdAt?.seconds ? new Date(receiptOrder.createdAt.seconds * 1000).toLocaleString('fr-DZ') : new Date().toLocaleString('fr-DZ')}</div>
                <div>Paiement : {receiptOrder.paymentMethod.toUpperCase()}</div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                    <th style={{ textAlign: 'left', padding: '4px 0' }}>Article</th>
                    <th style={{ textAlign: 'center', padding: '4px 0' }}>Qté</th>
                    <th style={{ textAlign: 'right', padding: '4px 0' }}>Total DA</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptOrder.items.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px dotted #ccc' }}>
                      <td style={{ padding: '4px 0' }}>{item.productName}</td>
                      <td style={{ textAlign: 'center', padding: '4px 0' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '4px 0' }}>{item.total.toLocaleString('fr-DZ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Receipt Total */}
              <div style={{ borderTop: '1px double #000', paddingTop: 8, textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 900 }}>
                  TOTAL : {receiptOrder.totalAmount.toLocaleString('fr-DZ')} DA
                </div>
              </div>

              {/* Receipt Footer */}
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 10, borderTop: '1px dashed #000', paddingTop: 8 }}>
                *** Merci de votre confiance ! ***<br />
                Logiciel DistribuPro • Solution Entrepôt B2B
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setReceiptOrder(null)}>Fermer</button>
              <button
                className="btn btn-primary"
                onClick={handlePrintReceipt}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)' }}
              >
                <Printer size={15} /> Imprimer Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
