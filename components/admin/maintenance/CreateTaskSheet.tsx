// components/admin/maintenance/CreateTaskSheet.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { MaintenanceTask } from '@/types/maintenance';
import { Cabin } from '@/types'; // Importando do index.ts
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
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
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Loader2, Save } from 'lucide-react';

// Schema de validação Zod com lógica condicional
const taskFormSchema = z.object({
  title: z.string().min(3, { message: 'O título deve ter pelo menos 3 caracteres.' }),
  mainLocation: z.string().min(1, { message: 'Por favor, selecione uma área principal.' }),
  subLocation: z.string().optional(),
  customLocationName: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high'], { required_error: 'A prioridade é obrigatória.' }),
  weight: z.coerce.number().min(0, { message: 'A pontuação deve ser 0 ou maior.' }),
}).refine((data) => {
  // Validação condicional para Sub-Localização
  if (data.mainLocation === 'cabana' || data.mainLocation === 'jacuzzi') {
    return !!data.subLocation && data.subLocation.length > 0;
  }
  return true;
}, {
  message: 'Por favor, selecione a unidade específica.',
  path: ['subLocation'], // Onde o erro aparecerá
}).refine((data) => {
  // Validação condicional para "Outro"
  if (data.mainLocation === '__custom__') {
    return !!data.customLocationName && data.customLocationName.length > 2;
  }
  return true;
}, {
  message: 'Por favor, descreva o local (mínimo 3 caracteres).',
  path: ['customLocationName'],
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface CreateTaskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Lista de áreas principais
const mainAreaOptions = [
  { value: 'cabana', label: 'Cabanas' },
  { value: 'jacuzzi', label: 'Jacuzzis' },
  { value: 'gramado', label: 'Gramado' },
  { value: 'churrasqueira', label: 'Churrasqueira' },
  { value: 'salao', label: 'Salão' },
  { value: 'recepcao', label: 'Recepção' },
  { value: '__custom__', label: 'Outro (Descrever)' },
];

// Tipo local simples para 'structures' já que não está no index.ts
interface SimpleStructure { id: string; name: string; }

export function CreateTaskSheet({ open, onOpenChange }: CreateTaskSheetProps) {
  const { user } = useAuth();
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [jacuzzis, setJacuzzis] = useState<SimpleStructure[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      mainLocation: '',
      subLocation: '',
      customLocationName: '',
      priority: 'medium',
      weight: 10,
    },
  });

  // Observa o campo 'mainLocation'
  const watchedMainLocation = form.watch('mainLocation');

  // Buscar cabanas e estruturas (jacuzzis)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = await getFirebaseDb();
        
        // 1. Buscar Cabanas
        const cabinsQuery = query(collection(db, 'cabins'), orderBy('posicao', 'asc'));
        
        // 2. Buscar Estruturas (para Jacuzzis)
        const structuresQuery = query(collection(db, 'structures'), orderBy('name', 'asc'));

        const [cabinsSnapshot, structuresSnapshot] = await Promise.all([
          getDocs(cabinsQuery),
          getDocs(structuresQuery),
        ]);

        // Processa cabanas
        const cabinsData = cabinsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cabin));
        setCabins(cabinsData);

        // Processa estruturas e filtra por "Jacuzzi"
        const allStructures = structuresSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as SimpleStructure));
        const jacuzziData = allStructures.filter(s => s.name.toLowerCase().includes('jacuzzi'));
        setJacuzzis(jacuzziData);

      } catch (error) {
        console.error("Erro ao buscar dados de localização: ", error);
        toast.error('Não foi possível carregar as listas de locais.');
      }
    };
    fetchData();
  }, []);

  const onSubmit = async (data: TaskFormData) => {
    if (!user) {
      toast.error('Erro de autenticação. Tente fazer login novamente.');
      return;
    }
    
    setIsSubmitting(true);
    const toastId = toast.loading('Criando nova tarefa...');

    try {
      const db = await getFirebaseDb();
      
      let finalLocation = data.mainLocation;
      if (data.mainLocation === 'cabana' || data.mainLocation === 'jacuzzi') {
        finalLocation = data.subLocation as string; 
      } else if (data.mainLocation === '__custom__') {
        finalLocation = data.customLocationName as string;
      }
      
      const { mainLocation, subLocation, customLocationName, ...formData } = data;

      // Monta o objeto da nova tarefa
      const newTask: Omit<MaintenanceTask, 'id'> = {
        ...formData,
        location: finalLocation, // Salva o local final formatado
        // ++ ESTA É A ALTERAÇÃO ++
        status: 'backlog', // Alterado de 'open' para 'backlog'
        // ++ FIM DA ALTERAÇÃO ++
        createdAt: Timestamp.now(),
        createdById: user.uid,
        createdBy: user.displayName || user.email || 'Gestor',
      };

      await addDoc(collection(db, 'maintenance_tasks'), newTask);
      
      toast.success('Tarefa criada com sucesso!', { id: toastId });
      form.reset();
      onOpenChange(false); // Fecha o Sheet
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      toast.error('Falha ao criar a tarefa.', { id: toastId, description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Criar Nova Tarefa</SheetTitle>
          {/* ++ DESCRIÇÃO ATUALIZADA ++ */}
          <SheetDescription>
            Descreva a ordem de serviço. Ela aparecerá no "Backlog" para delegação.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título da Tarefa</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Lâmpada queimada no banheiro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* CAMPO 1: ÁREA PRINCIPAL */}
              <FormField
                control={form.control}
                name="mainLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área Principal</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('subLocation', '');
                        form.setValue('customLocationName', '');
                      }} 
                      value={field.value} 
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma área..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {mainAreaOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* CAMPO 2 (CONDICIONAL): CABANAS OU JACUZZIS */}
              {(watchedMainLocation === 'cabana' || watchedMainLocation === 'jacuzzi') && (
                <FormField
                  control={form.control}
                  name="subLocation"
                  render={({ field }) => (
                    <FormItem className="transition-all">
                      <FormLabel>Unidade / Específico</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value} 
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={`Selecione a ${watchedMainLocation}...`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Renderiza a lista correta */}
                          {watchedMainLocation === 'cabana' && (
                            <SelectGroup>
                              <SelectLabel>Cabanas</SelectLabel>
                              {cabins.map(cabin => (
                                <SelectItem key={cabin.id} value={cabin.name}>
                                  {cabin.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                          {watchedMainLocation === 'jacuzzi' && (
                            <SelectGroup>
                              <SelectLabel>Jacuzzis</SelectLabel>
                              {jacuzzis.map(j => (
                                <SelectItem key={j.id} value={j.name}>
                                  {j.name}
                                </SelectItem>
                              ))}
                              {jacuzzis.length === 0 && (
                                <SelectItem value="" disabled>Nenhuma jacuzzi encontrada</SelectItem>
                              )}
                            </SelectGroup>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* CAMPO 3 (CONDICIONAL): OUTRO */}
              {watchedMainLocation === '__custom__' && (
                <FormField
                  control={form.control}
                  name="customLocationName"
                  render={({ field }) => (
                    <FormItem className="transition-all">
                      <FormLabel>Descreva o Local</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Corredor da Cabana 5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <FormControl>
                      <ToggleGroup
                        type="single"
                        value={field.value}
                        onValueChange={(value) => {
                          if (value) field.onChange(value as 'low' | 'medium' | 'high');
                        }}
                        className="w-full justify-start"
                      >
                        <ToggleGroupItem value="low" aria-label="Baixa" variant="outline">Baixa</ToggleGroupItem>
                        <ToggleGroupItem value="medium" aria-label="Média" variant="outline">Média</ToggleGroupItem>
                        <ToggleGroupItem value="high" aria-label="Alta" variant="outline" className="data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground">Alta</ToggleGroupItem>
                      </ToggleGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pontos (Peso)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormDescription>
                      Pontos que o funcionário ganhará ao concluir a tarefa.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter className="gap-2 pt-4">
                <SheetClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </SheetClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar Tarefa
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}