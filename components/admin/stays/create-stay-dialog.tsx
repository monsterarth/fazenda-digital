"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fullStaySchema, FullStayFormValues } from '@/lib/schemas/stay-schema';
import { useModal } from '@/hooks/use-modal-store';
import { Cabin } from '@/types';
import { Guest } from '@/types/guest';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { StayFormFields } from './stay-form-fields';
import { addDays } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createStayAction } from '@/app/actions/create-stay'; // Importando a Server Action

interface CreateStayDialogProps {
  cabins: Cabin[];
}

// Função auxiliar para mapear dados de Guest para os valores do formulário
const mapGuestToFormValues = (guest: Guest): Partial<FullStayFormValues> => ({
    leadGuestName: guest.name,
    leadGuestDocument: guest.cpf,
    leadGuestEmail: guest.email,
    leadGuestPhone: guest.phone,
    isForeigner: guest.isForeigner,
    country: guest.country,
    address: guest.address,
});

export const CreateStayDialog: React.FC<CreateStayDialogProps> = ({ cabins }) => {
    const { isOpen, onClose, type, data } = useModal();
    const { user } = useAuth();
    const { guest } = data;
    const isModalOpen = isOpen && type === 'createStay';

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [foundGuest, setFoundGuest] = useState<Guest | null>(null);

    const form = useForm<FullStayFormValues>({
        resolver: zodResolver(fullStaySchema),
        defaultValues: {
            leadGuestName: '',
            isForeigner: false,
            leadGuestDocument: '',
            country: 'Brasil',
            leadGuestEmail: '',
            leadGuestPhone: '',
            address: { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' },
            estimatedArrivalTime: '16:00',
            knowsVehiclePlate: true,
            vehiclePlate: '',
            companions: [],
            pets: [],
            cabinId: '',
            dates: { from: new Date(), to: addDays(new Date(), 2) },
        },
    });

    // Efeito para preencher ou limpar o formulário
    useEffect(() => {
        if (isModalOpen) {
            if (guest) { // Se o modal foi aberto a partir da lista de hóspedes
                form.reset(mapGuestToFormValues(guest));
                setFoundGuest(guest);
            } else { // Se foi aberto pelo botão "Criar Estadia"
                form.reset(); // Limpa para o estado padrão
                setFoundGuest(null);
            }
        }
    }, [isModalOpen, guest, form]);


    // Busca silenciosa de hóspede pelo CPF
    const handleCpfBlur = useCallback(async (cpf: string) => {
        if (!cpf || cpf.length < 11 || foundGuest) return;
        
        setIsLookingUp(true);
        setFoundGuest(null);
        try {
            const response = await fetch('/api/admin/guests/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpf }),
            });
            if (response.ok) {
                const found = await response.json();
                if (found) {
                    setFoundGuest(found);
                    toast.success(`Hóspede encontrado: ${found.name}`);
                }
            }
        } catch (error) {
            console.error("Falha ao buscar hóspede", error);
        } finally {
            setIsLookingUp(false);
        }
    }, [foundGuest]);

    const handleUseFoundGuest = () => {
        if (foundGuest) {
            form.reset({
                ...form.getValues(),
                ...mapGuestToFormValues(foundGuest),
            });
        }
    };

    const onSubmit = async (values: FullStayFormValues) => {
        if (!user) {
            toast.error("Você precisa estar logado para realizar esta ação.");
            return;
        }
        setIsSubmitting(true);
        const toastId = toast.loading("Criando estadia...");

        const result = await createStayAction(values, user.email || 'Admin');
        
        if (result.success) {
            toast.success(result.message, { id: toastId, description: `Token de acesso: ${result.token}` });
            onClose();
        } else {
            toast.error("Falha ao criar estadia", { id: toastId, description: result.message });
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isModalOpen} onOpenChange={onClose}>
            <DialogContent 
                className="max-w-4xl"
                onInteractOutside={(e) => {
                    e.preventDefault();
                }}
            >
                <DialogHeader>
                    <DialogTitle>Criar Nova Estadia Manualmente</DialogTitle>
                    <DialogDescription>
                        Preencha os dados abaixo. Se o hóspede já esteve aqui, digite o CPF para buscar seus dados.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="py-4 max-h-[75vh] overflow-y-auto pr-4 space-y-6">
                            <StayFormFields form={form} cabins={cabins} onCpfBlur={handleCpfBlur} />

                            {isLookingUp && <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Buscando CPF...</div>}
                            
                            {foundGuest && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center justify-between">
                                    <div className="flex items-center">
                                        <UserCheck className="h-5 w-5 mr-2 text-green-600" />
                                        <p className="text-sm font-medium text-green-800">
                                            Hóspede recorrente: <span className="font-bold">{foundGuest.name}</span>
                                        </p>
                                    </div>
                                    <Button type="button" size="sm" variant="outline" onClick={handleUseFoundGuest}>
                                        Usar Dados
                                    </Button>
                                </div>
                            )}
                        </div>
                        
                        <DialogFooter className="pt-4 border-t mt-4">
                            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4"/>}
                                Criar e Ativar Estadia
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};