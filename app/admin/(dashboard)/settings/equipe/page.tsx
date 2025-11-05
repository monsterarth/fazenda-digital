// app/admin/(dashboard)/settings/equipe/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast, Toaster } from 'sonner';
import { Loader2, UserPlus, Trash2, Edit } from 'lucide-react';
// ## INÍCIO DA CORREÇÃO ##
// Substituído 'StaffProfile' e 'StaffRole' por 'StaffMember'
import { StaffMember } from '@/types/maintenance'; 
// E importa o UserRole do AuthContext
import { UserRole } from '@/context/AuthContext';
// ## FIM DA CORREÇÃO ##

// Esquema para o formulário de convite/atualização
const staffFormSchema = z.object({
  email: z.string().email("Email inválido."),
  name: z.string().min(2, "Nome é obrigatório."),
  role: z.enum(["recepcao", "marketing", "cafe", "manutencao", "guarita", "super_admin"]),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

export default function ManageEquipePage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]); // <-- CORRIGIDO
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMode, setEditMode] = useState<string | null>(null); // Armazena o UID

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
  });

  // Busca a lista de staff
  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/staff');
      const data = await response.json();
      if (response.ok) {
        setStaffList(data.staff);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Falha ao buscar equipe.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const onSubmit = async (values: StaffFormValues) => {
    setIsSubmitting(true);
    const method = editMode ? 'PUT' : 'POST';
    const endpoint = editMode ? `/api/admin/staff?uid=${editMode}` : '/api/admin/staff';
    const toastId = toast.loading(editMode ? "Atualizando membro..." : "Criando convite...");

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message, { id: toastId });
        form.reset({ email: '', name: '', role: undefined });
        setEditMode(null);
        fetchStaff(); // Atualiza a lista
      } else {
        toast.error(data.message, { id: toastId });
      }
    } catch (error: any) {
      toast.error(`Falha: ${error.message}`, { id: toastId });
    }
    setIsSubmitting(false);
  };

  const handleEdit = (staff: StaffMember) => {
    // A API/Auth não nos dá a role facilmente,
    // então o 'edit' só preenche nome/email. A role deve ser re-selecionada.
    setEditMode(staff.uid);
    form.reset({
      email: staff.email,
      name: staff.name,
      role: undefined, // Força a re-seleção da role por segurança
    });
  };
  
  // (A função de 'handleDelete' precisaria de um endpoint de API,
  // vamos focar no 'create' e 'update' por enquanto)

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-center" />
      <Card>
        <CardHeader>
          <CardTitle>{editMode ? "Editar Membro" : "Adicionar Novo Membro"}</CardTitle>
          <CardDescription>
            {editMode ? "Atualize a role e nome do membro." : "Envie um convite e defina a role para um novo membro da equipe."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} placeholder="Nome Sobrenome" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} placeholder="email@dominio.com" disabled={!!editMode} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>Função (Role)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione a função" /></SelectTrigger></FormControl><SelectContent>
                  <SelectItem value="recepcao">Recepção</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="cafe">Café</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="guarita">Guarita</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent></Select><FormMessage /></FormItem>
              )} />
              <div className="flex items-end">
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editMode ? <Edit className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />)}
                  {editMode ? "Atualizar" : "Salvar"}
                </Button>
                {editMode && <Button variant="ghost" onClick={() => { setEditMode(null); form.reset(); }} className="ml-2">Cancelar</Button>}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipe Atual</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>UID</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {staffList.map((staff) => (
                  <TableRow key={staff.uid}>
                    <TableCell>{staff.name}</TableCell>
                    <TableCell>{staff.email}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{staff.uid}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(staff)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
                      {/* <Button variant="destructive" size="sm" className="ml-2"><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button> */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}