// app/admin/(dashboard)/settings/estoque/components/IngredientsTab.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { Ingredient, UnitOfMeasure, UNIT_LABELS } from '@/types/stock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function IngredientsTab() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<UnitOfMeasure>('kg');
  const [averageCost, setAverageCost] = useState('');

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'ingredients'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Ingredient));
      setIngredients(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenDialog = (item?: Ingredient) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setUnit(item.unit);
      setAverageCost(item.averageCost.toString());
    } else {
      setEditingItem(null);
      setName('');
      setUnit('kg');
      setAverageCost('0');
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Nome é obrigatório");
    const cost = parseFloat(averageCost);
    if (isNaN(cost) || cost < 0) return toast.error("Custo inválido");

    setIsSaving(true);
    try {
      const data = {
        name: name.trim(),
        unit,
        averageCost: cost,
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        await updateDoc(doc(db, 'ingredients', editingItem.id), data);
        toast.success("Ingrediente atualizado!");
      } else {
        await addDoc(collection(db, 'ingredients'), data);
        toast.success("Ingrediente criado!");
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar ingrediente");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza? Isso pode afetar fichas técnicas.")) return;
    try {
      await deleteDoc(doc(db, 'ingredients', id));
      toast.success("Ingrediente removido");
    } catch (error) {
      toast.error("Erro ao remover");
    }
  };

  if (loading) return <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-brand-dark-green">Lista de Ingredientes</h3>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" /> Novo Ingrediente
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Custo Médio (Atual)</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                  Nenhum ingrediente cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              ingredients.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{UNIT_LABELS[item.unit]}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.averageCost)}
                    <span className="text-xs text-muted-foreground"> / {item.unit}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                      <Pencil className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Ingrediente' : 'Novo Ingrediente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Ovos, Farinha de Trigo..." value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidade de Medida</Label>
                <Select value={unit} onValueChange={(v: UnitOfMeasure) => setUnit(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(UNIT_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Custo Atual (por {unit})</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={averageCost} 
                  onChange={e => setAverageCost(e.target.value)}
                  placeholder="0.00" 
                />
                <p className="text-[10px] text-muted-foreground">
                  Este valor será atualizado automaticamente pelas compras.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}