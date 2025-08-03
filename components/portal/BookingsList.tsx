"use client";

import { Booking } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CalendarCheck, Clock, History, PartyPopper } from "lucide-react";

interface BookingsListProps {
  bookings: Booking[];
  title: string;
  description: string;
  showPast?: boolean;
}

const statusMap = {
  solicitado: { label: "Solicitado", variant: "default", icon: <Clock className="h-3 w-3" /> },
  confirmado: { label: "Confirmado", variant: "success", icon: <CalendarCheck className="h-3 w-3" /> },
  concluido: { label: "Concluído", variant: "secondary", icon: <History className="h-3 w-3" /> },
  cancelado_pelo_admin: { label: "Cancelado", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
  bloqueado: { label: "Indisponível", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
  em_andamento: { label: "Em Andamento", variant: "default", icon: <Clock className="h-3 w-3" /> },
};

export function BookingsList({ bookings, title, description, showPast = false }: BookingsListProps) {
  
  const today = startOfDay(new Date());
  
  const filteredBookings = bookings
    .filter(booking => {
      if (showPast) return true;
      const bookingDay = startOfDay(new Date(booking.date.replace(/-/g, '\/')));
      return bookingDay >= today;
    })
    .sort((a, b) => new Date(a.date.replace(/-/g, '\/')).getTime() - new Date(b.date.replace(/-/g, '\/')).getTime());

  // ## CORREÇÃO ##: Só retorna nulo se não houver NENHUM agendamento de qualquer tipo.
  // Isso garante que no dashboard ele sempre apareça se o hóspede tiver histórico.
  if (bookings.length === 0) {
    return null;
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {filteredBookings.length > 0 ? (
          filteredBookings.map((booking) => {
            const statusInfo = statusMap[booking.status] || statusMap.solicitado;
            return (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div>
                  <p className="font-bold">{booking.serviceName}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(booking.date.replace(/-/g, '\/')), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    {booking.timeSlotLabel && ` - ${booking.timeSlotLabel}`}
                  </p>
                </div>
                <Badge variant={statusInfo.variant as any} className="flex items-center gap-1.5 whitespace-nowrap">
                  {statusInfo.icon}
                  {statusInfo.label}
                </Badge>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <PartyPopper className="h-8 w-8 text-primary mb-2" />
            <p className="font-semibold">Nenhuma experiência futura agendada!</p>
            <p className="text-sm text-muted-foreground">
              Aproveite para explorar e agendar nossas experiências.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}