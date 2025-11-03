// app/admin/(dashboard)/settings/equipe/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { StaffProfile, StaffRole } from '@/types/maintenance';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Schema para convidar novo funcionário
const staffFormSchema = z.object({
  name: z.string().min(3, "O nome é obrigatório."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  role: z.enum(["recepcao", "marketing", "cafe", "manutencao", "guarita"], {
    required_error: "A função é obrigatória."
  }),
});

type StaffFormData = z.infer<typeof staffFormSchema>;

const roleNames: Record<StaffRole, string> = {
  super_admin: 'Super Admin',
  recepcao: 'Recepção',
  marketing: 'Marketing',
  cafe: 'Café',
  manutencao: 'Manutenção',
  guarita: 'Guarita',
};

export default function StaffManagementPage() {
  const { getIdToken } = useAuth();
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  // Buscar a lista de funcionários existentes
  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);
      const db = await getFirebaseDb();
      const q = query(collection(db, 'staff_profiles'), orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const list = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as StaffProfile));
        setStaffList(list);
        setLoading(false);
      }, (error) => {
        console.error("Erro ao buscar funcionários:", error);
        toast.error("Falha ao carregar a lista de funcionários.", { description: error.message });
        setLoading(false);
      });

      return () => unsubscribe();
    };
    fetchStaff();
  }, []);

  // Função para chamar nossa API e criar o usuário
  const onSubmit = async (data: StaffFormData) => {
    setIsSubmitting(true);
    const toastId = toast.loading("Criando novo funcionário...");

    try {
      const idToken = await getIdToken();
      if (!idToken) {
        throw new Error("Token de autenticação não encontrado.");
      }

      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Falha na resposta da API.');
      }

      toast.success(result.message || "Funcionário criado com sucesso!", { id: toastId });
      form.reset();

    } catch (error) {
      console.error(error);
      toast.error("Falha ao criar funcionário.", { id: toastId, description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Equipe</h1>
          <p className="text-muted-foreground">
            Convide novos funcionários e gerencie as permissões de acesso.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Formulário de Convidar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Convidar Novo Funcionário
            </CardTitle>
            <CardDescription>
              Isso criará um novo usuário e definirá suas permissões.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do funcionário" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@dominio.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha Temporária</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormDescription>
                        O funcionário poderá alterar esta senha depois.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Função (Role)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma permissão..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="recepcao">Recepção</SelectItem>
                          <SelectItem value="manutencao">Manutenção</SelectItem>
                          <SelectItem value="cafe">Café</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="guarita">Guarita</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar Convite
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Coluna 2: Lista de Funcionários */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Equipe Atual</CardTitle>
            <CardDescription>
              Lista de todos os usuários com acesso ao painel de admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        Nenhum funcionário encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffList.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-medium">{staff.name}</TableCell>
                        <TableCell>{staff.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {roleNames[staff.role] || staff.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={staff.isActive ? "default" : "outline"}>
                            {staff.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}