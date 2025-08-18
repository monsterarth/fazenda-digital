"use client";

import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as firestore from 'firebase/firestore';
import { Cabin, PreCheckIn, Stay } from '@/types';
import { fullStaySchema, FullStayFormValues } from '@/lib/schemas/stay-schema';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { toast } from 'sonner';
import { Loader2, UserPlus } from 'lucide-react';
import { addDays } from 'date-fns';
import { StayFormFields } from './stay-form-fields';
// ++ INÍCIO DA CORREÇÃO: Importa a função de log e o hook de autenticação ++
import { addActivityLogToBatch } from '@/lib/activity-logger';
import { useAuth } from '@/context/AuthContext';

interface CreateStayDialogProps {
    isOpen: boolean;
    onClose: () => void;
    cabins: Cabin[];
    db: firestore.Firestore | null;
}

const generateToken = (): string => Math.floor(100000 + Math.random() * 900000).toString();

export const CreateStayDialog: React.FC<CreateStayDialogProps> = ({ isOpen, onClose, cabins, db }) => {
    // ++ INÍCIO DA CORREÇÃO: Pega o usuário admin logado ++
    const { user } = useAuth();

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

    const handleCreateStay: SubmitHandler<FullStayFormValues> = async (data) => {
        if (!db) {
            toast.error("Conexão com o banco perdida.");
            return;
        }

        const toastId = toast.loading("Criando estadia...");
        try {
            const selectedCabin = cabins.find(c => c.id === data.cabinId);
            if (!selectedCabin) throw new Error("Cabana não encontrada.");

            const batch = firestore.writeBatch(db);
            const preCheckInRef = firestore.doc(firestore.collection(db, 'preCheckIns'));
            const stayRef = firestore.doc(firestore.collection(db, 'stays'));

            const preCheckInData: Omit<PreCheckIn, 'id' | 'stayId'> = {
                leadGuestName: data.leadGuestName,
                isForeigner: data.isForeigner,
                leadGuestDocument: data.leadGuestDocument,
                leadGuestEmail: data.leadGuestEmail,
                leadGuestPhone: data.leadGuestPhone,
                address: { ...data.address, country: data.isForeigner ? (data.country || 'N/A') : 'Brasil' },
                estimatedArrivalTime: data.estimatedArrivalTime,
                knowsVehiclePlate: data.knowsVehiclePlate,
                vehiclePlate: data.vehiclePlate,
                companions: data.companions.map(c => ({...c, age: Number(c.age)})),
                pets: data.pets.map(p => ({...p, weight: Number(p.weight), age: p.age.toString()})),
                status: 'validado_admin',
                createdAt: firestore.Timestamp.now(),
            };
            batch.set(preCheckInRef, preCheckInData);

            const newStay: Omit<Stay, 'id'> = {
                guestName: data.leadGuestName,
                cabinId: selectedCabin.id,
                cabinName: selectedCabin.name,
                checkInDate: data.dates.from.toISOString(),
                checkOutDate: data.dates.to.toISOString(),
                numberOfGuests: 1 + data.companions.length,
                token: generateToken(),
                status: 'active',
                preCheckInId: preCheckInRef.id,
                createdAt: new Date().toISOString(),
                pets: data.pets.map(p => ({...p, weight: Number(p.weight), age: p.age.toString()})) || [],
            };
            batch.set(stayRef, newStay);
            batch.update(preCheckInRef, { stayId: stayRef.id });

            // ++ INÍCIO DA CORREÇÃO: Adiciona o log de atividade ao batch ++
            addActivityLogToBatch(batch, {
                type: 'stay_created_manually',
                actor: { type: 'admin', identifier: user?.email || 'Admin' },
                details: `Estadia para ${data.leadGuestName} na ${selectedCabin.name}.`,
                link: '/admin/stays'
            });
            // ++ FIM DA CORREÇÃO ++

            await batch.commit();
            toast.success("Estadia criada com sucesso!", { id: toastId, description: `Token: ${newStay.token}` });
            form.reset();
            onClose();
        } catch (error: any) {
            toast.error("Falha ao criar a estadia.", { id: toastId, description: error.message });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Criar Nova Estadia Manualmente</DialogTitle>
                    <DialogDescription>
                        Preencha todos os dados necessários para o check-in e a estadia.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form id="create-stay-form" onSubmit={form.handleSubmit(handleCreateStay)}>
                        <div className="py-4 max-h-[75vh] overflow-y-auto pr-4">
                           <StayFormFields form={form} cabins={cabins} />
                        </div>
                        <DialogFooter className="pt-4 border-t">
                            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserPlus className="mr-2 h-4 w-4"/>}
                                Criar e Ativar Estadia
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};