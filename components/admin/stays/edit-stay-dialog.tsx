"use client";

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as firestore from 'firebase/firestore';
import { Cabin, PreCheckIn, Stay } from '@/types';
import { fullStaySchema, FullStayFormValues } from '@/lib/schemas/stay-schema';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { StayFormFields } from './stay-form-fields';

interface EditStayDialogProps {
    isOpen: boolean;
    onClose: () => void;
    stay: Stay;
    cabins: Cabin[];
    db: firestore.Firestore;
}

export const EditStayDialog: React.FC<EditStayDialogProps> = ({ isOpen, onClose, stay, cabins, db }) => {
    const [preCheckIn, setPreCheckIn] = useState<PreCheckIn | null>(null);
    const [loadingData, setLoadingData] = useState(true);

    const form = useForm<FullStayFormValues>({
        resolver: zodResolver(fullStaySchema),
    });

    useEffect(() => {
        const fetchPreCheckIn = async () => {
            if (!stay.preCheckInId) {
                toast.error("Erro: A estadia não tem um pré-check-in vinculado.");
                setLoadingData(false);
                return;
            }
            setLoadingData(true);
            const preCheckInRef = firestore.doc(db, 'preCheckIns', stay.preCheckInId);
            const docSnap = await firestore.getDoc(preCheckInRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as PreCheckIn;
                setPreCheckIn(data);
                form.reset({
                    // Pre-check-in data
                    leadGuestName: data.leadGuestName,
                    isForeigner: data.isForeigner,
                    leadGuestDocument: data.leadGuestDocument,
                    country: data.address.country || 'Brasil',
                    leadGuestEmail: data.leadGuestEmail,
                    leadGuestPhone: data.leadGuestPhone,
                    address: data.address,
                    estimatedArrivalTime: data.estimatedArrivalTime,
                    knowsVehiclePlate: data.knowsVehiclePlate,
                    vehiclePlate: data.vehiclePlate,
                    companions: data.companions.map(c => ({...c, age: c.age.toString()})),
                    pets: data.pets.map(p => ({...p, weight: p.weight.toString(), age: p.age.toString()})),
                    // Stay data
                    cabinId: stay.cabinId,
                    dates: { from: new Date(stay.checkInDate), to: new Date(stay.checkOutDate) },
                });
            } else {
                toast.error("Pré-check-in associado não encontrado.");
            }
            setLoadingData(false);
        };

        if (isOpen) {
            fetchPreCheckIn();
        }
    }, [isOpen, stay, db, form]);

    const handleUpdateStay: SubmitHandler<FullStayFormValues> = async (data) => {
        if (!preCheckIn) {
            toast.error("Dados do pré-check-in não carregados.");
            return;
        }

        const toastId = toast.loading("Atualizando estadia...");
        try {
            const selectedCabin = cabins.find(c => c.id === data.cabinId);
            if (!selectedCabin) throw new Error("Cabana não encontrada.");

            const batch = firestore.writeBatch(db);
            const preCheckInRef = firestore.doc(db, 'preCheckIns', stay.preCheckInId);
            const stayRef = firestore.doc(db, 'stays', stay.id);

            // Update PreCheckIn
            batch.update(preCheckInRef, {
                leadGuestName: data.leadGuestName,
                isForeigner: data.isForeigner,
                leadGuestDocument: data.leadGuestDocument,
                leadGuestEmail: data.leadGuestEmail,
                leadGuestPhone: data.leadGuestPhone,
                address: { ...data.address, country: data.isForeigner ? data.country : 'Brasil' },
                estimatedArrivalTime: data.estimatedArrivalTime,
                knowsVehiclePlate: data.knowsVehiclePlate,
                vehiclePlate: data.vehiclePlate,
                companions: data.companions.map(c => ({...c, age: Number(c.age)})),
                pets: data.pets.map(p => ({...p, weight: Number(p.weight), age: p.age.toString()})),
            });
            
            // Update Stay
            batch.update(stayRef, {
                guestName: data.leadGuestName,
                cabinId: selectedCabin.id,
                cabinName: selectedCabin.name,
                checkInDate: data.dates.from.toISOString(),
                checkOutDate: data.dates.to.toISOString(),
                numberOfGuests: 1 + (data.companions?.length || 0),
            });
            
            await batch.commit();
            toast.success("Estadia atualizada com sucesso!", { id: toastId });
            onClose();
        } catch (error: any) {
            toast.error("Falha ao atualizar a estadia.", { id: toastId, description: error.message });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Detalhes da Estadia de {stay.guestName}</DialogTitle>
                    <DialogDescription>
                        Visualize ou edite as informações da estadia e do pré-check-in.
                    </DialogDescription>
                </DialogHeader>
                {loadingData ? (
                    <div className="flex justify-center items-center h-96">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <Form {...form}>
                        <form id="edit-stay-form" onSubmit={form.handleSubmit(handleUpdateStay)}>
                            <div className="py-4 max-h-[75vh] overflow-y-auto pr-4">
                               <StayFormFields form={form} cabins={cabins} />
                            </div>
                            <DialogFooter className="pt-4 border-t">
                                <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                    Salvar Alterações
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
};