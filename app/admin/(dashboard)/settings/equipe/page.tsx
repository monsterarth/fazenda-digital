// app/admin/(dashboard)/settings/equipe/page.tsx

"use client";

import React, { useState, useEffect, useMemo } from 'react'; // ## CORRIGIDO (removido o '_') ##
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
import { Loader2, UserPlus, Trash2, Edit, UserX, Eye, EyeOff, KeyRound } from 'lucide-react';
import { StaffMember } from '@/types/maintenance'; 
import { UserRole } from '@/context/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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

const staffFormSchema = z.object({
  email: z.string().email("Email inválido."),
  name: z.string().min(2, "Nome é obrigatório."),
  role: z.enum(["recepcao", "marketing", "cafe", "manutencao", "guarita", "super_admin"]),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres.").optional(),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

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
  const [editMode, setEditMode] = useState<string | null>(null); 
  const [hideGuests, setHideGuests] = useState(true); 
  const [showPassword, setShowPassword] = useState(false);
  
  const [isResetting, setIsResetting] = useState(false);
  const [resettingUser, setResettingUser] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      role: undefined,
    }
  });

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

  const filteredStaffList = useMemo(() => {
    if (hideGuests) {
      return staffList.filter(staff => staff.role !== null);
    }
    return staffList;
  }, [staffList, hideGuests]);

  // Submit para CRIAR ou EDITAR (Nome/Role)
  const onSubmit = async (values: StaffFormValues) => {
    setIsSubmitting(true);
    
    if (!editMode && (!values.password || values.password.length < 6)) {
      toast.error("A senha é obrigatória e deve ter no mínimo 6 caracteres.");
      setIsSubmitting(false);
      return; 
    }

    let dataToSend: any = values;
    if (editMode) {
      const { password, ...editData } = values;
      dataToSend = editData;
    }

    const method = editMode ? 'PUT' : 'POST';
    const endpoint = editMode ? `/api/admin/staff?uid=${editMode}` : '/api/admin/staff';
    const toastId = toast.loading(editMode ? "Atualizando membro..." : "Criando membro...");

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend), 
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message, { id: toastId });
        form.reset({ email: '', name: '', role: undefined, password: '' });
        setEditMode(null);
        fetchStaff(); 
      } else {
        toast.error(data.message, { id: toastId });
      }
    } catch (error: any) {
      toast.error(`Falha: ${error.message}`, { id: toastId });
    }
    setIsSubmitting(false);
  };

  // ## CORRIGIDO: Adicionado tipo 'StaffMember' ##
  const handleEdit = (staff: StaffMember) => {
    setEditMode(staff.uid);
    form.reset({
      email: staff.email,
      name: staff.name,
      role: staff.role || undefined,
      password: '', 
    });
  };

  const handleDelete = async (uid: string) => {
    const toastId = toast.loading("Excluindo usuário...");
    try {
      const response = await fetch(`/api/admin/staff?uid=${uid}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message, { id: toastId });
        fetchStaff(); 
      } else {
        toast.error(data.message, { id: toastId });
      }
    } catch (error: any) {
      toast.error(`Falha: ${error.message}`, { id: toastId });
    }
  };

  const handleResetPassword = async () => {
    if (!resettingUser || newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setIsResetting(true);
    const toastId = toast.loading("Redefinindo senha...");

    try {
      const response = await fetch(`/api/admin/staff?uid=${resettingUser.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }), // Envia SÓ a senha
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message, { id: toastId });
        setResettingUser(null);
        setNewPassword("");
        setShowNewPassword(false);
      } else {
        toast.error(data.message, { id: toastId });
      }
    } catch (error: any) {
      toast.error(`Falha: ${error.message}`, { id: toastId });
    }
    setIsResetting(false);
  };


  const clearForm = () => {
    setEditMode(null);
    form.reset({ email: '', name: '', role: undefined, password: '' });
  }

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-center" />
      
      {/* --- Formulário Principal (Criar / Editar) --- */}
      <Card>
        <CardHeader>
          <CardTitle>{editMode ? "Editar Membro" : "Adicionar Novo Membro"}</CardTitle>
          <CardDescription>
            {editMode ? "Atualize a role e nome do membro." : "Crie um novo membro da equipe com email, senha e função."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {!editMode && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha Provisória</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              {...field}
                              placeholder="Mínimo 6 caracteres"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <div className="flex items-end justify-start pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editMode ? <Edit className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />)}
                  {editMode ? "Atualizar" : "Salvar Novo Membro"}
                </Button>
                {editMode && <Button variant="ghost" onClick={clearForm} className="ml-2">Cancelar</Button>}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* --- Tabela da Equipe Atual --- */}
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
            <Label htmlFor="hide-guests">Ocultar hóspedes (sem função)</Label>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="animate-spin" />
            </div>
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
                {/* ## CORRIGIDO: Adicionado tipo 'StaffMember' (isso corrige o erro da linha 330) ## */}
                {filteredStaffList.map((staff: StaffMember) => (
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
                    <TableCell className="text-right space-x-2">
                      {/* Botão Editar */}
                      <Button variant="outline" size="icon" onClick={() => handleEdit(staff)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      {/* Botão Resetar Senha */}
                      <Button variant="outline" size="icon" onClick={() => setResettingUser(staff)} disabled={staff.role === 'super_admin'}>
                        <KeyRound className="h-4 w-4" />
                      </Button>

                      {/* Botão Excluir (com Dialog) */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
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

      {/* Dialog para Resetar Senha */}
      <AlertDialog open={!!resettingUser} onOpenChange={(open) => {
        if (!open) {
          setResettingUser(null);
          setNewPassword("");
          setShowNewPassword(false);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Redefinir senha para {resettingUser?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Digite uma nova senha provisória para {resettingUser?.email}. O usuário deverá usá-la para o próximo login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="newPassword">Nova Senha Provisória</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword} disabled={isResetting || newPassword.length < 6}>
              {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Redefinição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}