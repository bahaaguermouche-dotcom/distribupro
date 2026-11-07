import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search, Plus, Edit2, Trash2, Package, Tag, Award,
  Calendar, ChevronLeft, Box, X, AlertTriangle, CheckCircle2, ArrowRight,
  ChevronDown, ChevronRight, ArrowUp, ArrowDown, Layers, Lock, Unlock, History,
  TrendingUp
} from 'lucide-react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface GlobalProduct {
  id: string;
  name: string;
  description?: string;
  itemsPerBox?: number;
  imageUrl?: string;
  categoryIds?: string[];
  brandId?: string;
}

interface Category {
  id: string;
  name: string;
  subcategories?: { id: string; name: string }[];
}

interface Brand {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface DistributorProduct {
  id?: string;
  distributorId: string;
  productId: string;
  productName: string;
  productImageUrl?: string;
  description?: string;
  categoryName?: string;
  brandName?: string;
  itemsPerBox?: number;
  buyPrice: number;
  sellPrice: number;
  stockQuantity: number;
  manufacturingDate?: string;
  expiryDate?: string;
  priority?: number; // Sales priority rank (1 = first to sell)
  isBlocked?: boolean; // Red status: requires distributor approval, will not sell automatically
  createdAt?: unknown;
}

export interface GroupedDistributorProduct {
  productName: string;
  productImageUrl?: string;
  categoryName?: string;
  brandName?: string;
  itemsPerBox?: number;
  totalStock: number;
  minSellPrice: number;
  maxSellPrice: number;
  minBuyPrice: number;
  maxBuyPrice: number;
  batches: DistributorProduct[];
}

/**
 * Deducts `requestedQty` from distributor's inventory for a product by name.
 * Processes batches in order of `priority` (1, 2, 3...) or `expiryDate` (closest DLC first).
 * Example: If Batch A (Priority 1) has 3 units and Batch B (Priority 2) has 4 units,
 * requesting 5 units will deduct 3 from Batch A (reducing it to 0) and 2 from Batch B (reducing it to 2).
 */
export async function deductDistributorStockByPriority(
  distributorId: string,
  productName: string,
  requestedQty: number
) {
  if (requestedQty <= 0) return;

  const q = query(
    collection(db, 'distributor_products'),
    where('distributorId', '==', distributorId),
    where('productName', '==', productName)
  );

  const snapshot = await getDocs(q);
  const batches = snapshot.docs
    .map(d => ({
      id: d.id,
      ...d.data()
    } as DistributorProduct))
    .filter(b => (b.stockQuantity || 0) > 0 && !b.isBlocked);

  // Sort batches by priority ascending (1 first, 2 second...), then by expiryDate ascending
  batches.sort((a, b) => {
    const prioA = a.priority ?? 999;
    const prioB = b.priority ?? 999;
    if (prioA !== prioB) return prioA - prioB;
    const expA = a.expiryDate || '9999-12-31';
    const expB = b.expiryDate || '9999-12-31';
    return expA.localeCompare(expB);
  });

  let remainingToDeduct = requestedQty;

  for (const batch of batches) {
    if (remainingToDeduct <= 0) break;
    if (!batch.id) continue;

    const currentStock = batch.stockQuantity || 0;
    const qtyDeducted = Math.min(currentStock, remainingToDeduct);
    const newStock = currentStock - qtyDeducted;
    remainingToDeduct -= qtyDeducted;

    await updateDoc(doc(db, 'distributor_products', batch.id), {
      stockQuantity: newStock,
      updatedAt: serverTimestamp()
    });
  }
}

export default function CatalogPage() {
  const { user } = useAuth();
  
  // Data lists
  const [distributorProducts, setDistributorProducts] = useState<DistributorProduct[]>([]);
  const [globalProducts, setGlobalProducts] = useState<GlobalProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab State: 'active' (stock > 0) vs 'archived' (stock <= 0)
  const [stockViewTab, setStockViewTab] = useState<'active' | 'archived'>('active');

  // Expanded Groups State
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Filters (Main Page)
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');

  // Add Product Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalCategoryFilter, setGlobalCategoryFilter] = useState('all');
  const [globalSubcategoryFilter, setGlobalSubcategoryFilter] = useState('all');
  const [globalBrandFilter, setGlobalBrandFilter] = useState('all');
  const [selectedGlobalProduct, setSelectedGlobalProduct] = useState<GlobalProduct | null>(null);
  
  // Form states for adding/editing
  const [buyPrice, setBuyPrice] = useState<number | ''>('');
  const [sellPrice, setSellPrice] = useState<number | ''>('');
  const [stockQuantity, setStockQuantity] = useState<number | ''>(100);
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [priority, setPriority] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // Edit Modal state
  const [editingItem, setEditingItem] = useState<DistributorProduct | null>(null);

  // 1. Listen to distributor's inventory in Firestore
  useEffect(() => {
    if (!user?.id) return;
    const q = query(
      collection(db, 'distributor_products'),
      where('distributorId', '==', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: DistributorProduct[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as DistributorProduct));
      setDistributorProducts(items);
      setLoading(false);
    }, err => {
      console.error('Error loading distributor inventory:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // 2. Load global products, categories, and brands
  useEffect(() => {
    const fetchRefData = async () => {
      try {
        const [snapProds, snapCats, snapBrands] = await Promise.all([
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'categories')),
          getDocs(collection(db, 'brands')),
        ]);

        const prods = snapProds.docs.map(d => ({ id: d.id, ...d.data() } as GlobalProduct));
        const cats = snapCats.docs.map(d => ({ id: d.id, ...d.data() } as Category));
        const brs = snapBrands.docs.map(d => ({ id: d.id, ...d.data() } as Brand));

        setGlobalProducts(prods);
        setCategories(cats);
        setBrands(brs);
      } catch (err) {
        console.error('Error fetching global ref data:', err);
      }
    };

    fetchRefData();
  }, []);

  const toggleGroupExpand = (productName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [productName]: !prev[productName]
    }));
  };

