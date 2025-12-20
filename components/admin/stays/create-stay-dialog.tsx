"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fullStaySchema, FullStayFormValues } from '@/lib/schemas/stay-schema';
import { useModalStore } from '@/hooks/use-modal-store'; 
import { Cabin, Guest } from '@/types'; 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { StayFormFields } from './stay-form-fields';
import { addDays } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createStayAction } from '@/app/actions/create-stay';

interface CreateStayDialogProps {
    cabins: Cabin[];
    onSuccess?: () => void;
}

const mapGuestToFormValues = (guest: Guest): Partial<FullStayFormValues> => ({
    leadGuestName: guest.name,
    leadGuestDocument: guest.document, 
    leadGuestEmail: guest.email,
    leadGuestPhone: guest.phone,
    isForeigner: guest.isForeigner,
    country: guest.country,
    address: guest.address,
});

export const CreateStayDialog: React.FC<CreateStayDialogProps> = ({ cabins, onSuccess }) => {
    const { isOpen, onClose, type, data } = useModalStore();
    const { user } = useAuth();
    const { guest } = data;
    const isModalOpen = isOpen && type === 'createStayLegacy';

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
            // --- CORREÇÃO AQUI: cabinId -> cabinIds (array) ---
            cabinIds: [], 
            dates: { from: new Date(), to: addDays(new Date(), 2) },
        },
    });

    useEffect(() => {
        if (isModalOpen) {
            if (guest) { 
                form.reset(mapGuestToFormValues(guest));
                setFoundGuest(guest);
            } else { 
                // Reset manual para limpar
                form.reset({
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
                    cabinIds: [],
                    dates: { from: new Date(), to: addDays(new Date(), 2) },
                }); 
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
            const currentValues = form.getValues();
            form.reset({
                ...currentValues,
                ...mapGuestToFormValues(foundGuest),
                // Preservar campos que não vêm do guest
                cabinIds: currentValues.cabinIds,
                dates: currentValues.dates
            });
        }
    };

    const onSubmit = async (values: FullStayFormValues) => {
        if (!user) {
            toast.error("Você precisa estar logado para realizar esta ação.");
            return;
        }
        
        // Validação extra caso o form permita array vazio
        if (!values.cabinIds || values.cabinIds.length === 0) {
            toast.error("Selecione pelo menos uma cabana.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Criando estadia...");

        try {
            // A server action createStayAction agora espera cabinIds[]
            const result = await createStayAction(values, user.email || 'Admin');
            
            if (result.success) {
                toast.success(result.message, { id: toastId });
                onClose();
                if (onSuccess) onSuccess();
            } else {
                toast.error("Falha ao criar estadia", { id: toastId, description: result.message });
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro inesperado", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
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
                            {/* IMPORTANTE: StayFormFields precisa ter sido atualizado para aceitar cabinIds[] 
                                ou este componente precisa tratar a conversão.
                                Assumindo que StayFormFields ainda usa single select, vamos precisar adaptar lá.
                                Se não tiver acesso ao código dele agora, o build vai passar mas a UI pode quebrar se não estiver alinhada.
                            */}
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