'use client'

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { counterCheckinSchema, CounterCheckinFormValues } from '@/lib/schemas/stay-schema';
import { performCounterCheckin } from '@/app/actions/perform-counter-checkin';
import { toast } from 'sonner';

import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface CounterCheckinModalProps {
    stay: any; 
    isOpen: boolean;
    onClose: () => void;
}

export function CounterCheckinModal({ stay, isOpen, onClose }: CounterCheckinModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<CounterCheckinFormValues>({
        resolver: zodResolver(counterCheckinSchema),
        defaultValues: {
            stayId: stay.id,
            guestName: stay.guestName || "",
            guestPhone: stay.guestPhone || stay.tempGuestPhone || "",
            guestDocument: "", // Obrigatório agora
            vehiclePlate: "",
            checkInDate: stay.checkInDate ? new Date(stay.checkInDate) : new Date(),
            checkOutDate: stay.checkOutDate ? new Date(stay.checkOutDate) : new Date(),
            adults: stay.guestCount?.adults || 2,
            children: stay.guestCount?.children || 0,
            babies: stay.guestCount?.babies || 0,
            pets: stay.pets || 0,
        }
    });

    async function onSubmit(data: CounterCheckinFormValues) {
        setIsLoading(true);
        try {
            const result = await performCounterCheckin(data);
            if (result.success) {
                toast.success(result.message);
                onClose();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("Erro inesperado ao processar check-in.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                        Check-in de Balcão
                    </DialogTitle>
                    <DialogDescription>
                        Ativação rápida. O CPF agora é obrigatório para manter a consistência do banco de hóspedes.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="guestName"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Nome do Hóspede *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nome completo" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="guestPhone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telefone (WhatsApp)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="(00) 00000-0000" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="guestDocument"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CPF *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Apenas números" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-md border">
                            <FormField
                                control={form.control}
                                name="adults"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Adultos</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="children"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Crianças</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={0} {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="babies"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Bebês</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={0} {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="pets"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Pets</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={0} {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                         <FormField
                            control={form.control}
                            name="vehiclePlate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Placa do Veículo (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="ABC-1234" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
                                    </>
                                ) : (
                                    "Confirmar Check-in"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}