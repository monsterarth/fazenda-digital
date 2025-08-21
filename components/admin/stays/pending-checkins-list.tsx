// components/admin/stays/pending-checkins-list.tsx
"use client";

import React, { useState } from 'react';
import { PreCheckIn, Cabin } from '@/types';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { Loader2, CalendarIcon, Users, Edit, KeyRound, PawPrint, User, Home, Car, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/context/AuthContext';
import { validateCheckinAction } from '@/app/actions/validate-checkin'; // ++ ADICIONADO ++

const validationSchema = z.object({
    cabinId: z.string().min(1, "É obrigatório selecionar uma cabana."),
    dates: z.object({
        from: z.date({ required_error: "Data de check-in é obrigatória." }),
        to: z.date({ required_error: "Data de check-out é obrigatória." }),
    }),
});

type ValidationFormValues = z.infer<typeof validationSchema>;

interface PendingCheckInsListProps {
    pendingCheckIns: PreCheckIn[];
    cabins: Cabin[];
    // A prop 'db' foi removida
}

export const PendingCheckInsList: React.FC<PendingCheckInsListProps> = ({ pendingCheckIns, cabins }) => {
    const { user } = useAuth(); 
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCheckIn, setSelectedCheckIn] = useState<PreCheckIn | null>(null);

    const form = useForm<ValidationFormValues>({
        resolver: zodResolver(validationSchema),
    });

    const handleOpenModal = (checkIn: PreCheckIn) => {
        setSelectedCheckIn(checkIn);
        form.reset({
            cabinId: '',
            dates: { from: new Date(), to: addDays(new Date(), 2) },
        });
        setIsModalOpen(true);
    };

    const handleValidateStay: SubmitHandler<ValidationFormValues> = async (data) => {
        if (!selectedCheckIn || !user?.email) {
            return toast.error("Dados da sessão inválidos. Por favor, recarregue a página.");
        }
        
        const toastId = toast.loading("Validando estadia...");
        
        const result = await validateCheckinAction(selectedCheckIn.id, data, user.email);

        if (result.success) {
            toast.success(result.message, { id: toastId, description: `Token: ${result.token}` });
            setIsModalOpen(false);
            setSelectedCheckIn(null);
        } else {
            toast.error("Falha ao validar.", { id: toastId, description: result.message });
        }
    };
    
    // A função handleRejectStay também pode ser movida para uma Server Action no futuro
    const handleRejectStay = async () => {
       toast.info("Funcionalidade de recusa em desenvolvimento.");
    };

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Hóspede</TableHead>
                        <TableHead>Nº Pessoas</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pendingCheckIns.length > 0 ? (
                        pendingCheckIns.map(checkIn => (
                            <TableRow key={checkIn.id}>
                                <TableCell className="font-medium">{checkIn.leadGuestName}</TableCell>
                                <TableCell>{1 + (checkIn.companions?.length || 0)}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleOpenModal(checkIn)}>
                                        <Edit className="mr-2 h-4 w-4"/> Revisar
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={3} className="h-24 text-center">Nenhum pré-check-in pendente.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
            {selectedCheckIn && (
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Validar Pré-Check-in de: {selectedCheckIn.leadGuestName}</DialogTitle>
                            <DialogDescription>Confirme os detalhes para criar a estadia ou recuse para arquivar o registro.</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
                            <div className="space-y-6">
                                <section><h4 className="font-semibold flex items-center gap-2 mb-2 pb-2 border-b"><User />Responsável</h4><div className="text-sm space-y-1"><p><strong>Nome:</strong> {selectedCheckIn.leadGuestName}</p><p><strong>Doc:</strong> {selectedCheckIn.leadGuestDocument}</p><p><strong>Contato:</strong> {selectedCheckIn.leadGuestPhone} | {selectedCheckIn.leadGuestEmail}</p></div></section>
                                <section><h4 className="font-semibold flex items-center gap-2 mb-2 pb-2 border-b"><Home />Endereço</h4><div className="text-sm space-y-1"><p>{selectedCheckIn.address.street}, {selectedCheckIn.address.number}</p><p>{selectedCheckIn.address.city}/{selectedCheckIn.address.state}</p></div></section>
                                <section><h4 className="font-semibold flex items-center gap-2 mb-2 pb-2 border-b"><Car />Chegada</h4><div className="text-sm space-y-1"><p><strong>Horário:</strong> {selectedCheckIn.estimatedArrivalTime}</p><p><strong>Veículo:</strong> {selectedCheckIn.vehiclePlate || 'Não informado'}</p></div></section>
                                {selectedCheckIn.companions && selectedCheckIn.companions.length > 0 && (<section><h4 className="font-semibold flex items-center gap-2 mb-2 pb-2 border-b"><Users />Acompanhantes ({selectedCheckIn.companions.length})</h4><ul className="list-disc list-inside text-sm space-y-1">{selectedCheckIn.companions.map((c, i) => <li key={i}>{c.fullName} ({c.age} anos)</li>)}</ul></section>)}
                                {selectedCheckIn.pets && selectedCheckIn.pets.length > 0 && (<section><h4 className="font-semibold flex items-center gap-2 mb-2 pb-2 border-b"><PawPrint />Pets ({selectedCheckIn.pets.length})</h4>{selectedCheckIn.pets.map(p => (<div key={p.id} className="text-sm"><p><strong>{p.name}</strong> ({p.species}, {p.weight}kg)</p></div>))}</section>)}
                            </div>
                            <div className="space-y-4">
                                <Form {...form}>
                                    <form id="validation-form" onSubmit={form.handleSubmit(handleValidateStay)} className="space-y-4 p-4 border rounded-md bg-slate-50 sticky top-0">
                                        <h4 className="font-semibold">Aprovar e Criar Estadia</h4>
                                        <FormField control={form.control} name="cabinId" render={({ field }) => (<FormItem><FormLabel>Cabana</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><ScrollArea className="h-72">{cabins.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</ScrollArea></SelectContent></Select><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="dates" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Período</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal bg-white", !field.value?.from && "text-muted-foreground")}>{field.value?.from && field.value?.to ? (`${format(field.value.from, "dd/MM/yy")} até ${format(field.value.to, "dd/MM/yy")}`) : (<span>Selecione</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="range" selected={field.value as DateRange} onSelect={field.onChange} defaultMonth={field.value?.from} numberOfMonths={2}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                    </form>
                                </Form>
                            </div>
                        </div>
                        <DialogFooter className="sm:justify-between items-center pt-4">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" type="button">
                                        <ShieldX className="mr-2 h-4 w-4" />
                                        Recusar
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta ação irá recusar o pré-check-in de <span className="font-semibold">{selectedCheckIn.leadGuestName}</span>. O registro será arquivado e a ação não poderá ser desfeita.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleRejectStay} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                            Sim, recusar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Button type="submit" form="validation-form" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4"/>}
                                Validar e Gerar Token
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};