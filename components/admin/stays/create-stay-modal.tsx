"use client";

import { useModalStore } from "@/hooks/use-modal-store";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { createFastStayAction } from "@/app/actions/create-fast-stay";

// --- FUNÇÃO DE VALIDAÇÃO DE CPF ---
function validateCPF(cpf: string): boolean {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) 
        sum = sum + parseInt(cpf.substring(i-1, i)) * (11 - i);
    
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) 
        sum = sum + parseInt(cpf.substring(i-1, i)) * (12 - i);
    
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
}

export const CreateStayModal = () => {
    // Pegamos as 'cabins' que foram passadas pelo onOpen
    const { isOpen, type, onClose, data } = useModalStore();
    const cabins = data.cabins || []; // Lista real do Firestore
    
    const isModalOpen = isOpen && type === "createStay";

    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [cpfError, setCpfError] = useState(false);
    
    const [formData, setFormData] = useState({
        cpf: "",
        guestName: "",
        guestPhone: "",
        cabinId: "",
        checkInDate: "",
        checkOutDate: "",
        adults: 2,
        children: 0,
        babies: 0
    });

    const handleCpfBlur = async () => {
        const cleanCpf = formData.cpf.replace(/\D/g, '');
        
        // Se estiver vazio, limpa erro e sai (pois é opcional no início, mas se digitar tem que ser válido)
        if (cleanCpf.length === 0) {
            setCpfError(false);
            return;
        }

        // 1. Validação Matemática
        if (!validateCPF(cleanCpf)) {
            setCpfError(true);
            toast.error("CPF Inválido");
            return;
        }
        setCpfError(false);

        // 2. Busca no Banco
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
        setFormData({
            cpf: "", guestName: "", guestPhone: "", cabinId: "", checkInDate: "", checkOutDate: "",
            adults: 2, children: 0, babies: 0
        });
        setCpfError(false);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validação final antes de enviar
        const cleanCpf = formData.cpf.replace(/\D/g, '');
        if (cleanCpf.length > 0 && !validateCPF(cleanCpf)) {
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
                    babies: Number(formData.babies)
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
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Estadia Rápida (Recepção)</DialogTitle>
                    <DialogDescription>
                        Preencha os dados básicos. O hóspede receberá um link para completar o cadastro.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4 py-2">
                    {/* Linha 1: CPF */}
                    <div className={`grid grid-cols-4 gap-4 items-end p-3 rounded-md border ${cpfError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
                        <div className="col-span-2">
                            <Label className={cpfError ? "text-red-700" : "text-blue-900 font-semibold"}>
                                {cpfError ? "CPF Inválido" : "CPF do Hóspede (Opcional)"}
                            </Label>
                            <div className="relative mt-1">
                                <Input 
                                    placeholder="Apenas números..." 
                                    value={formData.cpf}
                                    onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                                    onBlur={handleCpfBlur}
                                    className={`pr-8 bg-white ${cpfError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    maxLength={14}
                                />
                                {isSearching && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-blue-500" />}
                            </div>
                        </div>
                        <div className={`col-span-2 text-xs pb-2 ${cpfError ? 'text-red-600' : 'text-blue-700'}`}>
                            <AlertCircle className="inline h-3 w-3 mr-1"/>
                            {cpfError 
                                ? "Verifique os dígitos do CPF." 
                                : "Se encontrar, preenchemos nome e telefone automaticamente."}
                        </div>
                    </div>

                    {/* Linha 2: Dados Básicos */}
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
                            />
                        </div>
                    </div>

                    {/* Linha 3: Reserva */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <Label>Cabana *</Label>
                            <Select 
                                value={formData.cabinId} 
                                onValueChange={(v) => setFormData({...formData, cabinId: v})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {cabins.length > 0 ? (
                                        cabins.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="loading" disabled>Carregando cabanas...</SelectItem>
                                    )}
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

                    {/* Linha 4: Ocupação */}
                    <div className="bg-gray-50 p-3 rounded-md">
                        <Label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Ocupação (ACF)</Label>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Label className="text-xs">Adultos</Label>
                                <Input type="number" min="1" value={formData.adults} onChange={(e) => setFormData({...formData, adults: Number(e.target.value)})} />
                            </div>
                            <div className="flex-1">
                                <Label className="text-xs">Crianças</Label>
                                <Input type="number" min="0" value={formData.children} onChange={(e) => setFormData({...formData, children: Number(e.target.value)})} />
                            </div>
                            <div className="flex-1">
                                <Label className="text-xs">Free</Label>
                                <Input type="number" min="0" value={formData.babies} onChange={(e) => setFormData({...formData, babies: Number(e.target.value)})} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button type="button" variant="ghost" onClick={handleClose} className="mr-2">Cancelar</Button>
                        <Button type="submit" disabled={isLoading || cpfError} className="bg-green-700 hover:bg-green-800 text-white">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                            Criar e Enviar Link
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};