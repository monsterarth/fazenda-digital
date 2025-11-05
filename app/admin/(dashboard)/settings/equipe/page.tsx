// app/admin/(dashboard)/settings/equipe/page.tsx

"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { Loader2, UserPlus, Trash2, Edit, UserX } from 'lucide-react';
import { StaffMember } from '@/types/maintenance'; 
import { UserRole } from '@/context/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
// ## INÍCIO DA CORREÇÃO ##
import { Label } from '@/components/ui/label'; // <-- Label importado
// ## FIM DA CORREÇÃO ##
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Esquema para o formulário de convite/atualização
const staffFormSchema = z.object({
  email: z.string().email("Email inválido."),
  name: z.string().min(2, "Nome é obrigatório."),
  role: z.enum(["recepcao", "marketing", "cafe", "manutencao", "guarita", "super_admin"]),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

// Mapeia as roles para nomes amigáveis
const roleNames: Record<UserRole & string, string> = {
  super_admin: "Super Admin",
  recepcao: "Recepção",
  marketing: "Marketing",
  cafe: "Café",
  manutencao: "Manutenção",
  guarita: "Guarita",
};

export default function ManageEquipePage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]); 
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMode, setEditMode] = useState<string | null>(null); // Armazena o UID
  const [hideGuests, setHideGuests] = useState(true); // Estado do filtro

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

  // Filtra a lista com base no switch
  const filteredStaffList = useMemo(() => {
    if (hideGuests) {
      return staffList.filter(staff => staff.role !== null);
    }
    return staffList;
  }, [staffList, hideGuests]);

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

  // Agora preenche a role no formulário de edição
  const handleEdit = (staff: StaffMember) => {
    setEditMode(staff.uid);
    form.reset({
      email: staff.email,
      name: staff.name,
      role: staff.role || undefined, // <-- PREENCHE A ROLE!
    });
  };

  // Nova função para deletar
  const handleDelete = async (uid: string) => {
    const toastId = toast.loading("Excluindo usuário...");
    try {
      const response = await fetch(`/api/admin/staff?uid=${uid}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message, { id: toastId });
        fetchStaff(); // Atualiza a lista
      } else {
        toast.error(data.message, { id: toastId });
      }
    } catch (error: any) {
      toast.error(`Falha: ${error.message}`, { id: toastId });
    }
  };

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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Equipe Atual</CardTitle>
            <CardDescription>Lista de todos os usuários com acesso ao sistema.</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="hide-guests"
              checked={hideGuests}
              onCheckedChange={setHideGuests}
            />
            {/* ## INÍCIO DA CORREÇÃO ## */}
            <Label htmlFor="hide-guests">Ocultar hóspedes (sem função)</Label>
            {/* ## FIM DA CORREÇÃO ## */}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função (Role)</TableHead>
                <TableHead>UID</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredStaffList.map((staff) => (
                  <TableRow key={staff.uid}>
                    <TableCell>{staff.name}</TableCell>
                    <TableCell>{staff.email}</TableCell>
                    <TableCell>
                      {staff.role ? (
                        <Badge>{roleNames[staff.role] || staff.role}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Hóspede</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{staff.uid}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(staff)} className="mr-2">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           {/* Só permite excluir se não for 'super_admin' (segurança) */}
                          <Button variant="destructive" size="icon" disabled={staff.role === 'super_admin'}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir {staff.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação é permanente e removerá o usuário ({staff.email}) do sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(staff.uid)}>
                              Sim, excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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