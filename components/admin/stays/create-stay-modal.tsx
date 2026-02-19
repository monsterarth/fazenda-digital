"use client";

import { useModalStore } from "@/hooks/use-modal-store";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
// Removemos o componente Checkbox pesado para evitar o loop de refs
// import { Checkbox } from "@/components/ui/checkbox"; 
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
    Loader2, CheckCircle, AlertCircle, PawPrint, User, Users, Baby, Calendar, Home,
    CheckSquare, Square // Ícones visuais leves
} from "lucide-react";
import { createFastStayAction } from "@/app/actions/create-fast-stay";
import { addDays, format } from "date-fns";
import { Separator } from "@/components/ui/separator";

// Validação de CPF simples
function validateCPF(cpf: string): boolean {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    let sum = 0, remainder;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i-1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i-1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    return true;
}

interface GuestCount {
    adults: number;
    children: number;
    babies: number;
    pets: number;
}

export const CreateStayModal = () => {
    const { isOpen, type, onClose, data } = useModalStore();
    const cabins = data.cabins || [];
    const isModalOpen = isOpen && type === "createStay";

    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [cpfError, setCpfError] = useState(false);
    
    // Datas Padrão
    const today = new Date();
    const defaultCheckIn = addDays(today, 0); 
    const defaultCheckOut = addDays(defaultCheckIn, 1);

    // Estado do Formulário
    const [basicData, setBasicData] = useState({
        cpf: "",
        guestName: "",
        guestPhone: "",
        checkInDate: format(defaultCheckIn, 'yyyy-MM-dd'),
        checkOutDate: format(defaultCheckOut, 'yyyy-MM-dd'),
    });

    const [selectedCabinIds, setSelectedCabinIds] = useState<string[]>([]);
    const [cabinConfigs, setCabinConfigs] = useState<Record<string, GuestCount>>({});

    // Reset ao abrir
    useEffect(() => {
        if (isModalOpen) {
            setBasicData(prev => ({
                ...prev,
                checkInDate: format(new Date(), 'yyyy-MM-dd'),
                checkOutDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
            }));
            setSelectedCabinIds([]);
            setCabinConfigs({});
        }
    }, [isModalOpen]);

    const handleCpfBlur = async () => {
        const cleanCpf = basicData.cpf.replace(/\D/g, '');
        if (cleanCpf.length === 0) {
            setCpfError(false);
            return;
        }
        if (!validateCPF(cleanCpf)) {
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
                    setBasicData(prev => ({
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

    // Toggle de Seleção
    const handleCabinToggle = (cabinId: string) => {
        setSelectedCabinIds(prev => {
            const isSelected = prev.includes(cabinId);
            if (isSelected) {
                // Remove ID
                const newIds = prev.filter(id => id !== cabinId);
                // Remove Config (efeito colateral síncrono no state de config)
                setCabinConfigs(curr => {
                    const next = { ...curr };
                    delete next[cabinId];
                    return next;
                });
                return newIds;
            } else {
                // Adiciona ID
                const newIds = [...prev, cabinId];
                // Adiciona Config Padrão
                setCabinConfigs(curr => ({
                    ...curr,
                    [cabinId]: { adults: 2, children: 0, babies: 0, pets: 0 }
                }));
                return newIds;
            }
        });
    };

    const updateCabinConfig = (cabinId: string, field: keyof GuestCount, value: number) => {
        setCabinConfigs(prev => ({
            ...prev,
            [cabinId]: {
                ...prev[cabinId],
                [field]: value
            }
        }));
    };

    const handleClose = () => {
        setBasicData({
            cpf: "", guestName: "", guestPhone: "", 
            checkInDate: format(new Date(), 'yyyy-MM-dd'),
            checkOutDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        });
        setSelectedCabinIds([]);
        setCabinConfigs({});
        setCpfError(false);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const cleanCpf = basicData.cpf.replace(/\D/g, '');
        if (cleanCpf.length > 0 && !validateCPF(cleanCpf)) {
            toast.error("Corrija o CPF antes de continuar.");
            return;
        }
        if (!basicData.guestName || !basicData.guestPhone || selectedCabinIds.length === 0 || !basicData.checkInDate || !basicData.checkOutDate) {
            toast.error("Preencha todos os dados e selecione ao menos uma cabana.");
            return;
        }

        setIsLoading(true);
        try {
            const payloadConfigs = selectedCabinIds.map(id => ({
                cabinId: id,
                guests: cabinConfigs[id] || { adults: 2, children: 0, babies: 0, pets: 0 }
            }));

            const result = await createFastStayAction({
                cpf: cleanCpf || undefined,
                guestName: basicData.guestName,
                guestPhone: basicData.guestPhone,
                cabinConfigurations: payloadConfigs,
                checkInDate: basicData.checkInDate,
                checkOutDate: basicData.checkOutDate,
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
            <DialogContent 
                className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col"
                onPointerDownOutside={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Nova Estadia Rápida</DialogTitle>
                    <DialogDescription>
                        Configure os detalhes da reserva. Para grupos, selecione múltiplas cabanas.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 space-y-4 py-2">
                    {/* Linha 1: CPF */}
                    <div className={`grid grid-cols-4 gap-4 items-end p-3 rounded-md border ${cpfError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
                        <div className="col-span-2">
                            <Label className={cpfError ? "text-red-700" : "text-blue-900 font-semibold"}>CPF (Opcional)</Label>
                            <div className="relative mt-1">
                                <Input 
                                    placeholder="Apenas números..." 
                                    value={basicData.cpf}
                                    onChange={(e) => setBasicData({...basicData, cpf: e.target.value})}
                                    onBlur={handleCpfBlur}
                                    className={`pr-8 bg-white ${cpfError ? 'border-red-500' : ''}`}
                                    maxLength={14}
                                />
                                {isSearching && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-blue-500" />}
                            </div>
                        </div>
                        <div className={`col-span-2 text-xs pb-2 ${cpfError ? 'text-red-600' : 'text-blue-700'}`}>
                            <AlertCircle className="inline h-3 w-3 mr-1"/>
                            {cpfError ? "CPF Inválido." : "Busca automática no histórico."}
                        </div>
                    </div>

                    {/* Linha 2: Dados do Líder */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Nome Completo (Líder) *</Label>
                            <Input 
                                value={basicData.guestName}
                                onChange={(e) => setBasicData({...basicData, guestName: e.target.value})}
                                placeholder="Ex: João da Silva"
                            />
                        </div>
                        <div>
                            <Label>WhatsApp do Líder *</Label>
                            <Input 
                                value={basicData.guestPhone}
                                onChange={(e) => setBasicData({...basicData, guestPhone: e.target.value})}
                                placeholder="31 99999-9999"
                            />
                        </div>
                    </div>

                    {/* Linha 3: Datas */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-100">
                        <div>
                            <Label className="flex items-center gap-2 text-xs"><Calendar className="h-3 w-3 text-blue-600"/> Data Entrada *</Label>
                            <Input type="date" className="bg-white h-9" value={basicData.checkInDate} onChange={(e) => setBasicData({...basicData, checkInDate: e.target.value})} />
                        </div>
                        <div>
                            <Label className="flex items-center gap-2 text-xs"><Calendar className="h-3 w-3 text-red-600"/> Data Saída *</Label>
                            <Input type="date" className="bg-white h-9" value={basicData.checkOutDate} onChange={(e) => setBasicData({...basicData, checkOutDate: e.target.value})} />
                        </div>
                    </div>

                    <Separator />

                    {/* SELEÇÃO DE CABANAS */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold flex items-center gap-2 text-slate-800">
                            <Home className="h-4 w-4" /> Distribuição de Hóspedes
                        </Label>
                        <p className="text-xs text-slate-500">Selecione as unidades e informe a quantidade de hóspedes EM CADA uma.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Lista de Seleção (Esquerda) */}
                            <div className="md:col-span-1 border rounded-md p-2 bg-slate-50 h-[320px] flex flex-col">
                                <Label className="text-xs font-bold text-slate-500 uppercase mb-2">Disponíveis</Label>
                                <ScrollArea className="flex-1">
                                    <div className="space-y-1">
                                        {cabins.map(cabin => {
                                            const isSelected = selectedCabinIds.includes(cabin.id);
                                            return (
                                                <div 
                                                    key={cabin.id} 
                                                    className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors border select-none ${isSelected ? 'bg-blue-100 border-blue-300' : 'bg-white border-transparent hover:border-slate-200'}`}
                                                    onClick={() => handleCabinToggle(cabin.id)}
                                                >
                                                    {/* Substituído Checkbox por Ícones Leves */}
                                                    {isSelected ? (
                                                        <CheckSquare className="h-4 w-4 text-blue-700 shrink-0" />
                                                    ) : (
                                                        <Square className="h-4 w-4 text-slate-300 shrink-0" />
                                                    )}
                                                    <div className="flex-1">
                                                        <span className="text-sm font-medium block text-slate-900">{cabin.name}</span>
                                                        <span className="text-[10px] text-slate-500 block">Capacidade: {cabin.capacity}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Configuração Individual (Direita) */}
                            <div className="md:col-span-2 border rounded-md p-2 h-[320px] flex flex-col bg-slate-50">
                                <Label className="text-xs font-bold text-slate-500 uppercase mb-2">Ocupação ({selectedCabinIds.length})</Label>
                                <ScrollArea className="flex-1 pr-3">
                                    {selectedCabinIds.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                            Selecione uma cabana ao lado para configurar.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {selectedCabinIds.map(cabinId => {
                                                const cabin = cabins.find(c => c.id === cabinId);
                                                const config = cabinConfigs[cabinId] || { adults: 2, children: 0, babies: 0, pets: 0 };
                                                
                                                return (
                                                    <div key={cabinId} className="bg-white p-3 rounded border shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="flex items-center justify-between mb-3 border-b pb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm text-blue-900">{cabin?.name}</span>
                                                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 border">Máx: {cabin?.capacity}</span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-3">
                                                            <div>
                                                                <Label className="text-[10px] mb-1.5 flex items-center gap-1 font-semibold text-slate-600"><Users className="h-3 w-3"/> Adultos</Label>
                                                                <Input type="number" min="1" className="h-8 text-sm" value={config.adults} onChange={(e) => updateCabinConfig(cabinId, 'adults', Number(e.target.value))} />
                                                            </div>
                                                            <div>
                                                                <Label className="text-[10px] mb-1.5 flex items-center gap-1 font-semibold text-slate-600"><User className="h-3 w-3"/> Crianças</Label>
                                                                <Input type="number" min="0" className="h-8 text-sm" value={config.children} onChange={(e) => updateCabinConfig(cabinId, 'children', Number(e.target.value))} />
                                                            </div>
                                                            <div>
                                                                <Label className="text-[10px] mb-1.5 flex items-center gap-1 font-semibold text-slate-600"><Baby className="h-3 w-3"/> Bebês</Label>
                                                                <Input type="number" min="0" className="h-8 text-sm" value={config.babies} onChange={(e) => updateCabinConfig(cabinId, 'babies', Number(e.target.value))} />
                                                            </div>
                                                            <div>
                                                                <Label className="text-[10px] mb-1.5 flex items-center gap-1 font-semibold text-orange-700"><PawPrint className="h-3 w-3"/> Pets</Label>
                                                                <Input type="number" min="0" className="h-8 text-sm border-orange-200 bg-orange-50 focus-visible:ring-orange-500" value={config.pets} onChange={(e) => updateCabinConfig(cabinId, 'pets', Number(e.target.value))} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        </div>
                    </div>
                </form>

                <div className="flex justify-end pt-4 border-t mt-auto">
                    <Button type="button" variant="ghost" onClick={handleClose} className="mr-2">Cancelar</Button>
                    <Button type="submit" onClick={handleSubmit} disabled={isLoading || cpfError || selectedCabinIds.length === 0} className="bg-green-700 hover:bg-green-800 text-white shadow-md">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                        Gerar Link
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};