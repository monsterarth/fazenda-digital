'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { WeddingData } from '@/app/actions/get-weddings'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
// ++ CORREÇÃO: Removemos a importação de 'Modifiers'
import { DayClickEventHandler } from 'react-day-picker'
import { Card } from '@/components/ui/card'

interface WeddingCalendarClientProps {
  weddings: WeddingData[]
}

// Helper para converter as strings YYYY-MM-DD em objetos Date
const parseDate = (dateString: string): Date => {
  return parseISO(dateString)
}

export function WeddingCalendarClient({ weddings }: WeddingCalendarClientProps) {
  const router = useRouter()
  const [month, setMonth] = useState<Date>(new Date())

  // 1. Processa os dados do casamento para os modificadores
  // ++ CORREÇÃO: Removemos a anotação de tipo ': Modifiers'
  const modifiers = {
    // ---- RANGES (Períodos de Hospedagem) ----
    range_maram: weddings
      .filter((w) => w.location === 'Maram')
      .map((w) => ({ from: parseDate(w.checkInDate), to: parseDate(w.checkOutDate) })),
    range_mayam: weddings
      .filter((w) => w.location === 'Mayam')
      .map((w) => ({ from: parseDate(w.checkInDate), to: parseDate(w.checkOutDate) })),
    range_outro: weddings
      .filter((w) => w.location === 'Outro')
      .map((w) => ({ from: parseDate(w.checkInDate), to: parseDate(w.checkOutDate) })),
    
    // ---- DIAS DO EVENTO (Marcação especial) ----
    event_maram: weddings
      .filter((w) => w.location === 'Maram')
      .map((w) => parseDate(w.weddingDate)),
    event_mayam: weddings
      .filter((w) => w.location === 'Mayam')
      .map((w) => parseDate(w.weddingDate)),
    event_outro: weddings
      .filter((w) => w.location === 'Outro')
      .map((w) => parseDate(w.weddingDate)),
  }
  
  // 2. Mapeia os modificadores para as classes CSS que criamos no globals.css
  const modifiersClassNames = {
    // Ranges
    range_maram: 'rdp-day_range_maram',
    range_mayam: 'rdp-day_range_mayam',
    range_outro: 'rdp-day_range_outro',
    
    // Dias do Evento (a classe 'rdp-day_event' é a base)
    event_maram: 'rdp-day_event rdp-day_event_maram',
    event_mayam: 'rdp-day_event rdp-day_event_mayam',
    event_outro: 'rdp-day_event rdp-day_event_outro',
  }
  
  // 3. Lógica para clicar em um dia
  const handleDayClick: DayClickEventHandler = (day, modifiers) => {
    // Verifica se o dia clicado tem algum dos nossos modificadores de evento
    if (modifiers.event_maram || modifiers.event_mayam || modifiers.event_outro) {
      // Formata o dia clicado (que é um objeto Date) para "yyyy-MM-dd"
      const clickedDateString = format(day, 'yyyy-MM-dd')
      
      // Encontra o casamento correspondente comparando as strings de data
      const clickedWedding = weddings.find(
        (w) => w.weddingDate === clickedDateString
      )
      
      if (clickedWedding) {
        router.push(`/admin/casamentos/${clickedWedding.id}`)
      }
    }
  }

  return (
    <div className="flex flex-col items-center">
      <Card className="p-2 sm:p-4">
        <Calendar
          mode="range" 
          numberOfMonths={2} 
          month={month}
          onMonthChange={setMonth}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          onDayClick={handleDayClick} 
          className="p-0"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4", 
            caption_label: "text-lg font-bold",
            head_cell: "w-full sm:w-14", 
            day: "h-12 w-12", 
            day_today: "bg-muted text-foreground font-bold", 
          }}
        />
      </Card>

      {/* Legenda */}
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6">
        <div className="flex items-center text-sm">
          <span className="h-4 w-4 rounded-full bg-blue-600 mr-2 border"></span>
          Evento Maram
        </div>
         <div className="flex items-center text-sm">
          <span className="h-4 w-4 rounded-full bg-pink-600 mr-2 border"></span>
          Evento Mayam
        </div>
         <div className="flex items-center text-sm">
          <span className="h-4 w-4 rounded-full bg-green-600 mr-2 border"></span>
          Evento (Outro)
        </div>
        <div className="flex items-center text-sm">
          <span className="h-4 w-4 bg-blue-100 mr-2 border"></span>
          Hospedagem Maram
        </div>
        <div className="flex items-center text-sm">
          <span className="h-4 w-4 bg-pink-100 mr-2 border"></span>
          Hospedagem Mayam
        </div>
      </div>
    </div>
  )
}