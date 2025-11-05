// components/admin/stays/edit-stay-dialog.tsx

"use client";

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as firestore from 'firebase/firestore';
import { Cabin, PreCheckIn, Property, Stay } from '@/types';
import { fullStaySchema, FullStayFormValues } from '@/lib/schemas/stay-schema';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { StayFormFields } from './stay-form-fields';
import { Separator } from '@/components/ui/separator';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/context/AuthContext';
import { createActivityLog } from '@/lib/activity-logger';
// ## INÍCIO DA CORREÇÃO ##
import { useModalStore } from '@/hooks/use-modal-store'; // Alterado de useModal
// ## FIM DA CORREÇÃO ##
import { getFirebaseDb } from '@/lib/firebase';

interface EditStayDialogProps {
    cabins: Cabin[];
    property?: Property;
}

export const EditStayDialog: React.FC<EditStayDialogProps> = ({ cabins, property }) => {
    // ## INÍCIO DA CORREÇÃO ##
    const { isOpen, onClose, type, data } = useModalStore(); // Alterado de useModal
    // ## FIM DA CORREÇÃO ##
    const { user } = useAuth();
    const { stay } = data;

    const isModalOpen = isOpen && type === 'editStay' && !!stay;

    const [preCheckIn, setPreCheckIn] = useState<PreCheckIn | null>(null);
    const [loadingData, setLoadingData] = useState(true);

    const form = useForm<FullStayFormValues>({
        resolver: zodResolver(fullStaySchema),
    });

    // (Resto do componente sem alterações)
    useEffect(() => {
        const fetchPreCheckIn = async () => {
            if (!stay || !stay.preCheckInId) {
                toast.error("Erro: A estadia não tem um pré-check-in vinculado.");
                setLoadingData(false);
                return;
            }

            setLoadingData(true);
            const db = await getFirebaseDb();
            const preCheckInRef = firestore.doc(db, 'preCheckIns', stay.preCheckInId);
            const docSnap = await firestore.getDoc(preCheckInRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as PreCheckIn;
                setPreCheckIn(data);
                form.reset({
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
                    companions: data.companions.map(c => ({ ...c, age: c.age.toString() })),
                    pets: data.pets.map(p => ({ ...p, weight: p.weight.toString(), age: p.age.toString() })),
                    cabinId: stay.cabinId,
                    dates: { from: new Date(stay.checkInDate), to: new Date(stay.checkOutDate) },
                    token: stay.token,
                });
            } else {
                toast.error("Pré-check-in associado não encontrado.");
            }
            setLoadingData(false);
        };

        if (isModalOpen) {
            fetchPreCheckIn();
        }
    }, [isModalOpen, stay, form]);

    const handleGenerateToken = () => {
        const newToken = Math.floor(100000 + Math.random() * 900000).toString();
        form.setValue('token', newToken, { shouldValidate: true, shouldDirty: true });
        toast.info("Novo token gerado. Clique em 'Salvar' para aplicar.");
    };

    const handleUpdateStay: SubmitHandler<FullStayFormValues> = async (data) => {
        if (!preCheckIn || !user || !stay) {
            toast.error("Dados incompletos para atualizar a estadia.");
            return;
        }

        const toastId = toast.loading("Atualizando estadia...");
        try {
            const db = await getFirebaseDb();
            const selectedCabin = cabins.find(c => c.id === data.cabinId);
            if (!selectedCabin) throw new Error("Cabana não encontrada.");

            const batch = firestore.writeBatch(db);
            const preCheckInRef = firestore.doc(db, 'preCheckIns', stay.preCheckInId);
            const stayRef = firestore.doc(db, 'stays', stay.id);

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
                companions: data.companions.map(c => ({ ...c, age: Number(c.age) })),
                pets: data.pets.map(p => ({ ...p, weight: Number(p.weight), age: p.age.toString() })),
            });
            
            batch.update(stayRef, {
                guestName: data.leadGuestName,
                cabinId: selectedCabin.id,
                cabinName: selectedCabin.name,
                checkInDate: data.dates.from.toISOString(),
                checkOutDate: data.dates.to.toISOString(),
                numberOfGuests: 1 + (data.companions?.length || 0),
                token: data.token,
            });
            
            await batch.commit();

            if (stay.token !== data.token) {
                await createActivityLog({
                    type: 'stay_token_updated',
                    actor: { type: 'admin', identifier: user.email! },
                    details: `Token de acesso da estadia de ${data.leadGuestName} foi alterado.`,
                    link: '/admin/stays'
                });
            }

            toast.success("Estadia atualizada com sucesso!", { id: toastId });
            onClose();
        } catch (error: any) {
            toast.error("Falha ao atualizar a estadia.", { id: toastId, description: error.message });
        }
    };
    
    const handleCpfBlur = () => {}; 

    if (!isModalOpen) {
        return null;
    }

    return (
        <Dialog open={isModalOpen} onOpenChange={onClose}>
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
                            <div className="py-4 max-h-[75vh] overflow-y-auto pr-4 space-y-6">
                               <StayFormFields 
                                   form={form} 
                                   cabins={cabins} 
                                   onCpfBlur={handleCpfBlur}
                                   isLookingUp={false}
                                   foundGuest={null}
                                   onUseFoundGuest={() => {}}
                                />
                               
                               <Separator />
                               <div>
                                    <h3 className="text-lg font-medium mb-4">Acesso do Hóspede</h3>
                                    <div className="flex items-center gap-4">
                                        <FormField
                                            control={form.control}
                                            name="token"
                                            render={({
                                                field,
                                            }: {
                                                field: import("react-hook-form").ControllerRenderProps<FullStayFormValues, "token">;
                                            }) => (
                                                <FormItem>
                                                    <FormLabel>Senha de Acesso (Token)</FormLabel>
                                                    <FormControl>
                                                        <InputOTP maxLength={6} {...field}>
                                                            <InputOTPGroup>
                                                                <InputOTPSlot index={0} />
                                                                <InputOTPSlot index={1} />
                                                                <InputOTPSlot index={2} />
                                                                <InputOTPSlot index={3} />
                                                                <InputOTPSlot index={4} />
                                                                <InputOTPSlot index={5} />
                                                            </InputOTPGroup>
                                                        </InputOTP>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" variant="outline" size="icon" className="mt-7" onClick={handleGenerateToken}>
                                            <RefreshCw className="h-4 w-4" />
                                            <span className="sr-only">Gerar Novo Token</span>
                                        </Button>
                                    </div>
                               </div>
                            </div>
                            <DialogFooter className="pt-4 border-t">
                                <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                                <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
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