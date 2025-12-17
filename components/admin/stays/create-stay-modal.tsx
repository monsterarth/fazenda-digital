"use client";

import { useModalStore } from "@/hooks/use-modal-store";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle, PawPrint, User, Users, Baby } from "lucide-react";
import { createFastStayAction } from "@/app/actions/create-fast-stay";
import { addDays, format } from "date-fns"; 
import { isValidCPF } from "@/lib/validators"; 

export const CreateStayModal = () => {
    const { isOpen, type, onClose, data } = useModalStore();
    const cabins = data.cabins || [];
    const isModalOpen = isOpen && type === "createStay";

    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [cpfError, setCpfError] = useState(false);
    
    const today = new Date();
    const defaultCheckIn = addDays(today, 2);
    const defaultCheckOut = addDays(defaultCheckIn, 2);

    const [formData, setFormData] = useState({
        cpf: "",
        guestName: "",
        guestPhone: "",
        cabinId: "",
        checkInDate: format(defaultCheckIn, 'yyyy-MM-dd'),
        checkOutDate: format(defaultCheckOut, 'yyyy-MM-dd'),
        adults: 2,
        children: 0,
        babies: 0,
        pets: 0
    });

    useEffect(() => {
        if (isModalOpen) {
            const dCheckIn = addDays(new Date(), 2);
            const dCheckOut = addDays(dCheckIn, 2);
            setFormData(prev => ({
                ...prev,
                checkInDate: format(dCheckIn, 'yyyy-MM-dd'),
                checkOutDate: format(dCheckOut, 'yyyy-MM-dd'),
            }));
        }
    }, [isModalOpen]);

    const handleCpfBlur = async () => {
        const cleanCpf = formData.cpf.replace(/\D/g, '');
        if (cleanCpf.length === 0) {
            setCpfError(false);
            return;
        }

        if (!isValidCPF(cleanCpf)) {
            setCpfError(true);
            toast.error("CPF Inválido");
            return;
        }

        setCpfError(false);
        setIsSearching(true);
        
        try {
            const response = await fetch('/api/admin/guests/lookup-by-cpf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpf: cleanCpf }),
            });

            if (response.ok) {
                const guest = await response.json();
                
                if (guest) {
                    toast.success("Hóspede encontrado!");
                    setFormData(prev => ({
                        ...prev,
                        guestName: guest.name || prev.guestName,
                        guestPhone: guest.phone || prev.guestPhone
                    }));
                } else {
                    toast.info("CPF novo. Prossiga com o cadastro.");
                }
            }
        } catch (error) {
            console.error("Erro busca CPF", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleClose = () => {
        const dCheckIn = addDays(new Date(), 2);
        const dCheckOut = addDays(dCheckIn, 2);
        
        setFormData({
            cpf: "", 
            guestName: "", 
            guestPhone: "", 
            cabinId: "", 
            checkInDate: format(dCheckIn, 'yyyy-MM-dd'),
            checkOutDate: format(dCheckOut, 'yyyy-MM-dd'),
            adults: 2, children: 0, babies: 0, pets: 0
        });
        setCpfError(false);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanCpf = formData.cpf.replace(/\D/g, '');
        
        if (cleanCpf.length > 0 && !isValidCPF(cleanCpf)) {
            toast.error("Corrija o CPF antes de continuar.");
            return;
        }

        if (!formData.guestName || !formData.guestPhone || !formData.cabinId || !formData.checkInDate || !formData.checkOutDate) {
            toast.error("Preencha os campos obrigatórios (*)");
            return;
        }

        setIsLoading(true);
        try {
            const result = await createFastStayAction({
                cpf: cleanCpf || undefined,
                guestName: formData.guestName,
                guestPhone: formData.guestPhone,
                cabinId: formData.cabinId,
                checkInDate: formData.checkInDate,
                checkOutDate: formData.checkOutDate,
                guests: {
                    adults: Number(formData.adults),
                    children: Number(formData.children),
                    babies: Number(formData.babies),
                    pets: Number(formData.pets)
                }
            });

            if (result.success) {
                toast.success("Sucesso!", { description: result.message });
                handleClose();
            } else {
                toast.error("Erro", { description: result.message });
            }
        } catch (error) {
            toast.error("Erro inesperado ao criar estadia.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isModalOpen} onOpenChange={handleClose}>
            {/* CORREÇÃO AQUI: onInteractOutside previne fechar ao clicar fora */}
            <DialogContent 
                className="sm:max-w-[650px]"
                onInteractOutside={(e) => {
                    e.preventDefault();
                }}
            >
                <DialogHeader>
                    <DialogTitle>Estadia Rápida</DialogTitle>
                    <DialogDescription>
                        Preencha os dados básicos e a ocupação completa (incluindo pets).
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4 py-2">
                    <div className={`grid grid-cols-4 gap-4 items-end p-3 rounded-md border ${cpfError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
                        <div className="col-span-2">
                            <Label className={cpfError ? "text-red-700" : "text-blue-900 font-semibold"}>CPF (Opcional)</Label>
                            <div className="relative mt-1">
                                <Input 
                                    placeholder="Apenas números..." 
                                    value={formData.cpf}
                                    onChange={(e) => {
                                        setFormData({...formData, cpf: e.target.value});
                                        if(cpfError) setCpfError(false); 
                                    }}
                                    onBlur={handleCpfBlur}
                                    className={`pr-8 bg-white ${cpfError ? 'border-red-500' : ''}`}
                                    maxLength={14}
                                />
                                {isSearching && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-blue-500" />}
                            </div>
                        </div>
                        <div className={`col-span-2 text-xs pb-2 ${cpfError ? 'text-red-600' : 'text-blue-700'}`}>
                            <AlertCircle className="inline h-3 w-3 mr-1"/>
                            {cpfError ? "CPF Inválido." : "Busca automática de cadastro."}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Nome Completo *</Label>
                            <Input 
                                value={formData.guestName}
                                onChange={(e) => setFormData({...formData, guestName: e.target.value})}
                                placeholder="Ex: João da Silva"
                            />
                        </div>
                        <div>
                            <Label>WhatsApp (com DDD) *</Label>
                            <Input 
                                value={formData.guestPhone}
                                onChange={(e) => setFormData({...formData, guestPhone: e.target.value})}
                                placeholder="31 99999-9999"
                                className="bg-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <Label>Cabana *</Label>
                            <Select 
                                value={formData.cabinId} 
                                onValueChange={(v) => setFormData({...formData, cabinId: v})}
                            >
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <div className="max-h-[200px] overflow-y-auto">
                                        {cabins.length > 0 ? (
                                            cabins.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                                        ) : (
                                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                                        )}
                                    </div>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Entrada *</Label>
                            <Input type="date" value={formData.checkInDate} onChange={(e) => setFormData({...formData, checkInDate: e.target.value})} />
                        </div>
                        <div>
                            <Label>Saída *</Label>
                            <Input type="date" value={formData.checkOutDate} onChange={(e) => setFormData({...formData, checkOutDate: e.target.value})} />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                        <Label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Ocupação (ACFP)</Label>
                        <div className="grid grid-cols-4 gap-3">
                            <div>
                                <Label className="text-xs mb-1 flex items-center gap-1"><Users className="h-3 w-3"/> Adultos</Label>
                                <Input type="number" min="1" className="bg-white" value={formData.adults} onChange={(e) => setFormData({...formData, adults: Number(e.target.value)})} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1 flex items-center gap-1"><User className="h-3 w-3"/> Crianças</Label>
                                <Input type="number" min="0" className="bg-white" value={formData.children} onChange={(e) => setFormData({...formData, children: Number(e.target.value)})} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1 flex items-center gap-1"><Baby className="h-3 w-3"/> Bebês</Label>
                                <Input type="number" min="0" className="bg-white" value={formData.babies} onChange={(e) => setFormData({...formData, babies: Number(e.target.value)})} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1 flex items-center gap-1 text-orange-700 font-semibold"><PawPrint className="h-3 w-3"/> Pets</Label>
                                <Input type="number" min="0" className="bg-white border-orange-200 focus-visible:ring-orange-500" value={formData.pets} onChange={(e) => setFormData({...formData, pets: Number(e.target.value)})} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button type="button" variant="ghost" onClick={handleClose} className="mr-2">Cancelar</Button>
                        <Button type="submit" disabled={isLoading || cpfError} className="bg-green-700 hover:bg-green-800 text-white">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                            Criar Estadia
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};