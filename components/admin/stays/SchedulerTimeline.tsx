"use client";

import React, { useState, useMemo, useRef } from 'react';
import { 
    format, addDays, subDays, differenceInDays, 
    isToday, startOfDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
    Loader2, MoreHorizontal, LogOut, LogIn, Edit, Eye, MessageCircle, CheckCircle2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from '@/components/ui/tooltip';
import { Cabin, Stay } from '@/types';
import { cn } from '@/lib/utils';

interface SchedulerTimelineProps {
    cabins: Cabin[];
    stays: Stay[];
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onAction: (action: 'edit' | 'checkout' | 'checkin' | 'details' | 'whatsapp' | 'validate', stay: Stay) => void;
    isLoading?: boolean;
}

const CELL_WIDTH = 64; 
const ROW_HEIGHT = 60; 
const SIDEBAR_WIDTH = 200;

// Função auxiliar para data local
const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const cleanDate = dateStr.split('T')[0];
    const [year, month, day] = cleanDate.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export function SchedulerTimeline({ 
    cabins, 
    stays, 
    currentDate, 
    onDateChange,
    onAction,
    isLoading
}: SchedulerTimelineProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const daysToShow = 30;
    
    // Inicia 3 dias antes
    const startDate = useMemo(() => subDays(currentDate, 3), [currentDate]);

    const calendarDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < daysToShow; i++) {
            days.push(addDays(startDate, i));
        }
        return days;
    }, [startDate]);

    const handlePrevClick = () => onDateChange(subDays(currentDate, 7));
    const handleNextClick = () => onDateChange(addDays(currentDate, 7));
    const handleTodayClick = () => onDateChange(new Date());

    // --- RENDERIZAÇÃO DA FITA ---
    const renderStayBlock = (stay: Stay) => {
        const checkIn = parseLocalDate(stay.checkInDate);
        const checkOut = parseLocalDate(stay.checkOutDate);
        const startCalendarNorm = startOfDay(startDate);
        
        const offsetDays = differenceInDays(checkIn, startCalendarNorm);
        const durationDays = differenceInDays(checkOut, checkIn);
        
        // Ajuste Visual: Meio do dia
        const halfDayOffset = CELL_WIDTH / 2;
        let leftPos = (offsetDays * CELL_WIDTH) + halfDayOffset;
        let widthPx = (durationDays * CELL_WIDTH);

        if (leftPos < 0) {
            widthPx += leftPos;
            leftPos = 0;
        }

        if (widthPx <= 4) return null;
        if (leftPos > daysToShow * CELL_WIDTH) return null;

        // --- LÓGICA DE CORES (SOLICITADA) ---
        let bgClass = "bg-slate-400 border-slate-500 text-white"; // Default (Checked out / etc)

        // 1. Aguardando Hóspede -> AMARELO
        if (stay.status === 'pending_guest_data') {
            bgClass = "bg-yellow-400 border-yellow-500 text-yellow-900 hover:bg-yellow-500";
        }
        // 2. Aguardando Validação -> VERDE
        else if (stay.status === 'pending_validation') {
            bgClass = "bg-green-500 border-green-600 text-white hover:bg-green-600";
        }
        // 3. Ocorrendo (Ativa) -> VERMELHO
        else if (stay.status === 'active') {
            bgClass = "bg-red-500 border-red-600 text-white hover:bg-red-600";
        }
        // 4. Check-out
        else if (stay.status === 'checked_out') {
             bgClass = "bg-slate-400 border-slate-500 opacity-70 text-white hover:bg-slate-500";
        }

        // --- LÓGICA DE PULSO (ATRASADO) ---
        // Se está ativa e deveria ter saído antes de hoje
        const today = startOfDay(new Date());
        const isLate = stay.status === 'active' && checkOut < today;
        
        if (isLate) {
            // Mantém vermelho mas pulsa forte e adiciona borda grossa
            bgClass = "bg-red-600 border-red-800 text-white animate-pulse ring-2 ring-red-300";
        }

        return (
            <DropdownMenu key={stay.id}>
                <TooltipProvider>
                    <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            {/* O Trigger do Dropdown precisa ser o filho direto do TooltipTrigger */}
                            <DropdownMenuTrigger asChild>
                                <button
                                    className={cn(
                                        "absolute top-2 h-[44px] rounded-md border text-[10px] text-left px-2 overflow-hidden whitespace-nowrap transition-all z-10 flex flex-col justify-center leading-tight outline-none shadow-sm",
                                        bgClass
                                    )}
                                    style={{
                                        left: `${leftPos}px`,
                                        width: `${Math.max(widthPx - 2, 8)}px`
                                    }}
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <span className="font-bold truncate">{stay.guestName}</span>
                                        {widthPx > 80 && isLate && (
                                            <span className="text-[9px] bg-white/20 px-1 rounded ml-1 animate-none">ATRASADO</span>
                                        )}
                                    </div>
                                    {widthPx > 40 && <span className="opacity-90 truncate">{stay.numberOfGuests} pax</span>}
                                </button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        
                        <TooltipContent side="top" className="text-xs z-50">
                            <p className="font-bold">{stay.guestName}</p>
                            <p>Status: {
                                stay.status === 'active' ? 'Ocorrendo' : 
                                stay.status === 'pending_guest_data' ? 'Aguardando Hóspede' :
                                stay.status === 'pending_validation' ? 'Aguardando Validação' : 
                                stay.status
                            }</p>
                            <p>{format(parseLocalDate(stay.checkInDate), 'dd/MM')} - {format(parseLocalDate(stay.checkOutDate), 'dd/MM')}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <DropdownMenuContent align="start" className="w-56 z-50">
                    <DropdownMenuLabel className="truncate">
                        {stay.guestName}
                        {isLate && <span className="ml-2 text-[10px] text-red-500 font-bold">(Atrasado)</span>}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={() => onAction('details', stay)}>
                        <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => onAction('edit', stay)}>
                        <Edit className="mr-2 h-4 w-4" /> Editar Estadia
                    </DropdownMenuItem>

                    {stay.status === 'active' && (
                        <DropdownMenuItem onClick={() => onAction('checkout', stay)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                            <LogOut className="mr-2 h-4 w-4" /> Realizar Check-out
                        </DropdownMenuItem>
                    )}

                    {stay.status === 'pending_validation' && (
                        <DropdownMenuItem onClick={() => onAction('validate', stay)} className="text-green-600 focus:text-green-600 focus:bg-green-50">
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Validar Check-in
                        </DropdownMenuItem>
                    )}

                    {stay.status === 'pending_guest_data' && (
                         <DropdownMenuItem onClick={() => onAction('whatsapp', stay)} className="text-blue-600">
                            <MessageCircle className="mr-2 h-4 w-4" /> Reenviar Link
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={() => onAction('whatsapp', stay)}>
                        <MessageCircle className="mr-2 h-4 w-4 text-green-500" /> WhatsApp
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm w-full max-w-full">
            {/* CONTROLES */}
            <div className="flex items-center justify-between p-3 border-b bg-white z-20 shrink-0">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handlePrevClick}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center">
                        <CalendarIcon className="h-4 w-4 text-slate-500" />
                        <span className="font-medium text-sm">
                            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                        </span>
                    </div>
                    <Button variant="outline" size="icon" onClick={handleNextClick}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleTodayClick} className="text-xs">
                        Hoje
                    </Button>
                </div>
                
                {/* Legenda Opcional */}
                <div className="hidden md:flex items-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-red-500"/> Ocorrendo</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-green-500"/> Validar</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-yellow-400"/> Aguardando</div>
                </div>
            </div>

            {/* AREA PRINCIPAL */}
            <div className="flex-1 flex overflow-hidden relative min-h-0 w-full">
                
                {/* 1. COLUNA LATERAL (CABANAS) */}
                <div 
                    className="flex-none bg-white border-r z-30 shadow-[4px_0_10px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col h-full"
                    style={{ width: `${SIDEBAR_WIDTH}px` }}
                >
                    <div className="h-10 border-b bg-slate-50 flex items-center px-4 shrink-0">
                        <span className="text-xs font-bold text-slate-500 uppercase">Acomodação</span>
                    </div>
                </div>

                {/* 2. ÁREA DE SCROLL (MAPA) */}
                <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-auto bg-slate-50/30 relative w-full"
                >
                    <div style={{ width: `${SIDEBAR_WIDTH + (daysToShow * CELL_WIDTH)}px`, minWidth: '100%' }}>
                        
                        {/* HEADER DA TABELA (DIAS) */}
                        <div className="sticky top-0 z-20 flex bg-white border-b h-10 shadow-sm w-full">
                            <div 
                                className="sticky left-0 z-30 bg-white border-r h-full shadow-[2px_0_5px_rgba(0,0,0,0.05)]"
                                style={{ width: `${SIDEBAR_WIDTH}px` }}
                            />

                            {calendarDays.map((day, i) => {
                                const isCurrentDay = isToday(day);
                                return (
                                    <div 
                                        key={i}
                                        className={cn(
                                            "flex-none border-r flex flex-col items-center justify-center text-xs",
                                            isCurrentDay ? "bg-blue-50/50" : "bg-white"
                                        )}
                                        style={{ width: `${CELL_WIDTH}px` }}
                                    >
                                        <span className={cn("font-bold uppercase text-[10px]", isCurrentDay ? "text-blue-600" : "text-slate-400")}>
                                            {format(day, 'EEE', { locale: ptBR })}
                                        </span>
                                        <span className={cn("font-semibold", isCurrentDay ? "text-blue-600" : "text-slate-700")}>
                                            {format(day, 'dd')}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* CORPO DA TABELA */}
                        <div className="relative">
                            <div className="absolute inset-0 z-0 flex pointer-events-none" style={{ paddingLeft: `${SIDEBAR_WIDTH}px` }}>
                                {calendarDays.map((day, i) => (
                                    <div 
                                        key={i} 
                                        className={cn("flex-none border-r h-full", isToday(day) ? "bg-blue-50/20" : "")}
                                        style={{ width: `${CELL_WIDTH}px` }} 
                                    />
                                ))}
                            </div>

                            {cabins.map((cabin) => (
                                <div 
                                    key={cabin.id}
                                    className="relative flex w-full hover:bg-slate-50/50 transition-colors group"
                                    style={{ height: `${ROW_HEIGHT}px` }}
                                >
                                    {/* Sidebar Item (STICKY LEFT) */}
                                    <div 
                                        className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-b flex items-center px-4 gap-3 transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.02)]"
                                        style={{ width: `${SIDEBAR_WIDTH}px` }}
                                    >
                                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs border shrink-0">
                                            {cabin.posicao || "#"}
                                        </div>
                                        <div className="flex flex-col overflow-hidden min-w-0">
                                            <span className="text-sm font-medium truncate text-slate-700">
                                                {cabin.name}
                                            </span>
                                            <span className="text-[10px] text-slate-400 truncate">
                                                Cap: {cabin.capacity}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="relative flex-1 border-b">
                                        {stays
                                            .filter(s => s.cabinId === cabin.id)
                                            .map(stay => renderStayBlock(stay))
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {isLoading && (
                <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            )}
        </div>
    );
}