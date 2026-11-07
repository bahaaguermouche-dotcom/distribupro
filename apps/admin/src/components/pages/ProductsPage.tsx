'use client';
import { useState } from 'react';
import {
  Plus, Search, Package, Tag, Edit2, Trash2, X,
  Box, AlignLeft, Layers, Award
} from 'lucide-react';
import CloudinaryUpload from '@/components/CloudinaryUpload';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase';

interface Product {
  id?: string;
  name: string;
  description: string;
  itemsPerBox: number;
  imageUrl: string;
  categoryIds: string[];
  brandId: string;
  createdAt?: unknown;
}

interface Category {
  id?: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

interface Brand {
  id?: string;
  name: string;
  imageUrl: string;
}

const EMPTY_PRODUCT: Omit<Product, 'id'> = {
  name: '', description: '', itemsPerBox: 1, imageUrl: '', categoryIds: [], brandId: '',
};

export default function ProductsPage() {
  const [snapProducts, loadingP] = useCollection(collection(db, 'products'));
  const [snapCats] = useCollection(collection(db, 'categories'));
  const [snapBrands] = useCollection(collection(db, 'brands'));

  const products: Product[] = snapProducts?.docs.map(d => ({ id: d.id, ...d.data() } as Product)) ?? [];
  const categories: Category[] = snapCats?.docs.map(d => ({ id: d.id, ...d.data() } as Category)) ?? [];
  const brands: Brand[] = snapBrands?.docs.map(d => ({ id: d.id, ...d.data() } as Brand)) ?? [];

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, 'id'>>(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditingProduct(null);
    setForm(EMPTY_PRODUCT);
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description,
      itemsPerBox: p.itemsPerBox,
      imageUrl: p.imageUrl ?? '',
      categoryIds: p.categoryIds ?? [],
      brandId: p.brandId ?? '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingProduct?.id) {
        await updateDoc(doc(db, 'products', editingProduct.id), { ...form });
      } else {
        await addDoc(collection(db, 'products'), { ...form, createdAt: serverTimestamp() });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer ce produit du catalogue ?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const toggleCategory = (catId: string) => {
    setForm(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(catId)
        ? prev.categoryIds.filter(c => c !== catId)
        : [...prev.categoryIds, catId],
    }));
  };

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryNames = (ids: string[]) => {
    const names: string[] = [];
    categories.forEach(c => {
      if (ids?.includes(c.id as string)) names.push(c.name);
      (c.subcategories || []).forEach(sub => {
        if (ids?.includes(sub.id)) names.push(sub.name);
      });
    });
    return names;
  };

