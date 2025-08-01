"use client";

import React, { useState, useEffect, useMemo } from 'react';
import * as firestore from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast, Toaster } from 'sonner';

import { BreakfastMenuCategory, BreakfastMenuItem } from "@/types";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, Plus, Edit, Trash2, Loader2, Utensils } from "lucide-react";
import { cn } from '@/lib/utils';

// --- COMPONENTES REORDENÁVEIS (Adaptados para Breakfast) ---

function SortableItem({ item, onEditItem, onDeleteItem }: { item: BreakfastMenuItem, onEditItem: () => void, onDeleteItem: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr ref={setNodeRef} style={style} className="border-b bg-white hover:bg-slate-50">
      <td className="p-3 w-10"><GripVertical className="w-5 h-5 text-gray-400 cursor-grab" {...attributes} {...listeners} /></td>
      <td className="p-3">
        <span className="font-medium text-slate-800">{item.name}</span>
        {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
      </td>
      <td className="p-3">
        <Badge variant={item.available ? 'default' : 'destructive'} className={cn(item.available ? "bg-green-600" : "")}>
            {item.available ? "Ativo" : "Inativo"}
        </Badge>
      </td>
      <td className="p-3 text-right space-x-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEditItem}><Edit className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDeleteItem}><Trash2 className="w-4 h-4 text-red-500" /></Button>
      </td>
    </tr>
  );
}

function SortableCategory({ category, onAddItem, onEditCategory, onDeleteCategory, onItemsDragEnd, onEditItem, onDeleteItem }: {
  category: BreakfastMenuCategory;
  onAddItem: (categoryId: string) => void;
  onEditCategory: (category: BreakfastMenuCategory) => void;
  onDeleteCategory: (categoryId: string) => void;
  onItemsDragEnd: (event: DragEndEvent, categoryId: string) => void;
  onEditItem: (categoryId: string, item: BreakfastMenuItem) => void;
  onDeleteItem: (categoryId: string, itemId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: category.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const itemIds = useMemo(() => category.items.map((item) => item.id), [category.items]);
  const sensors = useSensors(useSensor(PointerSensor));

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg">
        <div className="flex items-center gap-4">
          <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" {...attributes} {...listeners} />
          <h4 className="text-lg font-semibold text-slate-900">{category.name}</h4>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onAddItem(category.id)}><Plus className="w-4 h-4 mr-1" />Adicionar Item</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditCategory(category)}><Edit className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDeleteCategory(category.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
        </div>
      </div>
      <div className="p-2 overflow-x-auto">
        <DndContext sensors={sensors} onDragEnd={(e) => onItemsDragEnd(e, category.id)} collisionDetection={closestCenter}>
          <table className="w-full">
            <tbody>
              <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                {category.items.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    onEditItem={() => onEditItem(category.id, item)}
                    onDeleteItem={() => onDeleteItem(category.id, item.id)}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  );
}

// --- PÁGINA PRINCIPAL ---
export default function ManageBreakfastMenuPage() {
  const [db, setDb] = useState<firestore.Firestore | null>(null);
  const [menuCategories, setMenuCategories] = useState<BreakfastMenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [categoryModal, setCategoryModal] = useState<{ open: boolean; data?: BreakfastMenuCategory }>({ open: false });
  const [itemModal, setItemModal] = useState<{ open: boolean; categoryId?: string; data?: Partial<BreakfastMenuItem> }>({ open: false });
  const [isSaving, setIsSaving] = useState(false);
  
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const menuId = "default_breakfast"; // Hardcoded para o MVP

  useEffect(() => {
    async function initializeDbAndListener() {
      const firestoreDb = await getFirebaseDb();
      if (!firestoreDb) { setLoading(false); return; }
      setDb(firestoreDb);

      const menuRef = firestore.doc(firestoreDb, "breakfastMenus", menuId);
      const categoriesQuery = firestore.query(firestore.collection(menuRef, "categories"), firestore.orderBy("order", "asc"));
      
      const unsubscribe = firestore.onSnapshot(categoriesQuery, async (snapshot) => {
        setLoading(true);
        const categoriesData = await Promise.all(snapshot.docs.map(async (categoryDoc) => {
          const categoryData = categoryDoc.data();
          const itemsQuery = firestore.query(firestore.collection(categoryDoc.ref, "items"), firestore.orderBy("order", "asc"));
          const itemsSnapshot = await firestore.getDocs(itemsQuery);
          const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BreakfastMenuItem[];
          return { id: categoryDoc.id, ...categoryData, items } as BreakfastMenuCategory;
        }));
        setMenuCategories(categoriesData);
        setLoading(false);
      }, (error) => { console.error("Error loading menu:", error); setLoading(false); toast.error("Falha ao carregar o cardápio."); });
      
      return unsubscribe;
    }
    const unsubscribePromise = initializeDbAndListener();
    return () => { unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe()); };
  }, []);
  
  const handleDragEnd = async (event: DragEndEvent, context: 'categories' | 'items', parentId?: string) => {
    if (!db) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const menuRef = firestore.doc(db, "breakfastMenus", menuId);

    if (context === 'categories') {
        const oldIndex = menuCategories.findIndex((c) => c.id === active.id);
        const newIndex = menuCategories.findIndex((c) => c.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const newCategories = arrayMove(menuCategories, oldIndex, newIndex);
        setMenuCategories(newCategories);
        const batch = firestore.writeBatch(db);
        newCategories.forEach((cat, index) => batch.update(firestore.doc(menuRef, "categories", cat.id), { order: index }));
        await batch.commit();
        toast.success("Ordem das categorias salva!");
    } else if (context === 'items' && parentId) {
        const category = menuCategories.find(c => c.id === parentId);
        if (!category) return;
        const oldIndex = category.items.findIndex((i) => i.id === active.id);
        const newIndex = category.items.findIndex((i) => i.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const newItems = arrayMove(category.items, oldIndex, newIndex);
        setMenuCategories(menuCategories.map(c => c.id === parentId ? { ...c, items: newItems } : c));
        const batch = firestore.writeBatch(db);
        newItems.forEach((item, index) => batch.update(firestore.doc(menuRef, "categories", parentId, "items", item.id), { order: index }));
        await batch.commit();
        toast.success("Ordem dos itens salva!");
    }
  };

  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!db) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string; if (!name) return;
    setIsSaving(true);
    const collectionRef = firestore.collection(db, "breakfastMenus", menuId, "categories");
    try {
      if (categoryModal.data) {
        await firestore.updateDoc(firestore.doc(collectionRef, categoryModal.data.id), { name });
        toast.success("Categoria atualizada!");
      } else {
        await firestore.addDoc(collectionRef, { name, order: menuCategories.length });
        toast.success("Categoria criada!");
      }
      setCategoryModal({ open: false });
    } catch (error) { console.error("Error saving category:", error); toast.error("Erro ao salvar categoria."); }
    finally { setIsSaving(false); }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!db) return; if (!confirm("Tem certeza? Isso excluirá todos os itens dentro desta categoria.")) return;
    try {
        const categoryRef = firestore.doc(db, "breakfastMenus", menuId, "categories", categoryId);
        const itemsSnapshot = await firestore.getDocs(firestore.collection(categoryRef, "items"));
        const batch = firestore.writeBatch(db);
        itemsSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.delete(categoryRef);
        await batch.commit();
        toast.success("Categoria e seus itens foram excluídos!");
    } catch (error) { console.error("Error deleting category:", error); toast.error("Erro ao excluir categoria."); }
  };

  const handleSaveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    if (!db || !itemModal.categoryId || !itemModal.data) return;
    const formData = new FormData(e.currentTarget);
    const itemData = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        available: formData.get("available") === "on",
    };
    if (!itemData.name) return;

    setIsSaving(true);
    const collectionRef = firestore.collection(db, "breakfastMenus", menuId, "categories", itemModal.categoryId, "items");
    try {
      if (itemModal.data.id) {
        await firestore.updateDoc(firestore.doc(collectionRef, itemModal.data.id), itemData);
        toast.success("Item atualizado!");
      } else {
        const category = menuCategories.find(c => c.id === itemModal.categoryId);
        await firestore.addDoc(collectionRef, { ...itemData, order: category?.items.length || 0 });
        toast.success("Item criado!");
      }
      setItemModal({ open: false });
    } catch (error) { console.error("Error saving item:", error); toast.error("Erro ao salvar o item."); }
    finally { setIsSaving(false); }
  };
  
  const handleDeleteItem = async (categoryId: string, itemId: string) => {
    if (!db) return; if (!confirm("Tem certeza que deseja excluir este item?")) return;
    try {
      const itemRef = firestore.doc(db, "breakfastMenus", menuId, "categories", categoryId, "items", itemId);
      await firestore.deleteDoc(itemRef);
      toast.success("Item excluído com sucesso!");
    } catch (error) { console.error("Error deleting item:", error); toast.error("Erro ao excluir item."); }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Toaster richColors position="top-center" />
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2"><Utensils /> Cardápio do Café da Manhã</CardTitle>
                    <CardDescription>Adicione, edite e reordene as categorias e itens do café da manhã.</CardDescription>
                </div>
                <Button onClick={() => setCategoryModal({ open: true })}><Plus className="w-4 h-4 mr-2" />Nova Categoria</Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-slate-400 animate-spin"/></div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'categories')}>
                        <div className="space-y-6">
                        <SortableContext items={menuCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                            {menuCategories.map((category) => (
                              <SortableCategory
                                key={category.id}
                                category={category}
                                onEditCategory={(cat) => setCategoryModal({ open: true, data: cat })}
                                onDeleteCategory={handleDeleteCategory}
                                onAddItem={(catId) => setItemModal({ open: true, categoryId: catId, data: { name: '', description: '', available: true }})}
                                onEditItem={(catId, item) => setItemModal({ open: true, categoryId: catId, data: item })}
                                onDeleteItem={handleDeleteItem}
                                onItemsDragEnd={handleDragEnd}
                              />
                            ))}
                        </SortableContext>
                        </div>
                    </DndContext>
                )}
            </CardContent>
        </Card>

      {/* MODAL DE CATEGORIA */}
      <Dialog open={categoryModal.open} onOpenChange={(open) => setCategoryModal({ open })}><DialogContent><DialogHeader><DialogTitle>{categoryModal.data ? "Editar" : "Adicionar"} Categoria</DialogTitle><DialogDescription>Crie ou edite uma seção do seu cardápio, como "Pães e Bolos" ou "Bebidas".</DialogDescription></DialogHeader><form onSubmit={handleSaveCategory} className="space-y-4 pt-4"><div><Label htmlFor="name">Nome da Categoria</Label><Input id="name" name="name" defaultValue={categoryModal.data?.name || ""} required /></div><DialogFooter className="pt-4"><Button type="button" variant="outline" onClick={() => setCategoryModal({ open: false })}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : "Salvar"}</Button></DialogFooter></form></DialogContent></Dialog>
      
      {/* MODAL DE ITEM */}
      <Dialog open={itemModal.open} onOpenChange={(open) => setItemModal({ open })}><DialogContent><DialogHeader><DialogTitle>{itemModal.data?.id ? "Editar" : "Adicionar"} Item</DialogTitle><DialogDescription>Adicione ou edite um produto dentro de uma categoria.</DialogDescription></DialogHeader><form onSubmit={handleSaveItem} className="space-y-4 pt-4"><div><Label htmlFor="name">Nome do Item</Label><Input id="name" name="name" defaultValue={itemModal.data?.name || ""} required /></div><div><Label htmlFor="description">Descrição (opcional)</Label><Input id="description" name="description" defaultValue={itemModal.data?.description || ""} /></div><div className="flex items-center space-x-2"><Checkbox id="available" name="available" defaultChecked={itemModal.data?.available ?? true} /><Label htmlFor="available">Disponível para seleção</Label></div><DialogFooter className="pt-4"><Button type="button" variant="outline" onClick={() => setItemModal({ open: false })}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : "Salvar"}</Button></DialogFooter></form></DialogContent></Dialog>
    </div>
  );
}

// Pequeno componente Badge para status, se não existir em ui/badge
const Badge = ({ children, className, variant }: { children: React.ReactNode, className?: string, variant: 'default' | 'destructive' }) => (
    <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full', 
        variant === 'default' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
        className
    )}>{children}</span>
);