import { useState } from 'react';
import { Plus, Tag, Layers, ChevronRight, ChevronDown, Trash2, Edit2, Search, X, Award } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase';
import CloudinaryUpload from '@/components/CloudinaryUpload';

interface Subcategory {
  id: string;
  name: string;
}

interface Category {
  id?: string;
  name: string;
  description: string;
  subcategories: Subcategory[];
}

interface Brand {
  id?: string;
  name: string;
  imageUrl: string;
  createdAt?: unknown;
}

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');

  // Categories state
  const [snapshot, loading] = useCollection(collection(db, 'categories'));
  const categories: Category[] = snapshot?.docs.map(d => ({ id: d.id, ...d.data() } as Category)) ?? [];
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Brands state
  const [brandSnapshot, brandLoading] = useCollection(collection(db, 'brands'));
  const brands: Brand[] = brandSnapshot?.docs.map(d => ({ id: d.id, ...d.data() } as Brand)) ?? [];
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  
  // Modals state (Categories)
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [activeParentCat, setActiveParentCat] = useState<Category | null>(null);
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);

  // Modals state (Brands)
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Form states
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [subForm, setSubForm] = useState({ name: '' });
  const [brandForm, setBrandForm] = useState({ name: '', imageUrl: '' });

  const toggleExpand = (id: string) => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredCategories = (categories as Category[] || []).filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.subcategories || []).some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredBrands = (brands || []).filter(b => 
    b.name.toLowerCase().includes(brandSearchQuery.toLowerCase())
  );

  // Category Actions
  const openNewCategory = () => {
    setEditingCat(null);
    setCatForm({ name: '', description: '' });
    setIsCatModalOpen(true);
  };

  const openEditCategory = (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    setEditingCat(cat);
    setCatForm({ name: cat.name, description: cat.description || '' });
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCat?.id) {
        await updateDoc(doc(db, 'categories', editingCat.id), {
          name: catForm.name,
          description: catForm.description
        });
      } else {
        await addDoc(collection(db, 'categories'), {
          name: catForm.name,
          description: catForm.description,
          subcategories: []
        });
      }
      setIsCatModalOpen(false);
    } catch (err) {
      console.error("Error saving category", err);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handleDeleteCategory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Voulez-vous vraiment supprimer cette catégorie et toutes ses sous-classes ?")) {
      await deleteDoc(doc(db, 'categories', id));
    }
  };

  // Subcategory Actions
  const openNewSub = (e: React.MouseEvent, parent: Category) => {
    e.stopPropagation();
    setActiveParentCat(parent);
    setEditingSub(null);
    setSubForm({ name: '' });
    setIsSubModalOpen(true);
  };

  const openEditSub = (e: React.MouseEvent, parent: Category, sub: Subcategory) => {
    e.stopPropagation();
    setActiveParentCat(parent);
    setEditingSub(sub);
    setSubForm({ name: sub.name });
    setIsSubModalOpen(true);
  };

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParentCat?.id) return;
    
    try {
      const subs = activeParentCat.subcategories || [];
      let newSubs = [...subs];
      
      if (editingSub) {
        newSubs = newSubs.map(s => s.id === editingSub.id ? { ...s, name: subForm.name } : s);
      } else {
        newSubs.push({
          id: 'sub_' + Date.now().toString(),
          name: subForm.name
        });
      }
      
      await updateDoc(doc(db, 'categories', activeParentCat.id), {
        subcategories: newSubs
      });
      setIsSubModalOpen(false);
    } catch (err) {
      console.error("Error saving subcategory", err);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handleDeleteSub = async (e: React.MouseEvent, parent: Category, subId: string) => {
    e.stopPropagation();
    if (!parent.id) return;
    if (confirm("Supprimer cette sous-classe ?")) {
      const newSubs = (parent.subcategories || []).filter(s => s.id !== subId);
      await updateDoc(doc(db, 'categories', parent.id), {
        subcategories: newSubs
      });
    }
  };

  // Brand Actions
  const openNewBrand = () => {
    setEditingBrand(null);
    setBrandForm({ name: '', imageUrl: '' });
    setIsBrandModalOpen(true);
  };

  const openEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandForm({ name: brand.name, imageUrl: brand.imageUrl || '' });
    setIsBrandModalOpen(true);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBrand?.id) {
        await updateDoc(doc(db, 'brands', editingBrand.id), {
          name: brandForm.name,
          imageUrl: brandForm.imageUrl
        });
      } else {
        await addDoc(collection(db, 'brands'), {
          name: brandForm.name,
          imageUrl: brandForm.imageUrl,
          createdAt: serverTimestamp()
        });
      }
      setIsBrandModalOpen(false);
    } catch (err) {
      console.error("Error saving brand", err);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer cette marque ?")) {
      await deleteDoc(doc(db, 'brands', id));
    }
  };

  return (
    <div className="page-enter">
      {/* Dynamic Title based on Active Tab */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          {activeTab === 'categories' ? 'Catégories (Taxonomie)' : 'Marques'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          {activeTab === 'categories' ? "Gérer l'arborescence des produits" : 'Gérer les marques et logos des produits'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-primary)', borderRadius: 10, padding: 4, border: '1px solid var(--border)', marginBottom: 24 }}>
        <button onClick={() => setActiveTab('categories')} style={{
          flex: 1, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
          fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
          background: activeTab === 'categories' ? 'var(--accent)' : 'transparent',
          color: activeTab === 'categories' ? '#fff' : 'var(--text-secondary)'
        }}>
          <Layers size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> Catégories
        </button>
        <button onClick={() => setActiveTab('brands')} style={{
          flex: 1, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
          fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
          background: activeTab === 'brands' ? 'var(--accent)' : 'transparent',
          color: activeTab === 'brands' ? '#fff' : 'var(--text-secondary)'
        }}>
          <Award size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> Marques
        </button>
      </div>

      {activeTab === 'categories' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div className="header-search" style={{ width: 300 }}>
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input 
                placeholder="Rechercher une catégorie..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={openNewCategory}>
              <Plus size={16} />
              Nouvelle Classe
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement des catégories...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filteredCategories.map(cat => {
                const isExpanded = expandedCats[cat.id as string];
                return (
                  <div key={cat.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        display: 'flex', alignItems: 'center', padding: '16px 20px', 
                        cursor: 'pointer', background: isExpanded ? 'var(--bg-card-hover)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                      onClick={() => toggleExpand(cat.id as string)}
                    >
                      <div style={{ marginRight: 16, color: 'var(--text-muted)' }}>
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </div>
                      
                      <div style={{ 
                        width: 40, height: 40, borderRadius: 8, background: 'var(--accent-glow)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--accent)', marginRight: 16
                      }}>
                        <Layers size={20} />
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{cat.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{cat.description || 'Aucune description'}</div>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <div className="badge info">{(cat.subcategories || []).length} sous-classes</div>
                        <button className="icon-btn" onClick={(e) => openEditCategory(e, cat)} title="Modifier">
                          <Edit2 size={14} />
                        </button>
                        <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={(e) => handleDeleteCategory(e, cat.id as string)} title="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-primary)', padding: '16px 20px 16px 76px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sous-classes</div>
                          <button className="btn btn-sm btn-ghost" onClick={(e) => openNewSub(e, cat)}>
                            <Plus size={14} />
                            Ajouter
                          </button>
                        </div>
                        
                        {(cat.subcategories || []).length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {cat.subcategories.map(sub => (
                              <div key={sub.id} style={{ 
                                display: 'flex', alignItems: 'center', padding: '10px 16px', 
                                background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' 
                              }}>
                                <Tag size={14} style={{ color: 'var(--accent)', marginRight: 12 }} />
                                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{sub.name}</div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={(e) => openEditSub(e, cat, sub)}>
                                    <Edit2 size={12} />
                                  </button>
                                  <button className="icon-btn" style={{ width: 28, height: 28, color: 'var(--danger)' }} onClick={(e) => handleDeleteSub(e, cat, sub.id)}>
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            Aucune sous-classe définie pour cette catégorie.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {!loading && filteredCategories.length === 0 && (
                <div className="empty-state">
                  <Layers size={48} style={{ color: 'var(--border-light)' }} />
                  <h3>Aucune catégorie trouvée</h3>
                  <p>Essayez de modifier votre recherche ou créez une nouvelle classe.</p>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div className="header-search" style={{ width: 300 }}>
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input 
                placeholder="Rechercher une marque..." 
                value={brandSearchQuery}
                onChange={(e) => setBrandSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={openNewBrand}>
              <Plus size={16} />
              Nouvelle Marque
            </button>
          </div>

          {brandLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement des marques...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {filteredBrands.map(brand => (
                <div key={brand.id} className="card" style={{ padding: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-primary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {brand.imageUrl ? (
                      <img src={brand.imageUrl} alt={brand.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Award size={28} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{brand.name}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="icon-btn" onClick={() => openEditBrand(brand)} title="Modifier"><Edit2 size={14} /></button>
                    <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteBrand(brand.id!)} title="Supprimer"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}

              {!brandLoading && filteredBrands.length === 0 && (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <Award size={48} style={{ color: 'var(--border-light)' }} />
                  <h3>Aucune marque trouvée</h3>
                  <p>Essayez de modifier votre recherche ou créez une nouvelle marque.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL CATEGORY */}
      {isCatModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCatModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingCat ? 'Modifier la classe' : 'Nouvelle classe'}</div>
              <button className="icon-btn" onClick={() => setIsCatModalOpen(false)} style={{ width: 32, height: 32, border: 'none' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveCategory}>
              <div className="form-group">
                <label className="form-label">Nom de la classe</label>
                <input required autoFocus className="form-input" placeholder="Ex: Boissons" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optionnel)</label>
                <input className="form-input" placeholder="Ex: Sodas, jus, eaux..." value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsCatModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">{editingCat ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUBCATEGORY */}
      {isSubModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSubModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingSub ? 'Modifier la sous-classe' : 'Nouvelle sous-classe'}</div>
              <button className="icon-btn" onClick={() => setIsSubModalOpen(false)} style={{ width: 32, height: 32, border: 'none' }}><X size={16} /></button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Classe parente : <strong style={{ color: 'var(--text-primary)' }}>{activeParentCat?.name}</strong>
            </div>
            <form onSubmit={handleSaveSub}>
              <div className="form-group">
                <label className="form-label">Nom de la sous-classe</label>
                <input required autoFocus className="form-input" placeholder="Ex: Jus de fruits" value={subForm.name} onChange={e => setSubForm({...subForm, name: e.target.value})} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsSubModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">{editingSub ? 'Enregistrer' : 'Ajouter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BRAND */}
      {isBrandModalOpen && (
        <div className="modal-overlay" onClick={() => setIsBrandModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingBrand ? 'Modifier la marque' : 'Nouvelle marque'}</div>
              <button className="icon-btn" onClick={() => setIsBrandModalOpen(false)} style={{ width: 32, height: 32, border: 'none' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveBrand}>
              <div className="form-group">
                <label className="form-label">Nom de la marque</label>
                <input required autoFocus className="form-input" placeholder="Ex: Coca-Cola" value={brandForm.name} onChange={e => setBrandForm({...brandForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Logo de la marque</label>
                <CloudinaryUpload
                  value={brandForm.imageUrl}
                  onChange={(url: string) => setBrandForm(prev => ({ ...prev, imageUrl: url }))}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsBrandModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">{editingBrand ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