  return (
    <div className="page-enter">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div className="header-search" style={{ width: 300 }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Nouveau produit
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <Package size={18} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{products.length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Produits dans le catalogue</div>
          </div>
        </div>
        <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(79,124,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <Layers size={18} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{categories.length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Catégories disponibles</div>
          </div>
        </div>
        <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <Tag size={18} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {products.filter(p => (p.categoryIds ?? []).length > 0).length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Produits catégorisés</div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      {loadingP ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Package size={48} style={{ color: 'var(--border-light)' }} />
          <h3>Aucun produit trouvé</h3>
          <p>Ajoutez votre premier produit au catalogue.</p>
          <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Nouveau produit</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégories</th>
                <th>Marque</th>
                <th>Articles / Boîte</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                        background: p.imageUrl ? `url(${p.imageUrl}) center/cover no-repeat` : 'var(--bg-card-hover)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid var(--border)'
                      }}>
                        {!p.imageUrl && <Package size={16} style={{ color: 'var(--text-muted)' }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                        {p.description && (
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {p.description.slice(0, 70)}{p.description.length > 70 ? '…' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {getCategoryNames(p.categoryIds ?? []).map(name => (
                        <span key={name} className="badge" style={{
                          background: 'var(--accent-glow)', color: 'var(--accent)', padding: '2px 8px', fontSize: 10
                        }}>{name}</span>
                      ))}
                      {(p.categoryIds ?? []).length === 0 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Non catégorisé</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {(() => {
                      const brand = brands.find(b => b.id === p.brandId);
                      return brand ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {brand.imageUrl && (
                            <img src={brand.imageUrl} alt={brand.name} style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'cover' }} />
                          )}
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{brand.name}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      );
                    })()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Box size={13} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{p.itemsPerBox}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>pcs / boîte</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => openEdit(p)} title="Modifier">
                        <Edit2 size={13} />
                      </button>
                      <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--danger)' }} onClick={() => handleDelete(p.id!)} title="Supprimer">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" style={{ width: 540, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={18} style={{ color: 'var(--accent)' }} />
                {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
              </div>
              <button className="icon-btn" style={{ width: 32, height: 32, border: 'none' }} onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              {/* Name */}
              <div className="form-group">
                <label className="form-label">Nom du produit *</label>
                <input
                  required autoFocus className="form-input"
                  placeholder="Ex: Sucettes Chupa Chups"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <div className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlignLeft size={12} /> Description courte (optionnel)
                </div>
                <textarea
                  className="form-input" rows={2}
                  placeholder="Ex: Assortiment de 12 parfums, format standard..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Items per box */}
              <div className="form-group">
                <div className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Box size={12} /> Nombre d'articles par boîte *
                </div>
                <input
                  required type="number" min={1} className="form-input"
                  placeholder="Ex: 24"
                  value={form.itemsPerBox}
                  onChange={e => setForm({ ...form, itemsPerBox: parseInt(e.target.value) || 1 })}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  💡 Le prix est géré séparément par chaque distributeur et détaillant.
                </div>
              </div>

              {/* Image — Cloudinary Upload */}
              <div className="form-group">
                <div className="form-label">Photo du produit</div>
                <CloudinaryUpload
                  value={form.imageUrl}
                  onChange={(url) => setForm({ ...form, imageUrl: url })}
                />
              </div>

              {/* Brand */}
              <div className="form-group">
                <div className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={12} /> Marque
                </div>
                <select
                  className="form-input"
                  value={form.brandId}
                  onChange={e => setForm({ ...form, brandId: e.target.value })}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">— Aucune marque —</option>
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Categories & Subcategories */}
              <div className="form-group">
                <div className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Layers size={12} /> Catégories & Sous-catégories
                </div>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 12, padding: 12,
                  background: 'var(--bg-primary)', borderRadius: 8,
                  border: '1px solid var(--border)', minHeight: 52
                }}>
                  {categories.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      Aucune catégorie disponible. Créez-en d'abord dans "Catégories".
                    </span>
                  ) : categories.map(cat => {
                    const isMainSelected = form.categoryIds.includes(cat.id as string);
                    const subcats = cat.subcategories || [];
                    return (
                      <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => toggleCategory(cat.id as string)}
                            className={`filter-btn ${isMainSelected ? 'active' : ''}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}
                          >
                            {isMainSelected && <Tag size={11} />}
                            {cat.name}
                          </button>
                        </div>

                        {/* Show subcategories if main category is selected and has subcategories */}
                        {isMainSelected && subcats.length > 0 && (
                          <div style={{
                            display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 16,
                            borderLeft: '2px solid var(--accent)', marginLeft: 8, paddingTop: 4, paddingBottom: 4
                          }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: '100%', marginBottom: 2 }}>
                              Sous-catégories de {cat.name} :
                            </span>
                            {subcats.map(sub => {
                              const isSubSelected = form.categoryIds.includes(sub.id);
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => toggleCategory(sub.id)}
                                  className={`filter-btn ${isSubSelected ? 'active' : ''}`}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 10px',
                                    background: isSubSelected ? 'var(--accent-glow)' : 'var(--bg-card)',
                                    borderColor: isSubSelected ? 'var(--accent)' : 'var(--border)'
                                  }}
                                >
                                  {isSubSelected && <Tag size={10} />}
                                  {sub.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : (editingProduct ? 'Enregistrer' : 'Ajouter au catalogue')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