  // Move Batch Priority Up or Down
  const handleSwapPriority = async (batch: DistributorProduct, otherBatch: DistributorProduct) => {
    if (!batch.id || !otherBatch.id) return;
    const currentPrio = batch.priority ?? 1;
    const otherPrio = otherBatch.priority ?? 2;

    try {
      await updateDoc(doc(db, 'distributor_products', batch.id), { priority: otherPrio });
      await updateDoc(doc(db, 'distributor_products', otherBatch.id), { priority: currentPrio });
    } catch (err) {
      console.error('Error swapping priority:', err);
    }
  };

  // Helper resolvers
  const getCategoryNameForProduct = (gp: GlobalProduct): string => {
    if (!gp.categoryIds || gp.categoryIds.length === 0) return 'Général';
    const firstCat = categories.find(c => c.id === gp.categoryIds![0]);
    if (firstCat) return firstCat.name;
    for (const cat of categories) {
      const sub = cat.subcategories?.find(s => s.id === gp.categoryIds![0]);
      if (sub) return `${cat.name} > ${sub.name}`;
    }
    return 'Général';
  };

  const getBrandNameForProduct = (gp: GlobalProduct): string => {
    if (!gp.brandId) return '';
    const b = brands.find(brand => brand.id === gp.brandId);
    return b ? b.name : '';
  };

  const activeBatchesCount = distributorProducts.filter(p => p.stockQuantity > 0).length;
  const archivedBatchesCount = distributorProducts.filter(p => p.stockQuantity <= 0).length;

  // Filtered inventory list
  const filteredDistProducts = distributorProducts.filter(p => {
    const matchesTab = stockViewTab === 'active' ? p.stockQuantity > 0 : p.stockQuantity <= 0;
    const matchesSearch = p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.brandName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.categoryName === categoryFilter;
    const matchesBrand = brandFilter === 'all' || p.brandName === brandFilter;
    return matchesTab && matchesSearch && matchesCategory && matchesBrand;
  });

  // GROUPING PRODUCTS BY PRODUCT NAME
  const groupedProductsMap = new Map<string, GroupedDistributorProduct>();

  filteredDistProducts.forEach(p => {
    if (!groupedProductsMap.has(p.productName)) {
      groupedProductsMap.set(p.productName, {
        productName: p.productName,
        productImageUrl: p.productImageUrl,
        categoryName: p.categoryName,
        brandName: p.brandName,
        itemsPerBox: p.itemsPerBox,
        totalStock: p.stockQuantity,
        minSellPrice: p.sellPrice,
        maxSellPrice: p.sellPrice,
        minBuyPrice: p.buyPrice,
        maxBuyPrice: p.buyPrice,
        batches: [p]
      });
    } else {
      const existing = groupedProductsMap.get(p.productName)!;
      existing.totalStock += p.stockQuantity;
      existing.minSellPrice = Math.min(existing.minSellPrice, p.sellPrice);
      existing.maxSellPrice = Math.max(existing.maxSellPrice, p.sellPrice);
      existing.minBuyPrice = Math.min(existing.minBuyPrice, p.buyPrice);
      existing.maxBuyPrice = Math.max(existing.maxBuyPrice, p.buyPrice);
      existing.batches.push(p);
    }
  });

