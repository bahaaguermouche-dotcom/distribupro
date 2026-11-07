import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search, ShoppingCart, MapPin, Phone, Package,
  ArrowRight, CheckCircle2, ChevronLeft,
  Building2, Box, Plus, Minus, Trash2
} from 'lucide-react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Distributor {
  id: string;
  name?: string;
  companyName?: string;
  sector: string;
  phone?: string;
  address?: string;
  status: string;
}

export interface DistributorProduct {
  id: string;
  distributorId: string;
  productId: string;
  productName: string;
  productImageUrl?: string;
  description?: string;
  categoryName?: string;
  brandName?: string;
  itemsPerBox?: number;
  sellPrice: number; // Price to retailer
  stockQuantity: number;
  manufacturingDate?: string;
  expiryDate?: string;
}

export interface CartItem {
  product: DistributorProduct;
  distributorName: string;
  distributorId: string;
  quantity: number;
}

export default function PurchasesPage() {
  const { user } = useAuth();

  // Mode: 'distributors' (Par Distributeur) vs 'products' (Par Produit)
  const [activeTab, setActiveTab] = useState<'distributors' | 'products'>('distributors');

  // Firestore Data
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [allProducts, setAllProducts] = useState<DistributorProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Distributor
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);

  // Filters
  const [distributorSearch, setDistributorSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductGroup, setSelectedProductGroup] = useState<string | null>(null);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');
  const [fulfillmentType] = useState<'pickup' | 'delivery'>('pickup');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // 1. Listen to distributors in retailer's sector
  useEffect(() => {
    const q = collection(db, 'distributors');
    const unsub = onSnapshot(q, (snapshot) => {
      const items: Distributor[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as Distributor));

      // Filter by sector if user sector is defined, and sort alphabetically
      const filtered = items.filter(d => {
        if (!user?.sector) return true;
        return d.sector === user.sector || d.sector?.split('-')[0]?.trim() === user.sector?.split('-')[0]?.trim();
      });

      filtered.sort((a, b) => {
        const nameA = (a.companyName || a.name || '').toLowerCase();
        const nameB = (b.companyName || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setDistributors(filtered);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching distributors:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.sector]);

  // 2. Listen to all active distributor products
  useEffect(() => {
    const q = query(
      collection(db, 'distributor_products'),
      where('stockQuantity', '>', 0)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const items: DistributorProduct[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as DistributorProduct));
      setAllProducts(items);
    }, (err) => {
      console.error('Error fetching products:', err);
    });

    return () => unsub();
  }, []);

  // Filtered Distributors List
  const filteredDistributors = distributors.filter(d => {
    const term = distributorSearch.toLowerCase();
    const name = (d.companyName || d.name || '').toLowerCase();
    const phone = (d.phone || '').toLowerCase();
    return name.includes(term) || phone.includes(term);
  });

  // Products of selected distributor grouped by productName
  interface GroupedMerchantProduct {
    productName: string;
    productImageUrl?: string;
    categoryName?: string;
    brandName?: string;
    itemsPerBox?: number;
    totalStock: number;
    activeBatch: DistributorProduct;
    batches: DistributorProduct[];
  }

  const rawSelectedDistProducts = allProducts.filter(p => p.distributorId === selectedDistributor?.id);
  const groupedMerchantMap = new Map<string, GroupedMerchantProduct>();

  rawSelectedDistProducts.forEach(p => {
    const isBlocked = (p as any).isBlocked;
    if (!groupedMerchantMap.has(p.productName)) {
      groupedMerchantMap.set(p.productName, {
        productName: p.productName,
        productImageUrl: p.productImageUrl,
        categoryName: p.categoryName,
        brandName: p.brandName,
        itemsPerBox: p.itemsPerBox,
        totalStock: isBlocked ? 0 : p.stockQuantity,
        activeBatch: p,
        batches: [p]
      });
    } else {
      const existing = groupedMerchantMap.get(p.productName)!;
      if (!isBlocked) {
        existing.totalStock += p.stockQuantity;
      }
      existing.batches.push(p);
    }
  });

  groupedMerchantMap.forEach(group => {
    group.batches.sort((a, b) => {
      const prioA = (a as any).priority ?? 999;
      const prioB = (b as any).priority ?? 999;
      if (prioA !== prioB) return prioA - prioB;
      const expA = a.expiryDate || '9999-12-31';
      const expB = b.expiryDate || '9999-12-31';
      return expA.localeCompare(expB);
    });
    const firstInStock = group.batches.find(b => b.stockQuantity > 0 && !(b as any).isBlocked);
    if (firstInStock) {
      group.activeBatch = firstInStock;
    } else {
      group.activeBatch = group.batches[0];
    }
  });

  const selectedDistributorProducts = Array.from(groupedMerchantMap.values());

  // Global unique products list for 'products' mode
  const uniqueProductsMap = new Map<string, { productName: string; imageUrl?: string; categoryName?: string; brandName?: string; count: number }>();
  allProducts.forEach(p => {
    if (!uniqueProductsMap.has(p.productName)) {
      // Count unique distributors offering this product
      uniqueProductsMap.set(p.productName, {
        productName: p.productName,
        imageUrl: p.productImageUrl,
        categoryName: p.categoryName,
        brandName: p.brandName,
        count: 1
      });
    }
  });

  // Calculate actual count of distinct distributors for each product
  uniqueProductsMap.forEach((val, pName) => {
    const distIds = new Set(allProducts.filter(p => p.productName === pName).map(p => p.distributorId));
    val.count = distIds.size;
  });

  const globalProductList = Array.from(uniqueProductsMap.values()).filter(p => {
    const term = productSearch.toLowerCase();
    return p.productName.toLowerCase().includes(term) ||
           (p.categoryName || '').toLowerCase().includes(term) ||
           (p.brandName || '').toLowerCase().includes(term);
  });

  // Distributors offering selected product grouped per distributor
  const rawDistForProd = selectedProductGroup
    ? allProducts.filter(p => p.productName === selectedProductGroup)
    : [];

  const groupedDistForProdMap = new Map<string, { distributorId: string; activeBatch: DistributorProduct; totalStock: number }>();
  rawDistForProd.forEach(p => {
    const isBlocked = (p as any).isBlocked;
    if (!groupedDistForProdMap.has(p.distributorId)) {
      groupedDistForProdMap.set(p.distributorId, {
        distributorId: p.distributorId,
        activeBatch: p,
        totalStock: isBlocked ? 0 : p.stockQuantity
      });
    } else {
      const existing = groupedDistForProdMap.get(p.distributorId)!;
      if (!isBlocked) {
        existing.totalStock += p.stockQuantity;
      }
      if ((existing.activeBatch.stockQuantity <= 0 || (existing.activeBatch as any).isBlocked) && p.stockQuantity > 0 && !isBlocked) {
        existing.activeBatch = p;
      }
    }
  });

  const distributorsForProductGrouped = Array.from(groupedDistForProdMap.values());

  // Cart operations
  const addToCart = (product: DistributorProduct, distName: string, totalAvailableStock: number) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item =>
        item.distributorId === product.distributorId &&
        item.product.productName === product.productName
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + 1;
        if (newQty <= totalAvailableStock) {
          updated[existingIndex].quantity = newQty;
        }
        return updated;
      } else {
        return [...prev, {
          product,
          distributorName: distName,
          distributorId: product.distributorId,
          quantity: 1
        }];
      }
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId || item.product.productName === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.sellPrice * item.quantity), 0);
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Submit Order & Auto-transfer to Retailer Inventory
  const handleFinalizeOrder = async () => {
    if (cart.length === 0) return;
    setSubmittingOrder(true);
    setOrderError(null);

    try {
      if (paymentMethod === 'wallet' && (user?.walletBalance || 0) < cartTotal) {
        setOrderError(`Solde portefeuille insuffisant. Solde actuel : ${(user?.walletBalance || 0).toLocaleString('fr-DZ')} DA.`);
        setSubmittingOrder(false);
        return;
      }

      // Group cart items by distributor
      const ordersByDistributor = new Map<string, CartItem[]>();
      cart.forEach(item => {
        const list = ordersByDistributor.get(item.distributorId) || [];
        list.push(item);
        ordersByDistributor.set(item.distributorId, list);
      });

      for (const [distId, items] of ordersByDistributor.entries()) {
        const distName = items[0].distributorName;
        const distTotal = items.reduce((sum, i) => sum + (i.product.sellPrice * i.quantity), 0);
        const orderNumber = `CMD-${Date.now().toString().slice(-6)}`;

        // 1. Create order doc in distributor_orders
        await addDoc(collection(db, 'distributor_orders'), {
          orderNumber,
          retailerId: user?.id || '',
          retailerName: user?.name || 'Boutique',
          retailerPhone: user?.phoneOrEmail || '',
          retailerSector: user?.sector || '',
          distributorId: distId,
          distributorName: distName,
          items: items.map(i => ({
            productId: i.product.productId || i.product.id,
            productName: i.product.productName,
            productImageUrl: i.product.productImageUrl || '',
            itemsPerBox: i.product.itemsPerBox || 1,
            purchasePrice: i.product.sellPrice, // Retailer buying price
            quantity: i.quantity,
            totalPrice: i.product.sellPrice * i.quantity,
            expiryDate: i.product.expiryDate || ''
          })),
          subtotal: distTotal,
          totalAmount: distTotal,
          fulfillmentType,
          paymentMethod,
          status: 'completed',
          createdAt: serverTimestamp()
        });

        // 2. Deduct distributor stock by priority (FEFO) & Transfer to retailer_inventory
        for (const item of items) {
          // Deduct distributor stock across batches (in-memory filtering, no composite index needed)
          const qBatches = query(
            collection(db, 'distributor_products'),
            where('distributorId', '==', distId),
            where('productName', '==', item.product.productName)
          );
          const snapBatches = await getDocs(qBatches);
          const batchList = snapBatches.docs
            .map(d => ({ id: d.id, ...d.data() } as any))
            .filter(b => (b.stockQuantity || 0) > 0);

          batchList.sort((a, b) => {
            const prioA = a.priority ?? 999;
            const prioB = b.priority ?? 999;
            if (prioA !== prioB) return prioA - prioB;
            const expA = a.expiryDate || '9999-12-31';
            const expB = b.expiryDate || '9999-12-31';
            return expA.localeCompare(expB);
          });

          let remainingToDeduct = item.quantity;
          for (const b of batchList) {
            if (remainingToDeduct <= 0) break;
            const currentStock = b.stockQuantity || 0;
            const qtyDeducted = Math.min(currentStock, remainingToDeduct);
            await updateDoc(doc(db, 'distributor_products', b.id), {
              stockQuantity: currentStock - qtyDeducted,
              lastUpdated: serverTimestamp()
            });
            remainingToDeduct -= qtyDeducted;
          }

          // Check if retailer already has this product in retailer_inventory
          const currentRetailerId = user?.id || '';
          if (currentRetailerId) {
            const invQuery = query(
              collection(db, 'retailer_inventory'),
              where('retailerId', '==', currentRetailerId),
              where('productName', '==', item.product.productName)
            );
            const invSnap = await getDocs(invQuery);

            if (!invSnap.empty) {
              // Update existing retailer stock
              const existingDoc = invSnap.docs[0];
              const currentQty = existingDoc.data().stockQuantity || 0;
              await updateDoc(doc(db, 'retailer_inventory', existingDoc.id), {
                stockQuantity: currentQty + item.quantity,
                purchasePrice: item.product.sellPrice || 0, // Update buying price
                lastUpdated: serverTimestamp()
              });
            } else {
              // Add new item to retailer_inventory
              await addDoc(collection(db, 'retailer_inventory'), {
                retailerId: currentRetailerId,
                distributorId: distId,
                distributorName: distName,
                productId: item.product.productId || item.product.id || '',
                productName: item.product.productName || '',
                productImageUrl: item.product.productImageUrl || '',
                description: item.product.description || '',
                categoryName: item.product.categoryName || '',
                brandName: item.product.brandName || '',
                itemsPerBox: item.product.itemsPerBox || 1,
                purchasePrice: item.product.sellPrice || 0, // Retailer buying price
                retailSellPrice: Math.ceil(((item.product.sellPrice || 0) / (item.product.itemsPerBox || 1)) * 1.25), // Recommended default retail price PER PIECE (+25% margin)
                stockQuantity: item.quantity,
                manufacturingDate: item.product.manufacturingDate || '',
                expiryDate: item.product.expiryDate || '',
                lastUpdated: serverTimestamp()
              });
            }
          }
        }
      }

      // Deduct wallet balance if wallet payment
      if (paymentMethod === 'wallet' && user?.id) {
        const newBalance = (user.walletBalance || 0) - cartTotal;
        await updateDoc(doc(db, 'retailers', user.id), {
          walletBalance: newBalance
        });
      }

      setCart([]);
      setIsCartOpen(false);
      setOrderSuccess('Commande validée avec succès ! Les articles ont été automatiquement ajoutés à votre entrepôt.');
      setTimeout(() => setOrderSuccess(null), 6000);
    } catch (err: any) {
      console.error('Error completing order:', err);
      setOrderError(err?.message ? `Erreur : ${err.message}` : 'Erreur lors de la validation de la commande. Veuillez réessayer.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="page-enter" style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingCart size={24} style={{ color: 'var(--accent)' }} /> Catalogue & Prise de Commande
          </h2>
          <p className="page-subtitle">
            Achetez directement auprès des distributeurs agréés de votre région (<strong style={{ color: 'var(--accent)' }}>{user?.sector}</strong>)
          </p>
        </div>

        {/* Floating Cart Button */}
        <button
          onClick={() => setIsCartOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
            borderRadius: 10, background: 'var(--accent)', color: '#fff', border: 'none',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', position: 'relative',
            boxShadow: '0 8px 16px -4px rgba(79, 124, 255, 0.4)'
          }}
        >
          <ShoppingCart size={18} />
          <span>Mon Panier</span>
          {totalCartCount > 0 && (
            <span style={{
              background: '#ef4444', color: '#fff', borderRadius: '50%',
              width: 22, height: 22, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, fontWeight: 900
            }}>
              {totalCartCount}
            </span>
          )}
          <span style={{ marginLeft: 6, opacity: 0.9 }}>{cartTotal.toLocaleString('fr-DZ')} DA</span>
        </button>
      </div>

      {orderSuccess && (
        <div style={{
          padding: 16, borderRadius: 12, background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--success)',
          fontWeight: 600, fontSize: 14, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10
        }}>
          <CheckCircle2 size={20} /> {orderSuccess}
        </div>
      )}

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => { setActiveTab('distributors'); setSelectedDistributor(null); setSelectedProductGroup(null); }}
          style={{
            flex: 1, padding: '14px 20px', borderRadius: 12, border: '1px solid var(--border)',
            background: activeTab === 'distributors' ? 'var(--accent)' : 'var(--bg-card)',
            color: activeTab === 'distributors' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s'
          }}
        >
          <Building2 size={18} /> Par Distributeurs Régionaux ({filteredDistributors.length})
        </button>

        <button
          onClick={() => { setActiveTab('products'); setSelectedDistributor(null); setSelectedProductGroup(null); }}
          style={{
            flex: 1, padding: '14px 20px', borderRadius: 12, border: '1px solid var(--border)',
            background: activeTab === 'products' ? 'var(--accent)' : 'var(--bg-card)',
            color: activeTab === 'products' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s'
          }}
        >
          <Search size={18} /> Recherche Directe par Produit ({globalProductList.length})
        </button>
      </div>

      {/* MODE 1: PAR DISTRIBUTEURS */}
      {activeTab === 'distributors' && (
        <>
          {!selectedDistributor ? (
            <div>
              {/* Search Bar */}
              <div className="search-bar" style={{ marginBottom: 20 }}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Rechercher un distributeur par nom ou téléphone..."
                  value={distributorSearch}
                  onChange={e => setDistributorSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Chargement des distributeurs de la région...
                </div>
              ) : filteredDistributors.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Building2 size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <div>Aucun distributeur trouvé pour le secteur <strong>{user?.sector}</strong>.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                  {filteredDistributors.map(dist => (
                    <div
                      key={dist.id}
                      className="card"
                      onClick={() => setSelectedDistributor(dist)}
                      style={{
                        padding: 24, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                        justifyContent: 'space-between', gap: 16, border: '1px solid var(--border)',
                        transition: 'all 0.2s', position: 'relative'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{
                            width: 42, height: 42, borderRadius: 10, background: 'var(--accent-glow)',
                            color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <Building2 size={22} />
                          </div>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                            background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)'
                          }}>
                            Agréé {dist.sector}
                          </span>
                        </div>

                        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                          {dist.companyName || dist.name || 'Distributeur'}
                        </h3>

                        {dist.address && (
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MapPin size={13} style={{ flexShrink: 0, color: 'var(--accent)' }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dist.address}</span>
                          </div>
                        )}

                        {dist.phone && (
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Phone size={13} style={{ flexShrink: 0 }} /> {dist.phone}
                          </div>
                        )}
                      </div>

                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--accent)'
                      }}>
                        <span>Voir le catalogue</span>
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Selected Distributor Catalogue View */
            <div>
              <button
                onClick={() => setSelectedDistributor(null)}
                className="btn btn-ghost"
                style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <ChevronLeft size={16} /> Retour à la liste des distributeurs
              </button>

              <div className="card" style={{ padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, background: 'var(--accent-glow)',
                    color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {selectedDistributor.companyName || selectedDistributor.name}
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
                      <span><MapPin size={12} style={{ display: 'inline', verticalAlign: -1 }} /> {selectedDistributor.sector}</span>
                      {selectedDistributor.phone && <span><Phone size={12} style={{ display: 'inline', verticalAlign: -1 }} /> {selectedDistributor.phone}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {selectedDistributorProducts.length} produit(s) en stock
                </div>
              </div>

              {/* Products Grid */}
              {selectedDistributorProducts.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Ce distributeur n'a pas d'articles disponibles actuellement.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                  {selectedDistributorProducts.map(group => {
                    const prod = group.activeBatch;
                    const isOutOfStock = group.totalStock <= 0;

                    return (
                      <div key={group.productName} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16, opacity: isOutOfStock ? 0.55 : 1 }}>
                        <div>
                          <div style={{
                            width: '100%', height: 140, borderRadius: 10, background: 'var(--bg-primary)',
                            overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 14,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {group.productImageUrl ? (
                              <img src={group.productImageUrl} alt={group.productName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                              <Package size={40} style={{ opacity: 0.3 }} />
                            )}
                          </div>

                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 2 }}>
                            {group.categoryName || 'Général'} {group.brandName ? `• ${group.brandName}` : ''}
                          </div>

                          <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {group.productName}
                          </h4>

                          {group.itemsPerBox && (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Box size={12} /> {group.itemsPerBox} pièces par carton
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent)' }}>
                              {prod.sellPrice.toLocaleString('fr-DZ')} DA
                            </div>
                            {group.itemsPerBox && group.itemsPerBox > 1 && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                {(prod.sellPrice / group.itemsPerBox).toFixed(2)} DA / pièce
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: isOutOfStock ? 'var(--danger)' : 'var(--text-muted)' }}>
                              Stock : {group.totalStock} cartons {group.batches.length > 1 ? `(${group.batches.length} lots)` : ''}
                            </div>
                          </div>

                          <button
                            className="btn btn-primary"
                            disabled={isOutOfStock}
                            onClick={() => addToCart(prod, selectedDistributor.companyName || selectedDistributor.name || 'Distributeur', group.totalStock)}
                            style={{ padding: '8px 14px', fontSize: 13 }}
                          >
                            <Plus size={14} /> Ajouter
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODE 2: RECHERCHE PAR PRODUIT */}
      {activeTab === 'products' && (
        <div>
          {!selectedProductGroup ? (
            <div>
              <div className="search-bar" style={{ marginBottom: 20 }}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Rechercher un produit par nom, catégorie ou marque..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
              </div>

              {globalProductList.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Package size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <div>Aucun produit correspondant trouvé dans votre région.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                  {globalProductList.map(prod => (
                    <div
                      key={prod.productName}
                      className="card"
                      onClick={() => setSelectedProductGroup(prod.productName)}
                      style={{
                        padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                        justifyContent: 'space-between', gap: 14, border: '1px solid var(--border)'
                      }}
                    >
                      <div>
                        <div style={{
                          width: '100%', height: 130, borderRadius: 10, background: 'var(--bg-primary)',
                          overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 12,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.productName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <Package size={36} style={{ opacity: 0.3 }} />
                          )}
                        </div>

                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                          {prod.categoryName || 'Général'} {prod.brandName ? `• ${prod.brandName}` : ''}
                        </div>

                        <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                          {prod.productName}
                        </h4>
                      </div>

                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--accent)'
                      }}>
                        <span>Proposé par {prod.count} distributeur(s)</span>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Distributors selling selected product */
            <div>
              <button
                onClick={() => setSelectedProductGroup(null)}
                className="btn btn-ghost"
                style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <ChevronLeft size={16} /> Retour à la recherche de produits
              </button>

              <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Distributeurs proposant : <span style={{ color: 'var(--accent)' }}>{selectedProductGroup}</span>
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                {distributorsForProductGrouped.map(item => {
                  const dist = distributors.find(d => d.id === item.distributorId);
                  const distName = dist?.companyName || dist?.name || 'Distributeur Régional';
                  const prod = item.activeBatch;
                  const isOutOfStock = item.totalStock <= 0;

                  return (
                    <div key={item.distributorId} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16, opacity: isOutOfStock ? 0.55 : 1 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: 10, background: 'var(--accent-glow)',
                            color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <Building2 size={20} />
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{distName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Secteur : {dist?.sector || user?.sector}</div>
                          </div>
                        </div>

                        <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent)', marginBottom: 8 }}>
                          {prod.sellPrice.toLocaleString('fr-DZ')} DA <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>/ carton</span>
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div>Stock disponible : <strong>{item.totalStock} cartons</strong></div>
                          {prod.itemsPerBox && <div>Conditionnement : <strong>{prod.itemsPerBox} pièces / carton</strong></div>}
                        </div>
                      </div>

                      <button
                        className="btn btn-primary"
                        disabled={isOutOfStock}
                        onClick={() => addToCart(prod, distName, item.totalStock)}
                        style={{ width: '100%', padding: 12, justifyContent: 'center' }}
                      >
                        <Plus size={16} /> Ajouter au Panier
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CART MODAL SIDEBAR */}
      {isCartOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            width: 480, maxWidth: '100%', height: '100%', background: 'var(--bg-card)',
            borderLeft: '1px solid var(--border)', padding: 28, display: 'flex',
            flexDirection: 'column', justifyContent: 'space-between', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShoppingCart size={20} style={{ color: 'var(--accent)' }} /> Mon Panier d'Achat
                </h3>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="btn btn-ghost" style={{ padding: 6 }}
                >
                  ✕
                </button>
              </div>

              {orderError && (
                <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', fontSize: 12, marginBottom: 16 }}>
                  ⚠️ {orderError}
                </div>
              )}

              {cart.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Votre panier est vide pour le moment.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 'calc(100vh - 360px)', overflowY: 'auto', paddingRight: 4 }}>
                  {cart.map(item => (
                    <div key={item.product.id} style={{ padding: 14, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{item.product.productName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fournisseur : {item.distributorName}</div>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>
                          {(item.product.sellPrice * item.quantity).toLocaleString('fr-DZ')} DA
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                          <button onClick={() => updateCartQuantity(item.product.id, -1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><Minus size={12} /></button>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{item.quantity}</span>
                          <button onClick={() => updateCartQuantity(item.product.id, 1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><Plus size={12} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                {/* Fulfillment option */}
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>Mode de Retrait</label>
                  <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--accent)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />
                    <span>Retrait chez le distributeur (Sur place)</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    ℹ️ La livraison automatique sera bientôt activée avec l'application livreur.
                  </div>
                </div>

                {/* Payment Option */}
                <div style={{ marginBottom: 20 }}>
                  <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>Mode de Paiement</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      style={{
                        flex: 1, padding: 10, borderRadius: 8, border: '1px solid var(--border)',
                        background: paymentMethod === 'cash' ? 'var(--accent-glow)' : 'var(--bg-primary)',
                        color: paymentMethod === 'cash' ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: 700, fontSize: 12, cursor: 'pointer'
                      }}
                    >
                      💵 Espèces au retrait
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('wallet')}
                      style={{
                        flex: 1, padding: 10, borderRadius: 8, border: '1px solid var(--border)',
                        background: paymentMethod === 'wallet' ? 'var(--accent-glow)' : 'var(--bg-primary)',
                        color: paymentMethod === 'wallet' ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: 700, fontSize: 12, cursor: 'pointer'
                      }}
                    >
                      💳 Portefeuille ({user?.walletBalance || 0} DA)
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Total de la Commande :</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent)' }}>{cartTotal.toLocaleString('fr-DZ')} DA</span>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleFinalizeOrder}
                  disabled={submittingOrder}
                  style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 800, justifyContent: 'center' }}
                >
                  {submittingOrder ? 'Validation en cours...' : 'Valider la Commande'} <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
