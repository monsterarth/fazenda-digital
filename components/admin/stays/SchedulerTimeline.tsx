"use client";

import React, { useState, useMemo, useRef } from 'react';
import { 
    format, addDays, subDays, differenceInDays, 
    isToday, startOfDay, isWeekend 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
    Loader2, LogOut, Edit, MessageCircle, CheckCircle2
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
    holidays?: string[]; 
}

// --- CONFIGURAÇÕES VISUAIS ---
const CELL_WIDTH = 48;   
const ROW_HEIGHT = 52;   
const SIDEBAR_WIDTH = 150; 

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
    isLoading,
    holidays = [] 
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

    // Verifica se é Feriado
    const checkIsHoliday = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return holidays.includes(dateStr);
    };

    // --- RENDERIZAÇÃO DA FITA ---
    const renderStayBlock = (stay: Stay) => {
        const checkIn = parseLocalDate(stay.checkInDate);
        const checkOut = parseLocalDate(stay.checkOutDate);
        const startCalendarNorm = startOfDay(startDate);
        
        const offsetDays = differenceInDays(checkIn, startCalendarNorm);
        const durationDays = differenceInDays(checkOut, checkIn);
        
        const halfDayOffset = CELL_WIDTH / 2;
        let leftPos = (offsetDays * CELL_WIDTH) + halfDayOffset;
        let widthPx = (durationDays * CELL_WIDTH);

        if (leftPos < 0) {
            widthPx += leftPos;
            leftPos = 0;
        }

        if (widthPx <= 4) return null;
        if (leftPos > daysToShow * CELL_WIDTH) return null;

        let bgClass = "bg-slate-400 border-slate-500 text-white";

        if (stay.status === 'pending_guest_data') {
            bgClass = "bg-yellow-400 border-yellow-500 text-yellow-900 hover:bg-yellow-500";
        } else if (stay.status === 'pending_validation') {
            bgClass = "bg-green-500 border-green-600 text-white hover:bg-green-600";
        } else if (stay.status === 'active') {
            bgClass = "bg-red-500 border-red-600 text-white hover:bg-red-600";
        } else if (stay.status === 'checked_out') {
             bgClass = "bg-slate-400 border-slate-500 opacity-70 text-white hover:bg-slate-500";
        }

        const today = startOfDay(new Date());
        const isLate = stay.status === 'active' && checkOut < today;
        
        if (isLate) {
            bgClass = "bg-red-600 border-red-800 text-white animate-pulse ring-2 ring-red-300";
        }

        return (
            <DropdownMenu key={stay.id}>
                <TooltipProvider>
                    <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className={cn(
                                        "absolute top-1.5 h-[40px] rounded border text-[10px] text-left px-1.5 overflow-hidden whitespace-nowrap transition-all z-10 flex flex-col justify-center leading-tight outline-none shadow-sm",
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
                                            <span className="text-[9px] bg-white/20 px-1 rounded ml-1 animate-none font-bold">ATRASADO</span>
                                        )}
                                    </div>
                                    {widthPx > 40 && <span className="opacity-90 truncate text-[9px]">{stay.numberOfGuests} pax</span>}
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
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {/* --- CORREÇÃO: Botão Unificado --- */}
                    <DropdownMenuItem onClick={() => onAction('edit', stay)} className="font-medium">
                        <Edit className="mr-2 h-4 w-4" /> Detalhes / Editar
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
        <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm w-full max-w-full overflow-hidden">
            {/* CONTROLES */}
            <div className="flex items-center justify-between p-2 border-b bg-white z-20 shrink-0">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevClick}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2 px-2 min-w-[120px] justify-center">
                        <CalendarIcon className="h-4 w-4 text-slate-500" />
                        <span className="font-medium text-sm">
                            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                        </span>
                    </div>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextClick}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleTodayClick} className="text-xs h-8">
                        Hoje
                    </Button>
                </div>
                
                {/* Legenda Compacta */}
                <div className="hidden lg:flex items-center gap-3 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"/> Ocorrendo</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"/> Validar</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"/> Aguardando</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-200 border border-blue-400"/> Hoje</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-yellow-100 border border-yellow-200"/> Fim de Semana</div>
                </div>
            </div>

            {/* AREA DE SCROLL (MAPA) */}
            <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-auto bg-slate-50/30 relative w-full"
            >
                <div style={{ width: `${SIDEBAR_WIDTH + (daysToShow * CELL_WIDTH)}px`, minWidth: '100%' }}>
                    
                    {/* HEADER DA TABELA (DIAS) - STICKY TOP */}
                    <div className="sticky top-0 z-30 flex bg-white border-b h-10 shadow-sm w-full">
                        
                        {/* Canto Superior Esquerdo Fixo */}
                        <div 
                            className="sticky left-0 z-40 bg-slate-50 border-r h-full flex items-center px-2 font-bold text-xs text-slate-600 uppercase shadow-[2px_0_5px_rgba(0,0,0,0.05)]"
                            style={{ width: `${SIDEBAR_WIDTH}px` }}
                        >
                            Acomodações
                        </div>

                        {/* Dias do Calendário */}
                        {calendarDays.map((day, i) => {
                            const isCurrentDay = isToday(day);
                            const isSpecialDay = isWeekend(day) || checkIsHoliday(day);

                            return (
                                <div 
                                    key={i}
                                    className={cn(
                                        "flex-none border-r flex flex-col items-center justify-center text-xs transition-colors",
                                        isCurrentDay 
                                            ? "bg-blue-200 text-blue-900 border-b-2 border-b-blue-500 font-extrabold" 
                                            : isSpecialDay
                                                ? "bg-yellow-100/80 text-yellow-900 font-semibold"
                                                : "bg-white"
                                    )}
                                    style={{ width: `${CELL_WIDTH}px` }}
                                >
                                    <span className={cn(
                                        "font-bold uppercase text-[9px]", 
                                        isCurrentDay ? "text-blue-800" : isSpecialDay ? "text-yellow-700" : "text-slate-400"
                                    )}>
                                        {format(day, 'EEE', { locale: ptBR })}
                                    </span>
                                    <span className={cn(
                                        "font-semibold text-[11px]", 
                                        isCurrentDay ? "text-blue-900" : isSpecialDay ? "text-yellow-900" : "text-slate-700"
                                    )}>
                                        {format(day, 'dd')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* CORPO DA TABELA */}
                    <div className="relative">
                        {/* Linhas de fundo (Grid Vertical) */}
                        <div className="absolute inset-0 z-0 flex pointer-events-none" style={{ paddingLeft: `${SIDEBAR_WIDTH}px` }}>
                            {calendarDays.map((day, i) => {
                                const isCurrentDay = isToday(day);
                                const isSpecialDay = isWeekend(day) || checkIsHoliday(day);

                                return (
                                    <div 
                                        key={i} 
                                        className={cn(
                                            "flex-none border-r h-full transition-colors", 
                                            isCurrentDay 
                                                ? "bg-blue-100/50 border-l border-l-blue-300 border-r-blue-300 shadow-[inset_0_0_30px_rgba(59,130,246,0.15)]" 
                                                : isSpecialDay
                                                    ? "bg-yellow-50/50"
                                                    : ""
                                        )}
                                        style={{ width: `${CELL_WIDTH}px` }} 
                                    />
                                );
                            })}
                        </div>

                        {/* Linhas das Cabanas */}
                        {cabins.map((cabin) => (
                            <div 
                                key={cabin.id}
                                className="relative flex w-full hover:bg-slate-50/50 transition-colors group border-b bg-white/50"
                                style={{ height: `${ROW_HEIGHT}px` }}
                            >
                                {/* Nome da Cabana (STICKY LEFT) */}
                                <div 
                                    className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 border-r flex items-center px-2 gap-2 transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.02)]"
                                    style={{ width: `${SIDEBAR_WIDTH}px` }}
                                >
                                    <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-[10px] border shrink-0">
                                        {cabin.posicao || "#"}
                                    </div>
                                    <div className="flex flex-col overflow-hidden min-w-0">
                                        <span className="text-xs font-semibold truncate text-slate-700">
                                            {cabin.name}
                                        </span>
                                        <span className="text-[9px] text-slate-400 truncate">
                                            Cap: {cabin.capacity}
                                        </span>
                                    </div>
                                </div>

                                {/* Área das Fitas */}
                                <div className="relative flex-1">
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

            {isLoading && (
                <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            )}
        </div>
    );
}