  // Sort batches inside each group by priority ascending (1, 2, 3...) then expiryDate
  groupedProductsMap.forEach(group => {
    group.batches.sort((a, b) => {
      const prioA = a.priority ?? 999;
      const prioB = b.priority ?? 999;
      if (prioA !== prioB) return prioA - prioB;
      const expA = a.expiryDate || '9999-12-31';
      const expB = b.expiryDate || '9999-12-31';
      return expA.localeCompare(expB);
    });
  });

  const groupedProductList = Array.from(groupedProductsMap.values());

  const availableCategoryNames = Array.from(new Set(distributorProducts.map(p => p.categoryName).filter(Boolean))) as string[];
  const availableBrandNames = Array.from(new Set(distributorProducts.map(p => p.brandName).filter(Boolean))) as string[];

  // Subcategories available based on selected global category filter
  const selectedGlobalCat = categories.find(c => c.id === globalCategoryFilter);
  const availableSubcategories = selectedGlobalCat?.subcategories ?? [];
  const availableGlobalBrands = brands;

  const filteredGlobalProducts = globalProducts.filter(gp => {
    const matchesSearch = gp.name.toLowerCase().includes(globalSearch.toLowerCase());
    let matchesCategory = true;

    if (globalCategoryFilter !== 'all') {
      const validIds = [globalCategoryFilter];
      if (selectedGlobalCat?.subcategories) {
        validIds.push(...selectedGlobalCat.subcategories.map(s => s.id));
      }
      matchesCategory = (gp.categoryIds ?? []).some(id => validIds.includes(id));
    }

    let matchesSubcategory = true;
    if (globalSubcategoryFilter !== 'all') {
      matchesSubcategory = (gp.categoryIds ?? []).includes(globalSubcategoryFilter);
    }

    const brandName = getBrandNameForProduct(gp);
    const matchesBrand =
      globalBrandFilter === 'all' ||
      gp.brandId === globalBrandFilter ||
      brandName === globalBrandFilter;

    return matchesSearch && matchesCategory && matchesSubcategory && matchesBrand;
  });

  // Modal Handlers
  const openAddModal = () => {
    setSelectedGlobalProduct(null);
    setGlobalSearch('');
    setGlobalCategoryFilter('all');
    setGlobalSubcategoryFilter('all');
    setGlobalBrandFilter('all');
    setBuyPrice('');
    setSellPrice('');
    setStockQuantity(100);
    setManufacturingDate('');
    setExpiryDate('');
    setPriority(1);
    setIsAddModalOpen(true);
  };

  const openAddBatchForProduct = (group: GroupedDistributorProduct) => {
    // Find matching global product
    const match = globalProducts.find(gp => gp.name === group.productName);
    if (match) {
      setSelectedGlobalProduct(match);
    } else {
      setSelectedGlobalProduct({
        id: group.batches[0]?.productId || 'custom',
        name: group.productName,
        imageUrl: group.productImageUrl,
        itemsPerBox: group.itemsPerBox
      });
    }

    setBuyPrice(group.batches[0]?.buyPrice || '');
    setSellPrice(group.batches[0]?.sellPrice || '');
    setStockQuantity(50);
    setManufacturingDate('');
    setExpiryDate('');
    setPriority(group.batches.length + 1);
    setIsAddModalOpen(true);
  };

  const selectProductToAdd = (gp: GlobalProduct) => {
    setSelectedGlobalProduct(gp);
    const existing = distributorProducts.filter(dp => dp.productId === gp.id || dp.productName === gp.name);
    setPriority(existing.length + 1);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGlobalProduct || !user?.id) return;
    if (!buyPrice || !sellPrice || stockQuantity === '') return;

