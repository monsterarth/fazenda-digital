// components/admin/stays/create-stay-dialog.tsx

"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fullStaySchema, FullStayFormValues } from '@/lib/schemas/stay-schema';
// ## INÍCIO DA CORREÇÃO ##
import { useModalStore } from '@/hooks/use-modal-store'; // Alterado de useModal
// ## FIM DA CORREÇÃO ##
import { Cabin, Guest } from '@/types'; 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { StayFormFields } from './stay-form-fields';
import { addDays } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createStayAction } from '@/app/actions/create-stay';

interface CreateStayDialogProps {
    cabins: Cabin[];
}

// Função auxiliar (sem alterações)
const mapGuestToFormValues = (guest: Guest): Partial<FullStayFormValues> => ({
    leadGuestName: guest.name,
    leadGuestDocument: guest.document, 
    leadGuestEmail: guest.email,
    leadGuestPhone: guest.phone,
    isForeigner: guest.isForeigner,
    country: guest.country,
    address: guest.address,
});

export const CreateStayDialog: React.FC<CreateStayDialogProps> = ({ cabins }) => {
    // ## INÍCIO DA CORREÇÃO ##
    const { isOpen, onClose, type, data } = useModalStore(); // Alterado de useModal
    // ## FIM DA CORREÇÃO ##
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

    // (Resto do componente sem alterações)
    useEffect(() => {
        if (isModalOpen) {
            if (guest) { 
                form.reset(mapGuestToFormValues(guest));
                setFoundGuest(guest);
            } else { 
                form.reset(); 
                setFoundGuest(null);
            }
        }
    }, [isModalOpen, guest, form]);


    const handleCpfBlur = useCallback(async (cpf: string) => {
        if (!cpf || cpf.length < 11 || foundGuest) return;
        
        setIsLookingUp(true);
        setFoundGuest(null);
        try {
            const response = await fetch('/api/admin/guests/lookup-by-cpf', {
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
                            <StayFormFields 
                                form={form} 
                                cabins={cabins} 
                                onCpfBlur={handleCpfBlur} 
                                isLookingUp={isLookingUp}
                                foundGuest={foundGuest}
                                onUseFoundGuest={handleUseFoundGuest}
                            />
                        </div>
                        
                        <DialogFooter className="pt-4 border-t mt-4">
                            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting || isLookingUp}>
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