// app/admin/(dashboard)/settings/cafe/page.tsx

"use client";

import { Badge } from '@/components/ui/badge';
import React, { useState, useEffect, useMemo } from 'react';
import * as firestore from "firebase/firestore";
import { getFirebaseDb, uploadFile } from "@/lib/firebase";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast, Toaster } from 'sonner';

import { useAuth } from '@/context/AuthContext';
import { BreakfastMenuCategory, BreakfastMenuItem, Flavor, Property } from "@/types";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, Plus, Edit, Trash2, Loader2, Utensils, User, ShoppingBasket, Sparkles, Clock } from "lucide-react";
import { cn } from '@/lib/utils';
import Image from 'next/image';

// --- COMPONENTES REORDENÁVEIS (Sem alterações) ---

function SortableItem({ item, onEditItem, onDeleteItem }: { item: BreakfastMenuItem, onEditItem: () => void, onDeleteItem: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <tr ref={setNodeRef} style={style} className="border-b bg-white hover:bg-slate-50">
            <td className="p-3 w-10"><GripVertical className="w-5 h-5 text-gray-400 cursor-grab" {...attributes} {...listeners} /></td>
            <td className="p-3 flex items-center gap-4">
                {item.imageUrl && (
                    <Image src={item.imageUrl} alt={item.name} width={48} height={48} className="rounded-md object-cover w-12 h-12" />
                )}
                <div>
                    <span className="font-medium text-slate-800">{item.name}</span>
                    {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
                </div>
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
                    <div>
                        <h4 className="text-lg font-semibold text-slate-900">{category.name}</h4>
                        <Badge variant="secondary" className="mt-1">
                            {category.type === 'individual' ?
                                <><User className="w-3 h-3 mr-1.5" />Seleção por Hóspede</> :
                                <><ShoppingBasket className="w-3 h-3 mr-1.5" />Para a Cesta</>
                            }
                        </Badge>
                    </div>
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
    const { isAdmin } = useAuth();
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [menuCategories, setMenuCategories] = useState<BreakfastMenuCategory[]>([]);
    const [loading, setLoading] = useState(true);

    // ++ NOVO ESTADO PARA HORÁRIOS DE ENTREGA
    const [deliveryTimes, setDeliveryTimes] = useState<string[]>([]);
    const [newTime, setNewTime] = useState("");

    const [categoryModal, setCategoryModal] = useState<{ open: boolean; data?: BreakfastMenuCategory }>({ open: false });
    const [itemModal, setItemModal] = useState<{ open: boolean; categoryId?: string; data?: Partial<BreakfastMenuItem> & { flavors?: Flavor[] } }>({ open: false });
    const [isSaving, setIsSaving] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const menuId = "default_breakfast";
    const propertyId = "default"; // ID do documento de propriedades

    useEffect(() => {
        if (!isAdmin) {
            setLoading(false);
            return;
        }

        async function initializeDbAndListeners() {
            const firestoreDb = await getFirebaseDb();
            if (!firestoreDb) { setLoading(false); return; }
            setDb(firestoreDb);

            // Listener para o Cardápio
            const menuRef = firestore.doc(firestoreDb, "breakfastMenus", menuId);
            const categoriesQuery = firestore.query(firestore.collection(menuRef, "categories"), firestore.orderBy("order", "asc"));
            const unsubscribeMenu = firestore.onSnapshot(categoriesQuery, async (snapshot) => {
                setLoading(true);
                const categoriesData = await Promise.all(snapshot.docs.map(async (categoryDoc) => {
                    const categoryData = categoryDoc.data();
                    const itemsQuery = firestore.query(firestore.collection(categoryDoc.ref, "items"), firestore.orderBy("order", "asc"));
                    const itemsSnapshot = await firestore.getDocs(itemsQuery);
                    const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as BreakfastMenuItem);
                    return { id: categoryDoc.id, ...categoryData, items } as BreakfastMenuCategory;
                }));
                setMenuCategories(categoriesData);
                setLoading(false);
            }, (error) => { console.error("Error loading menu:", error); setLoading(false); toast.error("Falha ao carregar o cardápio."); });

            // ++ NOVO LISTENER PARA AS PROPRIEDADES (HORÁRIOS)
            const propertyRef = firestore.doc(firestoreDb, "properties", propertyId);
            const unsubscribeProperty = firestore.onSnapshot(propertyRef, (doc) => {
                if (doc.exists()) {
                    const propertyData = doc.data() as Property;
                    setDeliveryTimes(propertyData.breakfast?.deliveryTimes || []);
                }
            }, (error) => { console.error("Error loading property:", error); toast.error("Falha ao carregar horários de entrega."); });


            return () => {
                unsubscribeMenu();
                unsubscribeProperty();
            };
        }
        const unsubscribePromise = initializeDbAndListeners();
        return () => { unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe()); };
    }, [isAdmin]);

    // ++ NOVAS FUNÇÕES PARA GERENCIAR HORÁRIOS
    const handleAddDeliveryTime = async () => {
        if (!db || !newTime.trim()) return;
        if (deliveryTimes.includes(newTime.trim())) {
            toast.warning("Este horário já existe.");
            return;
        }
        const updatedTimes = [...deliveryTimes, newTime.trim()].sort();
        try {
            const propertyRef = firestore.doc(db, "properties", propertyId);
            await firestore.updateDoc(propertyRef, { "breakfast.deliveryTimes": updatedTimes });
            toast.success("Horário adicionado!");
            setNewTime("");
        } catch (error) {
            toast.error("Erro ao adicionar horário.");
            console.error(error);
        }
    };

    const handleDeleteDeliveryTime = async (timeToDelete: string) => {
        if (!db) return;
        const updatedTimes = deliveryTimes.filter(time => time !== timeToDelete);
        try {
            const propertyRef = firestore.doc(db, "properties", propertyId);
            await firestore.updateDoc(propertyRef, { "breakfast.deliveryTimes": updatedTimes });
            toast.success("Horário removido!");
        } catch (error) {
            toast.error("Erro ao remover horário.");
            console.error(error);
        }
    };

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
        const name = formData.get("name") as string;
        const type = formData.get("type") as 'individual' | 'collective';
        const limitType = formData.get("limitType") as 'none' | 'per_item' | 'per_category';
        const limitGuestMultiplier = parseInt(formData.get("limitGuestMultiplier") as string || '1', 10);

        if (!name || !type) { toast.error("Nome e Tipo são obrigatórios."); return; }
        setIsSaving(true);

        const collectionRef = firestore.collection(db, "breakfastMenus", menuId, "categories");
        const dataToSave = {
            name,
            type,
            limitType: type === 'collective' ? limitType : 'none',
            limitGuestMultiplier: type === 'collective' ? limitGuestMultiplier : 1,
        };

        try {
            if (categoryModal.data?.id) {
                await firestore.updateDoc(firestore.doc(collectionRef, categoryModal.data.id), dataToSave);
                toast.success("Categoria atualizada!");
            } else {
                await firestore.addDoc(collectionRef, { ...dataToSave, order: menuCategories.length });
                toast.success("Categoria criada!");
            }
            setCategoryModal({ open: false });
        } catch (error) { toast.error("Erro ao salvar categoria."); }
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
        const imageFile = formData.get("imageUrl") as File;
        let imageUrl = itemModal.data.imageUrl || '';

        setIsSaving(true);
        const toastId = toast.loading("Salvando item...");

        try {
            if (imageFile && imageFile.size > 0) {
                toast.loading("Enviando imagem...", { id: toastId });
                imageUrl = await uploadFile(imageFile, `menu_items/${Date.now()}_${imageFile.name}`);
            }

            const itemData = {
                name: formData.get("name") as string,
                description: formData.get("description") as string,
                available: formData.get("available") === "on",
                imageUrl: imageUrl,
                flavors: itemModal.data.flavors?.filter(f => f.name.trim() !== '') || []
            };

            if (!itemData.name) {
                toast.error("O nome do item é obrigatório.", { id: toastId });
                setIsSaving(false);
                return;
            }

            toast.loading("Salvando dados do item...", { id: toastId });
            const collectionRef = firestore.collection(db, "breakfastMenus", menuId, "categories", itemModal.categoryId, "items");
            if (itemModal.data.id) {
                await firestore.updateDoc(firestore.doc(collectionRef, itemModal.data.id), itemData);
                toast.success("Item atualizado!", { id: toastId });
            } else {
                const category = menuCategories.find(c => c.id === itemModal.categoryId);
                await firestore.addDoc(collectionRef, { ...itemData, order: category?.items.length || 0 });
                toast.success("Item criado!", { id: toastId });
            }
            setItemModal({ open: false });
        } catch (error) {
            console.error("Error saving item:", error);
            toast.error("Erro ao salvar o item.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteItem = async (categoryId: string, itemId: string) => {
        if (!db) return; if (!confirm("Tem certeza que deseja excluir este item?")) return;
        try {
            const itemRef = firestore.doc(db, "breakfastMenus", menuId, "categories", categoryId, "items", itemId);
            await firestore.deleteDoc(itemRef);
            toast.success("Item excluído com sucesso!");
        } catch (error) { console.error("Error deleting item:", error); toast.error("Erro ao excluir item."); }
    };

    const handleAddFlavor = () => {
        const newFlavor: Flavor = { id: `flavor_${Date.now()}`, name: '', available: true };
        setItemModal(prev => ({ ...prev, data: { ...prev.data, flavors: [...(prev.data?.flavors || []), newFlavor] } }));
    };
    const handleUpdateFlavor = (id: string, name: string) => {
        setItemModal(prev => ({ ...prev, data: { ...prev.data, flavors: (prev.data?.flavors || []).map(f => f.id === id ? { ...f, name } : f) } }));
    };
    const handleDeleteFlavor = (id: string) => {
        setItemModal(prev => ({ ...prev, data: { ...prev.data, flavors: (prev.data?.flavors || []).filter(f => f.id !== id) } }));
    };

    return (
        <div className="container mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Toaster richColors position="top-center" />
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Utensils /> Cardápio do Café da Manhã</CardTitle>
                            <CardDescription>Adicione, edite e reordene as categorias e itens do café da manhã.</CardDescription>
                        </div>
                        <Button onClick={() => setCategoryModal({ open: true, data: undefined })}><Plus className="w-4 h-4 mr-2" />Nova Categoria</Button>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-slate-400 animate-spin" /></div>
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
                                                onAddItem={(catId) => setItemModal({ open: true, categoryId: catId, data: { name: '', description: '', available: true, flavors: [] } })}
                                                onEditItem={(catId, item) => setItemModal({ open: true, categoryId: catId, data: item })}
                                                onDeleteItem={handleDeleteItem}
                                                onItemsDragEnd={(event, categoryId) => handleDragEnd(event, 'items', categoryId)}
                                            />
                                        ))}
                                    </SortableContext>
                                </div>
                            </DndContext>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ++ NOVO CARD PARA HORÁRIOS ++ */}
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Clock /> Horários de Entrega</CardTitle>
                        <CardDescription>Defina os horários em que os hóspedes podem receber o café da manhã.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2 mb-4">
                            <Input
                                type="time"
                                value={newTime}
                                onChange={(e) => setNewTime(e.target.value)}
                                placeholder="HH:MM"
                            />
                            <Button onClick={handleAddDeliveryTime} disabled={!newTime.trim()}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {deliveryTimes.length > 0 ? (
                                deliveryTimes.map(time => (
                                    <div key={time} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                        <span className="font-mono">{time}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => handleDeleteDeliveryTime(time)}
                                        >
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Nenhum horário definido.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={categoryModal.open} onOpenChange={(open) => setCategoryModal({ open, data: open ? categoryModal.data : undefined })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{categoryModal.data ? "Editar" : "Adicionar"} Categoria</DialogTitle>
                        <DialogDescription>Crie uma seção do cardápio e defina como os itens serão escolhidos.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveCategory} className="space-y-6 pt-4">
                        <div>
                            <Label htmlFor="name">Nome da Categoria</Label>
                            <Input id="name" name="name" defaultValue={categoryModal.data?.name || ""} required />
                        </div>
                        <div>
                            <Label>Tipo de Seleção</Label>
                            <RadioGroup name="type" defaultValue={categoryModal.data?.type || 'collective'} className="flex gap-4 pt-2" required>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="individual" id="r-individual" />
                                    <Label htmlFor="r-individual" className="font-normal">Individual (por hóspede)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="collective" id="r-collective" />
                                    <Label htmlFor="r-collective" className="font-normal">Coletiva (para a cesta)</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <div className="space-y-4 pt-4 border-t">
                            <Label>Regras de Limite (Apenas para categorias coletivas)</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="limitType">Tipo de Limite</Label>
                                    <Select name="limitType" defaultValue={categoryModal.data?.limitType || 'none'}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhum</SelectItem>
                                            <SelectItem value="per_item">Por Item (Ex: Bebidas)</SelectItem>
                                            <SelectItem value="per_category">Por Categoria (Ex: Pães)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="limitGuestMultiplier">Multiplicador por Hóspede</Label>
                                    <Input name="limitGuestMultiplier" type="number" defaultValue={categoryModal.data?.limitGuestMultiplier || 1} min="1" />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">Ex: Para 2 pães por hóspede, use "Por Categoria" e Multiplicador "2".</p>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setCategoryModal({ open: false })}>Cancelar</Button>
                            <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={itemModal.open} onOpenChange={(open) => setItemModal({ open, data: open ? itemModal.data : undefined, categoryId: open ? itemModal.categoryId : undefined })}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{itemModal.data?.id ? "Editar" : "Adicionar"} Item</DialogTitle>
                        <DialogDescription>Adicione ou edite um produto, sua foto e seus sabores.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveItem} className="space-y-4 pt-4">
                        <div>
                            <Label htmlFor="name">Nome do Item</Label>
                            <Input id="name" name="name" defaultValue={itemModal.data?.name || ""} required />
                        </div>
                        <div>
                            <Label htmlFor="description">Descrição (opcional)</Label>
                            <Input id="description" name="description" defaultValue={itemModal.data?.description || ""} />
                        </div>
                        <div>
                            <Label htmlFor="imageUrl">Foto do Item</Label>
                            {itemModal.data?.imageUrl && <Image src={itemModal.data.imageUrl} alt="Preview" width={80} height={80} className="my-2 rounded-md object-cover" />}
                            <Input id="imageUrl" name="imageUrl" type="file" accept="image/*" />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="available" name="available" defaultChecked={itemModal.data?.available ?? true} />
                            <Label htmlFor="available">Disponível para seleção</Label>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex justify-between items-center">
                                <Label className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" />Sabores / Variações</Label>
                                <Button type="button" size="sm" variant="outline" onClick={handleAddFlavor}><Plus className="w-4 h-4 mr-2" />Adicionar Sabor</Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Se um item não tiver sabores, deixe esta seção em branco.</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {(itemModal.data?.flavors || []).map(flavor => (
                                    <div key={flavor.id} className="flex items-center gap-2">
                                        <Input
                                            placeholder="Nome do Sabor (Ex: Queijo)"
                                            value={flavor.name}
                                            onChange={(e) => handleUpdateFlavor(flavor.id, e.target.value)}
                                        />
                                        <Button type="button" size="icon" variant="ghost" onClick={() => handleDeleteFlavor(flavor.id)}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setItemModal({ open: false })}>Cancelar</Button>
                            <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}