    setSaving(true);
    try {
      const categoryName = getCategoryNameForProduct(selectedGlobalProduct);
      const brandName = getBrandNameForProduct(selectedGlobalProduct);

      const newItem: Omit<DistributorProduct, 'id'> = {
        distributorId: user.id,
        productId: selectedGlobalProduct.id,
        productName: selectedGlobalProduct.name,
        productImageUrl: selectedGlobalProduct.imageUrl || '',
        description: selectedGlobalProduct.description || '',
        categoryName,
        brandName,
        itemsPerBox: selectedGlobalProduct.itemsPerBox || 1,
        buyPrice: Number(buyPrice),
        sellPrice: Number(sellPrice),
        stockQuantity: Number(stockQuantity),
        manufacturingDate: manufacturingDate || '',
        expiryDate: expiryDate || '',
        priority: priority || 1,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'distributor_products'), newItem);
      setIsAddModalOpen(false);
      setSelectedGlobalProduct(null);
    } catch (err) {
      console.error('Error adding product to stock:', err);
      alert('Erreur lors de l\'ajout du produit.');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (item: DistributorProduct) => {
    setEditingItem(item);
    setBuyPrice(item.buyPrice);
    setSellPrice(item.sellPrice);
    setStockQuantity(item.stockQuantity);
    setManufacturingDate(item.manufacturingDate || '');
    setExpiryDate(item.expiryDate || '');
    setPriority(item.priority || 1);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.id) return;
    if (!buyPrice || !sellPrice || stockQuantity === '') return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'distributor_products', editingItem.id), {
        buyPrice: Number(buyPrice),
        sellPrice: Number(sellPrice),
        stockQuantity: Number(stockQuantity),
        manufacturingDate: manufacturingDate || '',
        expiryDate: expiryDate || '',
        priority: Number(priority),
        updatedAt: serverTimestamp()
      });
      setEditingItem(null);
    } catch (err) {
      console.error('Error updating product:', err);
      alert('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Voulez-vous vraiment retirer ce lot de votre stock entrepôt ?')) return;
    try {
      await deleteDoc(doc(db, 'distributor_products', id));
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  const handleToggleBlockStatus = async (batch: DistributorProduct) => {
    if (!batch.id) return;
    try {
      await updateDoc(doc(db, 'distributor_products', batch.id), {
        isBlocked: !batch.isBlocked,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error toggling block status:', err);
    }
  };

  return (
    <div className="page-enter" style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={22} style={{ color: 'var(--accent)' }} /> Catalogue & Stock Entrepôt
          </h2>
          <p className="page-subtitle">Gestion par produits regroupés et priorité des ventes par lots (DLC)</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={openAddModal}
          style={{
            background: 'linear-gradient(135deg, var(--accent), #7c3aed)', color: '#fff', border: 'none',
            padding: '11px 22px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
            fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 124, 255, 0.3)'
          }}
        >
          <Plus size={18} /> Nouveau Produit
        </button>
      </div>

      {/* Tab Switcher: Stock Actif vs Historique/Épuisés */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => setStockViewTab('active')}
          style={{
            padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.2s',
            background: stockViewTab === 'active' ? 'var(--accent)' : 'var(--bg-primary)',
            color: stockViewTab === 'active' ? '#fff' : 'var(--text-secondary)'
          }}
        >
          <Package size={16} /> Stock Actif en Entrepôt ({activeBatchesCount})
        </button>

        <button
          type="button"
          onClick={() => setStockViewTab('archived')}
          style={{
            padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.2s',
            background: stockViewTab === 'archived' ? 'var(--accent)' : 'var(--bg-primary)',
            color: stockViewTab === 'archived' ? '#fff' : 'var(--text-secondary)'
          }}
        >
          <History size={16} /> Historique & Lots Épuisés ({archivedBatchesCount})
        </button>
      </div>

      {/* Main Toolbar & Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {/* Search input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Rechercher un produit par nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '12px 16px 12px 42px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--bg-primary)',
              color: 'var(--text-primary)', outline: 'none', fontSize: 13
            }}
          />
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
            fontSize: 13, cursor: 'pointer', minWidth: 170
          }}
        >
          <option value="all">Toutes les catégories</option>
          {availableCategoryNames.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Brand filter */}
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          style={{
            padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
            fontSize: 13, cursor: 'pointer', minWidth: 150
          }}
        >
          <option value="all">Toutes les marques</option>
          {availableBrandNames.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* Main Table */}
      <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 14, border: '1px solid var(--border)' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            Chargement de votre stock entrepôt...
          </div>
        ) : groupedProductList.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
              <Package size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Aucun produit dans votre stock</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                Ajoutez des produits issus du catalogue général pour commencer votre gestion de stock.
              </p>
            </div>
            <button className="btn btn-primary" onClick={openAddModal} style={{ marginTop: 8 }}>
              <Plus size={16} /> Ajouter mon premier produit
            </button>
          </div>
        ) : (
          <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, width: 40 }}></th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12 }}>Produit</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12 }}>Catégorie / Marque</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textAlign: 'right' }}>Prix d'Achat</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textAlign: 'right' }}>Prix Vente (Gros)</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textAlign: 'center' }}>Stock Total Cumulé</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedProductList.map(group => {
                  const isExpanded = !!expandedGroups[group.productName];
                  const batchCount = group.batches.length;
                  const isLowStock = group.totalStock <= 10;

                  return (
                    <React.Fragment key={group.productName}>
                      {/* MAIN GROUP ROW */}
                      <tr
                        onClick={() => toggleGroupExpand(group.productName)}
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid var(--border-light)',
                          background: isExpanded ? 'rgba(79, 124, 255, 0.05)' : 'transparent',
                          cursor: 'pointer', transition: 'background 0.15s'
                        }}
                      >
                        {/* Expand Icon */}
                        <td style={{ padding: '14px 12px 14px 18px', textAlign: 'center' }}>
                          <button
                            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title={isExpanded ? "Réduire les lots" : "Afficher les lots"}
                          >
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                        </td>

                        {/* Product info */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                              background: group.productImageUrl ? `url(${group.productImageUrl}) center/cover no-repeat` : 'var(--bg-primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: '1px solid var(--border)'
                            }}>
                              {!group.productImageUrl && <Package size={18} style={{ color: 'var(--text-muted)' }} />}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                {group.productName}
                                <span style={{
                                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                                  background: 'var(--accent-glow)', color: 'var(--accent)'
                                }}>
                                  {batchCount} lot{batchCount > 1 ? 's' : ''}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <Box size={11} /> {group.itemsPerBox || 1} pcs / boîte
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category & Brand */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                            <span style={{ padding: '3px 8px', background: 'var(--accent-glow)', color: 'var(--accent)', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                              <Tag size={10} style={{ marginRight: 4, verticalAlign: -1 }} />
                              {group.categoryName || 'Général'}
                            </span>
                            {group.brandName && (
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Award size={10} style={{ color: 'var(--text-muted)' }} /> {group.brandName}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Buy Price */}
                        <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13 }}>
                          {group.minBuyPrice === group.maxBuyPrice
                            ? `${group.minBuyPrice.toLocaleString('fr-DZ')} DA`
                            : `${group.minBuyPrice.toLocaleString('fr-DZ')} - ${group.maxBuyPrice.toLocaleString('fr-DZ')} DA`}
                        </td>

                        {/* Sell Price */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 14 }}>
                            {group.minSellPrice === group.maxSellPrice
                              ? `${group.minSellPrice.toLocaleString('fr-DZ')} DA`
                              : `${group.minSellPrice.toLocaleString('fr-DZ')} - ${group.maxSellPrice.toLocaleString('fr-DZ')} DA`}
                          </div>
                        </td>

                        {/* Total Stock */}
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 800,
                            background: isLowStock ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                            color: isLowStock ? 'var(--danger)' : 'var(--success)',
                            display: 'inline-flex', alignItems: 'center', gap: 4
                          }}>
                            {isLowStock && <AlertTriangle size={12} />}
                            {group.totalStock} pcs au total
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openAddBatchForProduct(group)}
                            style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}
                          >
                            <Plus size={14} /> Ajouter un lot
                          </button>
                        </td>
                      </tr>

                      {/* EXPANDED SUB-ROWS (BATCHES & PRIORITY) */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ padding: '0 0 16px 40px', background: 'rgba(15, 23, 42, 0.3)', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ padding: 16, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)', marginTop: 8 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Layers size={14} style={{ color: 'var(--accent)' }} />
                                Order de priorité des ventes et lots de péremption pour <strong>{group.productName}</strong> :
                              </div>

                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Priorité de Vente</th>
                                    <th style={{ padding: '8px 12px' }}>Date Péremption (DLC)</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Prix D'achat</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Prix Vente Gros</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Stock Lot</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions Lot</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.batches.map((batch, index) => {
                                    const unblockedBatches = group.batches.filter(b => !b.isBlocked);
                                    const unblockedIndex = unblockedBatches.findIndex(b => b.id === batch.id);

                                    let badgeBg = 'var(--bg-card)';
                                    let badgeColor = 'var(--text-secondary)';
                                    let badgeBorder = '1px solid var(--border)';
                                    let badgeLabel = `Priorité #${index + 1}`;

                                    if (stockViewTab === 'archived' || batch.stockQuantity <= 0) {
                                      badgeBg = 'rgba(239, 68, 68, 0.2)';
                                      badgeColor = 'var(--danger)';
                                      badgeBorder = '1px solid var(--danger)';
                                      badgeLabel = `🔴 Lot Épuisé (0 pcs)`;
                                    } else if (batch.isBlocked) {
                                      // ROUGE : Bloqué / Approbation requise
                                      badgeBg = 'rgba(239, 68, 68, 0.2)';
                                      badgeColor = 'var(--danger)';
                                      badgeBorder = '1px solid var(--danger)';
                                      badgeLabel = `🔴 Bloqué (Approbation requise)`;
                                    } else if (unblockedIndex === 0) {
                                      // VERT : Priorité #1 (En Vente)
                                      badgeBg = 'rgba(34, 197, 94, 0.2)';
                                      badgeColor = 'var(--success)';
                                      badgeBorder = '1px solid var(--success)';
                                      badgeLabel = `🟢 Priorité #${index + 1} (En Vente)`;
                                    } else {
                                      // JAUNE : Priorité Suivante (File d'attente)
                                      badgeBg = 'rgba(234, 179, 8, 0.2)';
                                      badgeColor = '#eab308';
                                      badgeBorder = '1px solid #eab308';
                                      badgeLabel = `🟡 Priorité #${index + 1} (File d'attente)`;
                                    }

                                    return (
                                      <tr key={batch.id} style={{ borderBottom: '1px solid var(--border-light)', opacity: batch.isBlocked ? 0.75 : 1 }}>
                                        {/* Priority Rank & Status Badge */}
                                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{
                                              padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 800,
                                              background: badgeBg, color: badgeColor, border: badgeBorder
                                            }}>
                                              {badgeLabel}
                                            </span>

                                            {stockViewTab === 'active' && (
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <button
                                                  disabled={index === 0}
                                                  onClick={() => handleSwapPriority(batch, group.batches[index - 1])}
                                                  style={{ background: 'none', border: 'none', color: index === 0 ? 'var(--text-muted)' : 'var(--accent)', cursor: index === 0 ? 'default' : 'pointer', padding: 1 }}
                                                  title="Monter d'un rang"
                                                >
                                                  <ArrowUp size={12} />
                                                </button>
                                                <button
                                                  disabled={index === group.batches.length - 1}
                                                  onClick={() => handleSwapPriority(batch, group.batches[index + 1])}
                                                  style={{ background: 'none', border: 'none', color: index === group.batches.length - 1 ? 'var(--text-muted)' : 'var(--accent)', cursor: index === group.batches.length - 1 ? 'default' : 'pointer', padding: 1 }}
                                                  title="Descendre d'un rang"
                                                >
                                                  <ArrowDown size={12} />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </td>

                                        {/* Expiry Date */}
                                        <td style={{ padding: '10px 12px' }}>
                                          {batch.expiryDate ? (
                                            <div style={{ color: stockViewTab === 'active' && !batch.isBlocked && unblockedIndex === 0 ? '#eab308' : 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                              <Calendar size={12} /> DLC : {batch.expiryDate}
                                            </div>
                                          ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>Sans date définie</span>
                                          )}
                                        </td>

                                        {/* Buy price */}
                                         <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                                           <div>{batch.buyPrice.toLocaleString('fr-DZ')} DA</div>
                                           {batch.itemsPerBox && batch.itemsPerBox > 1 ? (
                                             <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
                                               {(batch.buyPrice / batch.itemsPerBox).toFixed(2)} DA / pc
                                             </div>
                                           ) : null}
                                         </td>

                                         {/* Sell price */}
                                         <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--accent)' }}>
                                           <div>{batch.sellPrice.toLocaleString('fr-DZ')} DA</div>
                                           {batch.itemsPerBox && batch.itemsPerBox > 1 ? (
                                             <div style={{ fontSize: 10, color: batch.sellPrice >= batch.buyPrice ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                               {(batch.sellPrice / batch.itemsPerBox).toFixed(2)} DA / pc (+{((batch.sellPrice - batch.buyPrice) / batch.itemsPerBox).toFixed(2)} DA profit)
                                             </div>
                                           ) : null}
                                         </td>

                                        {/* Stock qty */}
                                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                          <strong style={{ color: batch.stockQuantity > 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
                                            {batch.stockQuantity} pcs
                                          </strong>
                                        </td>

                                        {/* Batch actions */}
                                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
                                            {stockViewTab === 'archived' ? (
                                              <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => openEditModal(batch)}
                                                title="Réapprovisionner ce lot épuisé"
                                                style={{
                                                  padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6,
                                                  color: 'var(--accent)', border: '1px solid var(--accent)', background: 'var(--accent-glow)',
                                                  display: 'flex', alignItems: 'center', gap: 4
                                                }}
                                              >
                                                <Plus size={12} /> Réapprovisionner
                                              </button>
                                            ) : (
                                              <>
                                                {/* Block / Unblock Toggle Button */}
                                                <button
                                                  className="btn btn-ghost btn-sm"
                                                  onClick={() => handleToggleBlockStatus(batch)}
                                                  title={batch.isBlocked ? "Approuver ce lot pour la vente automatique" : "Bloquer ce lot (Réserves/Approbation requise)"}
                                                  style={{
                                                    padding: '4px 8px', fontSize: 11, fontWeight: 700, borderRadius: 6,
                                                    color: batch.isBlocked ? 'var(--success)' : 'var(--danger)',
                                                    border: batch.isBlocked ? '1px solid var(--success)' : '1px solid rgba(239, 68, 68, 0.4)',
                                                    background: batch.isBlocked ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                    display: 'flex', alignItems: 'center', gap: 4
                                                  }}
                                                >
                                                  {batch.isBlocked ? (
                                                    <><Unlock size={12} /> Approuver</>
                                                  ) : (
                                                    <><Lock size={12} /> Bloquer</>
                                                  )}
                                                </button>

                                                <button
                                                  className="btn btn-ghost btn-sm"
                                                  onClick={() => openEditModal(batch)}
                                                  title="Modifier ce lot"
                                                  style={{ padding: 4 }}
                                                >
                                                  <Edit2 size={13} />
                                                </button>
                                              </>
                                            )}

                                            <button
                                              className="btn btn-ghost btn-sm"
                                              onClick={() => handleDeleteProduct(batch.id!)}
                                              title="Supprimer définitivement ce lot"
                                              style={{ color: 'var(--danger)', padding: 4 }}
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal" style={{ width: 620, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} style={{ color: 'var(--accent)' }} />
                {selectedGlobalProduct ? `Nouveau Lot — ${selectedGlobalProduct.name}` : 'Ajouter un produit au stock'}
              </div>
              <button className="icon-btn" onClick={() => setIsAddModalOpen(false)} style={{ border: 'none' }}><X size={16} /></button>
            </div>

            {/* STAGE 1: SELECT PRODUCT FROM GLOBAL CATALOG */}
            {!selectedGlobalProduct ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Sélectionnez un produit dans le catalogue global configuré par l'administrateur :
                </p>

                {/* Combined Filter Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Rechercher par nom de produit..."
                      value={globalSearch}
                      onChange={(e) => setGlobalSearch(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <select
                      value={globalCategoryFilter}
                      onChange={e => {
                        setGlobalCategoryFilter(e.target.value);
                        setGlobalSubcategoryFilter('all');
                      }}
                      style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer' }}
                    >
                      <option value="all">Toutes catégories</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>

                    <select
                      value={globalSubcategoryFilter}
                      onChange={e => setGlobalSubcategoryFilter(e.target.value)}
                      disabled={globalCategoryFilter !== 'all' && availableSubcategories.length === 0}
                      style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer' }}
                    >
                      <option value="all">Toutes sous-classes</option>
                      {availableSubcategories.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>

                    <select
                      value={globalBrandFilter}
                      onChange={e => setGlobalBrandFilter(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer' }}
                    >
                      <option value="all">Toutes marques</option>
                      {availableGlobalBrands.map(brand => (
                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
                  {filteredGlobalProducts.length === 0 ? (
                    <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      Aucun produit disponible dans le catalogue administrateur.
                    </div>
                  ) : filteredGlobalProducts.map(gp => {
                    const categoryName = getCategoryNameForProduct(gp);
                    const brandName = getBrandNameForProduct(gp);
                    const isAlreadyAdded = distributorProducts.some(dp => dp.productId === gp.id);

                    return (
                      <div
                        key={gp.id}
                        onClick={() => selectProductToAdd(gp)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
                          padding: 12, borderRadius: 10, background: 'var(--bg-primary)',
                          border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        className="hover-card"
                      >
                        <div style={{
                          width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                          background: gp.imageUrl ? `url(${gp.imageUrl}) center/cover no-repeat` : 'var(--bg-card)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)'
                        }}>
                          {!gp.imageUrl && <Package size={18} style={{ color: 'var(--text-muted)' }} />}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{gp.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <span style={{ fontSize: 11, background: 'var(--accent-glow)', color: 'var(--accent)', padding: '1px 7px', borderRadius: 4, fontWeight: 600 }}>
                              {categoryName}
                            </span>
                            {brandName && (
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>• {brandName}</span>
                            )}
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>• {gp.itemsPerBox || 1} pcs/boîte</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isAlreadyAdded && (
                            <span style={{ fontSize: 11, color: 'var(--success)', background: 'rgba(34,197,94,0.1)', padding: '3px 8px', borderRadius: 6, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <CheckCircle2 size={11} /> En stock
                            </span>
                          )}
                          <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
                            Sélectionner <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* STAGE 2: ENTER BUY/SELL PRICE, DATES & INITIAL STOCK */
              <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                    background: selectedGlobalProduct.imageUrl ? `url(${selectedGlobalProduct.imageUrl}) center/cover no-repeat` : 'var(--bg-card)',
                    border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {!selectedGlobalProduct.imageUrl && <Package size={20} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedGlobalProduct.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Nouveau lot pour ce produit
                    </div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedGlobalProduct(null)} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ChevronLeft size={14} /> Changer
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label" style={{ marginBottom: 6, fontSize: 12 }}>Prix d'achat par carton (DA) *</label>
                    <input
                      required type="number" min={1} className="form-input" placeholder="Ex: 350"
                      value={buyPrice} onChange={e => setBuyPrice(e.target.value ? Number(e.target.value) : '')}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ marginBottom: 6, fontSize: 12 }}>Prix de gros / Vente par carton (DA) *</label>
                    <input
                      required type="number" min={1} className="form-input" placeholder="Ex: 450"
                      value={sellPrice} onChange={e => setSellPrice(e.target.value ? Number(e.target.value) : '')}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label" style={{ marginBottom: 6, fontSize: 12 }}>Quantité en stock du lot *</label>
                    <input
                      required type="number" min={0} className="form-input" placeholder="Ex: 50"
                      value={stockQuantity} onChange={e => setStockQuantity(e.target.value ? Number(e.target.value) : '')}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ marginBottom: 6, fontSize: 12 }}>Priorité de vente *</label>
                    <input
                      required type="number" min={1} className="form-input" placeholder="Ex: 1"
                      value={priority} onChange={e => setPriority(Number(e.target.value))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label" style={{ marginBottom: 6, fontSize: 12 }}>Date de fabrication</label>
                    <input
                      type="date" className="form-input" value={manufacturingDate}
                      onChange={e => setManufacturingDate(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ marginBottom: 6, fontSize: 12 }}>Date de péremption (DLC)</label>
                    <input
                      type="date" className="form-input" value={expiryDate}
                      onChange={e => setExpiryDate(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setSelectedGlobalProduct(null)}>Retour</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Ajout en cours...' : 'Ajouter ce lot au stock'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal" style={{ width: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit2 size={18} style={{ color: 'var(--accent)' }} />
                Modifier le Lot — {editingItem.productName}
              </div>
              <button className="icon-btn" onClick={() => setEditingItem(null)} style={{ border: 'none' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleUpdateProduct} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label" style={{ marginBottom: 6, fontSize: 12 }}>Prix d'achat par carton (DA) *</label>
                  <input
                    required type="number" min={1} className="form-input" value={buyPrice}
                    onChange={e => setBuyPrice(e.target.value ? Number(e.target.value) : '')}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ marginBottom: 6, fontSize: 12 }}>Prix de gros / Vente par carton (DA) *</label>
                  <input
                    required type="number" min={1} className="form-input" value={sellPrice}
                    onChange={e => setSellPrice(e.target.value ? Number(e.target.value) : '')}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label" style={{ marginBottom: 6, fontSize: 12 }}>Stock actuel du lot *</label>
                  <input
                    required type="number" min={0} className="form-input" value={stockQuantity}
                    onChange={e => setStockQuantity(e.target.value ? Number(e.target.value) : '')}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ marginBottom: 6, fontSize: 12 }}>Priorité de Vente (Rang) *</label>
                  <input
                    required type="number" min={1} className="form-input" value={priority}
                    onChange={e => setPriority(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label" style={{ marginBottom: 6, fontSize: 12 }}>Date de fabrication</label>
                  <input
                    type="date" className="form-input" value={manufacturingDate}
                    onChange={e => setManufacturingDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ marginBottom: 6, fontSize: 12 }}>Date de péremption (DLC)</label>
                  <input
                    type="date" className="form-input" value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
                  />
                </div>
              </div>

              
              {/* Live Unit & Profit Calculation Preview */}
              {buyPrice !== '' && sellPrice !== '' && Number(buyPrice) > 0 && Number(sellPrice) > 0 && (
                <div style={{
                  padding: 14, borderRadius: 10, background: 'rgba(79, 124, 255, 0.08)',
                  border: '1px solid rgba(79, 124, 255, 0.2)', display: 'flex', flexDirection: 'column', gap: 6
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={14} /> Aperçu des Prix & Bénéfices Calculés ({editingItem.itemsPerBox || 1} pcs/carton)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4 }}>
                    <div style={{ background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Achat unitaire</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                        {(Number(buyPrice) / (editingItem.itemsPerBox || 1)).toFixed(2)} DA/pc
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Vente unitaire</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>
                        {(Number(sellPrice) / (editingItem.itemsPerBox || 1)).toFixed(2)} DA/pc
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Profit / pièce</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: Number(sellPrice) >= Number(buyPrice) ? 'var(--success)' : 'var(--danger)', marginTop: 2 }}>
                        {((Number(sellPrice) - Number(buyPrice)) / (editingItem.itemsPerBox || 1)).toFixed(2)} DA
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Profit / carton</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: Number(sellPrice) >= Number(buyPrice) ? 'var(--success)' : 'var(--danger)', marginTop: 2 }}>
                        {(Number(sellPrice) - Number(buyPrice)).toLocaleString('fr-DZ')} DA
                      </div>
                    </div>
                  </div>
                  {stockQuantity !== '' && Number(stockQuantity) > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6 }}>
                      <span>Profit total estimé sur ce lot ({stockQuantity} cartons) :</span>
                      <strong style={{ color: 'var(--success)' }}>
                        {((Number(sellPrice) - Number(buyPrice)) * Number(stockQuantity)).toLocaleString('fr-DZ')} DA
                      </strong>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingItem(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Mettre à jour ce lot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
