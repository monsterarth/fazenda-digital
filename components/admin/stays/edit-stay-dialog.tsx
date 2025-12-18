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
import { useModalStore } from '@/hooks/use-modal-store'; 
import { getFirebaseDb } from '@/lib/firebase';

interface EditStayDialogProps {
    cabins: Cabin[];
    property?: Property;
    // Tornamos estas props OPCIONAIS para suportar o modo híbrido
    isOpen?: boolean;
    onClose?: () => void;
    stay?: Stay;
    onSuccess?: () => void;
}

export const EditStayDialog: React.FC<EditStayDialogProps> = ({ 
    cabins, 
    property,
    isOpen: propIsOpen,
    onClose: propOnClose,
    stay: propStay,
    onSuccess
}) => {
    const { isOpen: storeIsOpen, onClose: storeOnClose, type, data } = useModalStore();
    const { user } = useAuth();

    // --- LÓGICA HÍBRIDA ---
    // Se propIsOpen for undefined, assumimos que estamos no modo "Global Store" (layout.tsx)
    const isControlled = propIsOpen !== undefined;
    
    // Define se o modal está aberto baseando-se no modo
    const isModalOpen = isControlled 
        ? !!propIsOpen 
        : (storeIsOpen && type === 'editStay');

    // Define a função de fechar
    const handleClose = isControlled 
        ? (propOnClose || (() => {})) 
        : storeOnClose;

    // Define qual estadia usar (da prop ou da store)
    const stay = isControlled 
        ? propStay 
        : (type === 'editStay' ? data?.stay : undefined);

    // ----------------------

    const [preCheckIn, setPreCheckIn] = useState<PreCheckIn | null>(null);
    const [loadingData, setLoadingData] = useState(true);

    const form = useForm<FullStayFormValues>({
        resolver: zodResolver(fullStaySchema),
    });

    useEffect(() => {
        const fetchPreCheckIn = async () => {
            if (!isModalOpen || !stay) return;
            
            if (!stay.preCheckInId) {
                // Caso sem pré-check-in vinculado (legado ou manual)
                form.reset({
                    leadGuestName: stay.guestName,
                    cabinId: stay.cabinId,
                    dates: { from: new Date(stay.checkInDate), to: new Date(stay.checkOutDate) },
                    token: stay.token,
                    // Defaults seguros
                    isForeigner: false,
                    leadGuestDocument: '',
                    country: 'Brasil',
                    leadGuestEmail: '',
                    leadGuestPhone: stay.guestPhone || '',
                    address: { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' },
                    estimatedArrivalTime: '16:00',
                    knowsVehiclePlate: true,
                    vehiclePlate: '',
                    companions: [],
                    pets: [],
                });
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
                    companions: data.companions ? data.companions.map(c => ({ ...c })) : [],
                    pets: data.pets ? data.pets.map(p => ({ ...p, weight: p.weight.toString(), age: p.age.toString() })) : [],
                    cabinId: stay.cabinId,
                    dates: { from: new Date(stay.checkInDate), to: new Date(stay.checkOutDate) },
                    token: stay.token,
                });
            } else {
                toast.error("Pré-check-in associado não encontrado.");
            }
            setLoadingData(false);
        };

        if (isModalOpen && stay) {
            fetchPreCheckIn();
        }
    }, [isModalOpen, stay, form]);

    const handleGenerateToken = () => {
        const newToken = Math.floor(100000 + Math.random() * 900000).toString();
        form.setValue('token', newToken, { shouldValidate: true, shouldDirty: true });
        toast.info("Novo token gerado. Clique em 'Salvar' para aplicar.");
    };

    const handleUpdateStay: SubmitHandler<FullStayFormValues> = async (formData) => {
        if (!user || !stay) {
            toast.error("Dados incompletos.");
            return;
        }

        const toastId = toast.loading("Atualizando estadia...");
        try {
            const db = await getFirebaseDb();
            const selectedCabin = cabins.find(c => c.id === formData.cabinId);
            if (!selectedCabin) throw new Error("Cabana não encontrada.");

            const batch = firestore.writeBatch(db);
            const stayRef = firestore.doc(db, 'stays', stay.id);

            // Atualiza pré-check-in se existir
            if (stay.preCheckInId) {
                const preCheckInRef = firestore.doc(db, 'preCheckIns', stay.preCheckInId);
                batch.update(preCheckInRef, {
                    leadGuestName: formData.leadGuestName,
                    isForeigner: formData.isForeigner,
                    leadGuestDocument: formData.leadGuestDocument,
                    leadGuestEmail: formData.leadGuestEmail,
                    leadGuestPhone: formData.leadGuestPhone,
                    address: { ...formData.address, country: formData.isForeigner ? formData.country : 'Brasil' },
                    estimatedArrivalTime: formData.estimatedArrivalTime,
                    knowsVehiclePlate: formData.knowsVehiclePlate,
                    vehiclePlate: formData.vehiclePlate,
                    companions: formData.companions.map(c => ({ ...c })),
                    pets: formData.pets.map(p => ({ ...p, weight: Number(p.weight), age: p.age.toString() })),
                });
            }
            
            // Atualiza a estadia
            batch.update(stayRef, {
                guestName: formData.leadGuestName,
                cabinId: selectedCabin.id,
                cabinName: selectedCabin.name,
                checkInDate: formData.dates.from.toISOString(),
                checkOutDate: formData.dates.to.toISOString(),
                numberOfGuests: 1 + (formData.companions?.length || 0),
                token: formData.token,
            });
            
            await batch.commit();

            if (stay.token !== formData.token) {
                await createActivityLog({
                    type: 'stay_token_updated',
                    actor: { type: 'admin', identifier: user.email! },
                    details: `Token de acesso da estadia de ${formData.leadGuestName} foi alterado.`,
                    link: '/admin/stays'
                });
            }

            toast.success("Estadia atualizada com sucesso!", { id: toastId });
            handleClose();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast.error("Falha ao atualizar a estadia.", { id: toastId, description: error.message });
        }
    };
    
    const handleCpfBlur = () => {}; 

    if (!isModalOpen || !stay) {
        return null;
    }

    return (
        <Dialog open={isModalOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Detalhes da Estadia de {stay.guestName}</DialogTitle>
                    <DialogDescription>
                        Visualize ou edite as informações da estadia.
                    </DialogDescription>
                </DialogHeader>
                
                {loadingData ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <Form {...form}>
                        <form id="edit-stay-form" onSubmit={form.handleSubmit(handleUpdateStay)} className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
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
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
                                        <Button type="button" variant="outline" size="sm" className="mt-8" onClick={handleGenerateToken}>
                                            <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                            Gerar Novo
                                        </Button>
                                    </div>
                               </div>
                            </div>
                            <DialogFooter className="p-6 border-t mt-auto bg-slate-50/50">
                                <Button type="button" variant="ghost" onClick={handleClose}>Cancelar</Button>
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