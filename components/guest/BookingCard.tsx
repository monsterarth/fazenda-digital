"use client";

import { Booking as LegacyBooking } from '@/types';
import { Booking as SchedulingBooking, Structure } from '@/types/scheduling';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CalendarCheck, Clock, CheckCircle, Hourglass } from "lucide-react";
import Image from 'next/image';

// Tipo que aceita as propriedades de ambos os tipos de Booking
type CombinedBooking = Partial<LegacyBooking> & Partial<SchedulingBooking>;

interface BookingCardProps {
  booking: CombinedBooking;
  structure?: Structure;
}

// ## INÍCIO DA CORREÇÃO: statusMap agora inclui TODOS os status possíveis ##
const statusMap = {
  // Status do novo sistema de agendamento
  pendente: { label: "Pendente", variant: "secondary", icon: <Hourglass className="h-3 w-3" /> },
  confirmado: { label: "Confirmado", variant: "default", icon: <CalendarCheck className="h-3 w-3" /> },
  finalizado: { label: "Finalizado", variant: "outline", icon: <CheckCircle className="h-3 w-3" /> },
  cancelado: { label: "Cancelado", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
  // Status do sistema antigo (para compatibilidade)
  solicitado: { label: "Solicitado", variant: "secondary", icon: <Hourglass className="h-3 w-3" /> },
  em_andamento: { label: "Em Andamento", variant: "default", icon: <Clock className="h-3 w-3" /> },
  concluido: { label: "Concluído", variant: "outline", icon: <CheckCircle className="h-3 w-3" /> },
  cancelado_pelo_admin: { label: "Cancelado", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
};
// ## FIM DA CORREÇÃO ##

export function BookingCard({ booking, structure }: BookingCardProps) {
  const statusInfo = statusMap[booking.status as keyof typeof statusMap] || statusMap.pendente;
  
  const displayName = booking.structureName || booking.serviceName;
  const displayUnit = booking.unitId || booking.unit;
  const displayTime = booking.startTime ? `${booking.startTime} - ${booking.endTime}` : booking.timeSlotLabel;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="flex">
        {structure?.photoURL && (
          <div className="w-1/3 min-w-[100px] md:min-w-[150px]">
            <Image 
              src={structure.photoURL} 
              alt={displayName || "Estrutura"}
              width={150} 
              height={150} 
              className="object-cover h-full w-full"
            />
          </div>
        )}
        <div className="flex-1">
          <CardContent className="p-4 space-y-2">
            <div>
              <p className="font-bold text-lg">{displayName}</p>
              {displayUnit && <p className="text-sm text-muted-foreground">{displayUnit}</p>}
            </div>
            <div className="text-sm text-muted-foreground">
              <p><strong>Hoje</strong>, {displayTime}</p>
            </div>
            <Badge variant={statusInfo.variant as any} className="flex items-center gap-1.5 whitespace-nowrap w-fit">
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}