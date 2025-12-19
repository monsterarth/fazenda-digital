//components\admin\stays\stays-list.tsx
"use client";

import React, { useState, useTransition, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { Stay, Cabin, PetDetails } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isSameDay, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { 
    Edit, Printer, MoreHorizontal, LogOut, Loader2, 
    AlertCircle, LogIn, Clock, CalendarDays, ArrowUpDown, ArrowUp, ArrowDown,
    MessageCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ThermalCoupon } from './thermal-coupon';
import { useModalStore } from '@/hooks/use-modal-store';
import { finalizeStayAction } from '@/app/actions/finalize-stay';
import { Badge } from '@/components/ui/badge';

interface StaysListProps {
    stays: Stay[];
    cabins?: Cabin[];
    onAction?: (action: string, stay: Stay) => void;
}

type SortKey = 'cabin' | 'guest' | 'checkout' | 'status';
type SortDirection = 'asc' | 'desc';

export const StaysList: React.FC<StaysListProps> = ({ stays, cabins = [], onAction }) => {
    const { user } = useAuth();
    const { onOpen } = useModalStore();
    
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [stayToEnd, setStayToEnd] = useState<Stay | null>(null);
    const [isPending, startTransition] = useTransition();

    // Estado de Ordenação
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
        key: 'cabin',
        direction: 'asc'
    });

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-3 w-3 text-slate-400" />;
        return sortConfig.direction === 'asc' 
            ? <ArrowUp className="ml-2 h-3 w-3 text-slate-900" />
            : <ArrowDown className="ml-2 h-3 w-3 text-slate-900" />;
    };

    // --- HELPER: CÁLCULO ACFP CORRIGIDO ---
    const getACFPData = (stay: Stay) => {
        let adults = 1; // Titular
        let children = 0;
        let free = 0;
        let petsCount = 0;
        
        const names: string[] = [`${stay.guestName} (Titular)`];

        // 1. Tenta ler os acompanhantes salvos diretamente na estadia (Novo padrão)
        const companions = stay.companions || [];
        
        // 2. Tenta ler pets (suportando array ou objeto legado)
        const pets = Array.isArray(stay.pets) ? stay.pets : [];

        if (companions.length > 0) {
             companions.forEach(comp => {
                 if (comp.category === 'adult') {
                     adults++;
                     names.push(`${comp.fullName} (Adulto)`);
                 } else if (comp.category === 'child') {
                     children++;
                     names.push(`${comp.fullName} (Criança)`);
                 } else if (comp.category === 'baby') {
                     free++;
                     names.push(`${comp.fullName} (Bebê)`);
                 } else if (comp.age) {
                     // Lógica Legada (caso venha de um check-in antigo)
                     const age = Number(comp.age);
                     names.push(`${comp.fullName} (${age} anos)`);
                     if (age >= 12) adults++;
                     else if (age >= 2) children++;
                     else free++;
                 } else {
                     // Se não tiver categoria nem idade, assume adulto
                     adults++;
                     names.push(comp.fullName);
                 }
             });
        } else {
            // Se não tiver lista de nomes, usa o contador numérico como fallback
            const total = stay.numberOfGuests || 1;
            if (total > 1) {
                adults = total;
                names.push(`+ ${total - 1} acompanhantes (nomes não registrados)`);
            }
        }

        if (pets.length > 0) {
             pets.forEach((p: any) => {
                 petsCount++;
                 names.push(`Pet: ${p.name || 'Pet'}`);
             });
        }

        return {
            label: `${adults}A ${children}C ${free}F ${petsCount}P`,
            tooltip: names
        };
    };

    // --- ORDENAÇÃO ---
    const sortedStays = useMemo(() => {
        const positionMap = new Map(cabins.map(c => [c.id, c.posicao || 999]));
        const today = startOfDay(new Date());

        const getStatusWeight = (stay: Stay) => {
            const checkIn = new Date(stay.checkInDate);
            const checkOut = new Date(stay.checkOutDate);
            
            if (checkOut < today) return 1; 
            if (isSameDay(checkOut, today)) return 2; 
            if (isSameDay(checkIn, today)) return 3; 
            return 4; 
        };

        return [...stays].sort((a, b) => {
            let comparison = 0;
            switch (sortConfig.key) {
                case 'cabin':
                    const posA = positionMap.get(a.cabinId) ?? 999;
                    const posB = positionMap.get(b.cabinId) ?? 999;
                    comparison = posA - posB;
                    if (comparison === 0) comparison = a.cabinName.localeCompare(b.cabinName);
                    break;
                case 'guest': comparison = a.guestName.localeCompare(b.guestName); break;
                case 'checkout': comparison = new Date(a.checkOutDate).getTime() - new Date(b.checkOutDate).getTime(); break;
                case 'status': comparison = getStatusWeight(a) - getStatusWeight(b); break;
            }
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }, [stays, cabins, sortConfig]);

    // --- STATUS INFO ---
    const getStayStatusInfo = (stay: Stay) => {
        const checkIn = new Date(stay.checkInDate);
        const checkOut = new Date(stay.checkOutDate);
        const today = startOfDay(new Date());

        if (checkOut < today) return { 
            icon: <AlertCircle className="h-4 w-4 text-red-600 animate-pulse" />, 
            colorClass: "bg-red-100 text-red-800 border-red-200",
            label: "Atrasado",
            desc: `Deveria ter saído em ${format(checkOut, 'dd/MM')}`
        };
        if (isSameDay(checkOut, today)) return { 
            icon: <Clock className="h-4 w-4 text-orange-600" />, 
            colorClass: "bg-orange-100 text-orange-800 border-orange-200",
            label: "Saída Hoje",
            desc: "Check-out previsto para hoje"
        };
        if (isSameDay(checkIn, today)) return { 
            icon: <LogIn className="h-4 w-4 text-green-600" />, 
            colorClass: "bg-green-100 text-green-800 border-green-200",
            label: "Chegou Hoje",
            desc: "Entrada realizada hoje"
        };
        return { 
            icon: <CalendarDays className="h-4 w-4 text-blue-500" />, 
            colorClass: "bg-slate-100 text-slate-700 border-slate-200",
            label: "Hospedado",
            desc: "Estadia em andamento"
        };
    };

    const handleOpenEndStayDialog = (stay: Stay) => {
        setStayToEnd(stay);
        setIsAlertOpen(true);
    };

    const handleEndStay = () => {
        if (!stayToEnd || !user?.email) return;
        startTransition(async () => {
            const toastId = toast.loading("Finalizando...");
            try {
                const result = await finalizeStayAction(stayToEnd.id, user.email!);
                if (result.success) toast.success("Estadia encerrada!", { id: toastId });
                else toast.error("Erro ao finalizar", { id: toastId });
            } catch (error) {
                toast.error("Erro inesperado", { id: toastId });
            } finally {
                setIsAlertOpen(false);
                setStayToEnd(null);
            }
        });
    };

    const handlePrintCoupon = (stay: Stay) => {
        const qrUrl = `${window.location.origin}/?token=${stay.token}`;
        const printWindow = window.open('', '_blank', 'width=302,height=500');
        if (printWindow) {
            printWindow.document.write(`<html><head><title>Cupom</title></head><body><div id="print-root"></div></body></html>`);
            printWindow.document.close();
            const root = ReactDOM.createRoot(printWindow.document.getElementById('print-root')!);
            root.render(<ThermalCoupon stay={stay} qrUrl={qrUrl} propertyName="Fazenda do Rosa" />);
            setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 250);
        }
    };

    return (
        <>
            <div className="rounded-md border bg-white overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[100px]">
                                <Button variant="ghost" onClick={() => handleSort('cabin')} className="h-8 p-0 font-semibold text-slate-700">Cabana <SortIcon columnKey="cabin" /></Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => handleSort('guest')} className="h-8 p-0 font-semibold text-slate-700">Hóspede <SortIcon columnKey="guest" /></Button>
                            </TableHead>
                            
                            <TableHead className="w-[100px] text-center">ACFP</TableHead>
                            <TableHead className="w-[140px]">Telefone</TableHead>

                            <TableHead className="hidden md:table-cell">
                                <Button variant="ghost" onClick={() => handleSort('checkout')} className="h-8 p-0 font-semibold text-slate-700">Período <SortIcon columnKey="checkout" /></Button>
                            </TableHead>
                            <TableHead className="w-[80px] text-center">
                                <Button variant="ghost" onClick={() => handleSort('status')} className="h-8 p-0 font-semibold text-slate-700">Status <SortIcon columnKey="status" /></Button>
                            </TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedStays.length > 0 ? (
                            sortedStays.map(stay => {
                                const status = getStayStatusInfo(stay);
                                const acfp = getACFPData(stay);
                                const phone = stay.guestPhone || stay.guest?.phone;

                                return (
                                    <TableRow key={stay.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-center gap-2 cursor-help">
                                                            <div className="h-8 w-8 rounded-md bg-slate-100 border flex items-center justify-center font-bold text-slate-700">
                                                                {cabins.find(c => c.id === stay.cabinId)?.posicao ?? stay.cabinName.replace(/\D/g, '').substring(0,2)}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground truncate max-w-[80px] md:hidden">{stay.cabinName}</span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right">
                                                        <p className="font-bold">{stay.cabinName}</p>
                                                        {cabins.find(c => c.id === stay.cabinId)?.capacity && (
                                                            <p className="text-xs">Capacidade: {cabins.find(c => c.id === stay.cabinId)?.capacity} pax</p>
                                                        )}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900">{stay.guestName}</span>
                                                <span className="text-xs text-muted-foreground md:hidden">{format(new Date(stay.checkOutDate), "dd/MM")}</span>
                                            </div>
                                        </TableCell>

                                        {/* COLUNA ACFP (Tooltip Nomes) */}
                                        <TableCell className="text-center">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="outline" className="cursor-help font-mono bg-slate-50 hover:bg-slate-100">
                                                            {acfp.label}
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <div className="text-xs">
                                                            <p className="font-semibold mb-1 border-b pb-1">Lista de Hóspedes</p>
                                                            <ul className="list-disc pl-3 space-y-0.5">
                                                                {acfp.tooltip.map((name, i) => <li key={i}>{name}</li>)}
                                                            </ul>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>

                                        {/* COLUNA TELEFONE */}
                                        <TableCell>
                                            {phone ? (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-7 gap-2 px-2 text-slate-600 hover:text-green-600 hover:bg-green-50"
                                                    onClick={() => onAction && onAction('whatsapp_modal', stay)}
                                                >
                                                    <MessageCircle className="h-3.5 w-3.5" />
                                                    <span className="text-xs">{phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').substring(0, 15)}</span>
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic pl-2">--</span>
                                            )}
                                        </TableCell>

                                        <TableCell className="hidden md:table-cell">
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                <span>{format(new Date(stay.checkInDate), "dd/MM")}</span>
                                                <span className="text-slate-300">→</span>
                                                <span className={status.colorClass.includes('red') ? 'text-red-600 font-bold' : ''}>
                                                    {format(new Date(stay.checkOutDate), "dd/MM")}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* STATUS (Tooltip Status) */}
                                        <TableCell className="text-center">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className={`inline-flex items-center justify-center p-1.5 rounded-full border ${status.colorClass} cursor-help`}>
                                                            {status.icon}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left">
                                                        <div className="text-xs">
                                                            <p className="font-bold">{status.label}</p>
                                                            <p className="text-muted-foreground">{status.desc}</p>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Opções</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => onOpen('editStay', { stay })}><Edit className="mr-2 h-4 w-4" /> Editar / Detalhes</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handlePrintCoupon(stay)}><Printer className="mr-2 h-4 w-4" /> Imprimir Cupom</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onAction && onAction('whatsapp_modal', stay)} className="text-green-600"><MessageCircle className="mr-2 h-4 w-4" /> Enviar WhatsApp</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600 focus:bg-red-50" onClick={() => handleOpenEndStayDialog(stay)}><LogOut className="mr-2 h-4 w-4" /> Encerrar Estadia</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Nenhuma estadia ativa.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Check-out</AlertDialogTitle>
                        <AlertDialogDescription>Deseja encerrar a estadia de <b>{stayToEnd?.guestName}</b>?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleEndStay} disabled={isPending} className="bg-red-600 hover:bg-red-700">
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sim, Encerrar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};