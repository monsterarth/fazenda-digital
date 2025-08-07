"use client";

import { Booking } from '@/types';
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CalendarCheck, Clock, Hourglass } from "lucide-react";

// Mapeamento de status simplificado para o novo componente
const statusMap = {
  pendente: { label: "Pendente", variant: "secondary", icon: <Hourglass className="h-4 w-4" /> },
  solicitado: { label: "Solicitado", variant: "secondary", icon: <Hourglass className="h-4 w-4" /> },
  confirmado: { label: "Confirmado", variant: "default", icon: <CalendarCheck className="h-4 w-4" /> },
  cancelado: { label: "Cancelado", variant: "destructive", icon: <AlertCircle className="h-4 w-4" /> },
  cancelado_pelo_admin: { label: "Cancelado", variant: "destructive", icon: <AlertCircle className="h-4 w-4" /> },
  em_andamento: { label: "Em Andamento", variant: "default", icon: <Clock className="h-4 w-4" /> },
};

export function SimpleBookingItem({ booking }: { booking: Booking }) {
    const statusInfo = statusMap[booking.status as keyof typeof statusMap] || statusMap.pendente;
    const displayName = booking.structureName || booking.serviceName;
    const displayTime = booking.startTime ? `${booking.startTime} - ${booking.endTime}` : booking.timeSlotLabel;

    return (
        <div className="flex items-center space-x-4 p-3 bg-background rounded-lg">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary`}>
                {statusInfo.icon}
            </div>
            <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-sm text-muted-foreground">{displayTime}</p>
            </div>
            <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>
        </div>
    );
}