// app/admin/(dashboard)/settings/estoque/components/SuppliersTab.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { Supplier, SupplierProduct, Ingredient, UNIT_LABELS } from '@/types/stock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Plus, Pencil, Trash2, Loader2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

export function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Supplier Modal State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', phone: '' });
  
  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);
  const [productsMap, setProductsMap] = useState<Record<string, SupplierProduct[]>>({});
  
  // Product Form
  const [productForm, setProductForm] = useState({
    ingredientId: '',
    name: '',
    price: '',
    packageQuantity: ''
  });

  // Load Suppliers and Ingredients
  useEffect(() => {
    if (!db) return;
    
    const qSuppliers = query(collection(db, 'suppliers'), orderBy('name'));
    const unsubSuppliers = onSnapshot(qSuppliers, (snap) => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier)));
      setLoading(false);
    });

    const qIngredients = query(collection(db, 'ingredients'), orderBy('name'));
    const unsubIngredients = onSnapshot(qIngredients, (snap) => {
      setIngredients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ingredient)));
    });

    return () => { unsubSuppliers(); unsubIngredients(); };
  }, []);

  // Load Products for a specific supplier (when accordion opens usually, but here loading all for simplicity logic or on demand)
  // For optimization, let's load products on demand when we expand a supplier is better, but for now let's fetch all on mount or simple effect
  // Let's fetch products for each supplier in a simple way for this MVP.
  useEffect(() => {
    if (suppliers.length === 0) return;
    // In a real app, fetch on expand. Here we'll just keep it simple.
    suppliers.forEach(async (sup) => {
      const q = query(collection(db, 'suppliers', sup.id, 'products'));
      const snap = await getDocs(q);
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() } as SupplierProduct));
      setProductsMap(prev => ({ ...prev, [sup.id]: prods }));
    });
  }, [suppliers]);

  // --- Supplier Handlers ---
  const handleSaveSupplier = async () => {
    if (!supplierForm.name.trim()) return toast.error("Nome do fornecedor obrigatório");
    try {
      const data = { ...supplierForm, createdAt: serverTimestamp() };
      if (editingSupplier) {
        await updateDoc(doc(db, 'suppliers', editingSupplier.id), data);
        toast.success("Fornecedor atualizado");
      } else {
        await addDoc(collection(db, 'suppliers'), data);
        toast.success("Fornecedor criado");
      }
      setIsSupplierModalOpen(false);
    } catch (e) { toast.error("Erro ao salvar fornecedor"); }
  };

  // --- Product Handlers ---
  const handleOpenProductModal = (supplierId: string, product?: SupplierProduct) => {
    setSelectedSupplierId(supplierId);
    if (product) {
      setEditingProduct(product);
      setProductForm({
        ingredientId: product.ingredientId,
        name: product.name,
        price: product.price.toString(),
        packageQuantity: product.packageQuantity.toString()
      });
    } else {
      setEditingProduct(null);
      setProductForm({ ingredientId: '', name: '', price: '', packageQuantity: '1' });
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!selectedSupplierId || !productForm.ingredientId || !productForm.name) return toast.error("Preencha os dados obrigatórios");
    
    const price = parseFloat(productForm.price);
    const qty = parseFloat(productForm.packageQuantity);
    if (isNaN(price) || isNaN(qty) || qty <= 0) return toast.error("Valores inválidos");

    const newUnitCost = price / qty;
    const ingredient = ingredients.find(i => i.id === productForm.ingredientId);
    
    try {
      const data = {
        supplierId: selectedSupplierId,
        ingredientId: productForm.ingredientId,
        name: productForm.name,
        price,
        packageQuantity: qty,
        lastUpdated: serverTimestamp(),
        // unit comes from ingredient usually
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'suppliers', selectedSupplierId, 'products', editingProduct.id), data);
        toast.success("Produto atualizado");
      } else {
        await addDoc(collection(db, 'suppliers', selectedSupplierId, 'products'), data);
        toast.success("Produto adicionado");
      }

      // Update Ingredient Cost Logic (Simple version: Always update to latest entry)
      if (ingredient) {
        await updateDoc(doc(db, 'ingredients', ingredient.id), {
          averageCost: newUnitCost,
          updatedAt: serverTimestamp()
        });
        toast.info(`Custo do ingrediente "${ingredient.name}" atualizado para ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newUnitCost)}/${ingredient.unit}`);
      }

      // Refresh list locally
      const q = query(collection(db, 'suppliers', selectedSupplierId, 'products'));
      const snap = await getDocs(q);
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() } as SupplierProduct));
      setProductsMap(prev => ({ ...prev, [selectedSupplierId]: prods }));

      setIsProductModalOpen(false);
    } catch (e) { toast.error("Erro ao salvar produto"); console.error(e); }
  };

  if (loading) return <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-brand-dark-green">Meus Fornecedores</h3>
        <Button onClick={() => { setEditingSupplier(null); setSupplierForm({ name: '', contact: '', phone: '' }); setIsSupplierModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Fornecedor
        </Button>
      </div>

      <div className="space-y-4">
        {suppliers.map((supplier) => (
          <Accordion type="single" collapsible key={supplier.id} className="bg-white border rounded-lg px-4">
            <AccordionItem value={supplier.id} className="border-0">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1 text-left">
                    <h4 className="font-bold text-brand-dark-green text-lg">{supplier.name}</h4>
                    <p className="text-sm text-muted-foreground">{supplier.contactName} {supplier.phone && `• ${supplier.phone}`}</p>
                  </div>
                  <div className="text-xs bg-brand-light-green text-brand-dark-green px-2 py-1 rounded-full mr-4">
                    {(productsMap[supplier.id] || []).length} produtos
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="pl-4 border-l-2 border-gray-100 space-y-4">
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <span className="text-sm font-medium text-brand-mid-green">Catálogo de Produtos</span>
                    <Button size="sm" variant="outline" onClick={() => handleOpenProductModal(supplier.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Adicionar Produto
                    </Button>
                  </div>

                  {(productsMap[supplier.id] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhum produto cadastrado para este fornecedor.</p>
                  ) : (
                    <div className="grid gap-2">
                      {(productsMap[supplier.id] || []).map(prod => {
                         const ingredient = ingredients.find(i => i.id === prod.ingredientId);
                         const unitCost = prod.price / prod.packageQuantity;
                         return (
                           <div key={prod.id} className="flex justify-between items-center p-3 border rounded bg-white shadow-sm">
                             <div>
                               <p className="font-medium text-brand-dark-green">{prod.name}</p>
                               <p className="text-xs text-muted-foreground">
                                 Vínculo: <span className="font-semibold text-brand-primary">{ingredient?.name}</span> 
                                 {' '}({prod.packageQuantity} {ingredient?.unit})
                               </p>
                             </div>
                             <div className="text-right">
                               <p className="font-bold text-brand-dark-green">
                                 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}
                               </p>
                               <p className="text-xs text-muted-foreground">
                                 ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(unitCost)}/{ingredient?.unit})
                               </p>
                             </div>
                             <Button variant="ghost" size="icon" className="ml-2" onClick={() => handleOpenProductModal(supplier.id, prod)}>
                               <Pencil className="h-3 w-3 text-gray-500" />
                             </Button>
                           </div>
                         );
                      })}
                    </div>
                  )}
                  
                  <div className="flex justify-end pt-2">
                    <Button variant="ghost" size="sm" className="text-red-500 h-8" onClick={() => {
                       if(confirm("Excluir fornecedor?")) deleteDoc(doc(db, 'suppliers', supplier.id));
                    }}>
                      <Trash2 className="h-3 w-3 mr-2" /> Excluir Fornecedor
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
      </div>

      {/* Supplier Modal */}
      <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Nome da Empresa</Label><Input value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} /></div>
            <div className="space-y-1"><Label>Nome Contato</Label><Input value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} /></div>
            <div className="space-y-1"><Label>Telefone / WhatsApp</Label><Input value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveSupplier}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingProduct ? 'Editar Produto' : 'Adicionar Produto ao Catálogo'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Ingrediente Vinculado (Sistema)</Label>
              <Select value={productForm.ingredientId} onValueChange={v => setProductForm({...productForm, ingredientId: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione o ingrediente..." /></SelectTrigger>
                <SelectContent>
                  {ingredients.map(ing => (
                    <SelectItem key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome Comercial do Produto</Label>
              <Input placeholder="Ex: Cartela 30 Ovos, Caixa Leite 12L" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço Total (R$)</Label>
                <Input type="number" placeholder="0.00" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Quantidade na Embalagem</Label>
                <Input type="number" placeholder="Ex: 30 (se for ovos un)" value={productForm.packageQuantity} onChange={e => setProductForm({...productForm, packageQuantity: e.target.value})} />
                <p className="text-[10px] text-muted-foreground">
                  Quantidade na unidade do ingrediente.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveProduct}>Salvar Produto</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}