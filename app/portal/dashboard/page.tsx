"use client";

import { useGuest } from '@/context/GuestProvider';
import { useProperty } from '@/context/PropertyContext';
import { Button } from '@/components/ui/button';
import { 
    ArrowRight, 
    Calendar, 
    Coffee, 
    MessageSquareHeart, 
    Star, 
    Utensils,
    CalendarPlus,
    BookOpenCheck 
} from 'lucide-react';
import { ActionCard } from '@/components/portal/ActionCard';
import { BookingsList } from '@/components/portal/BookingsList';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GuestDashboardPage() {
    // Hooks para buscar os dados dos provedores.
    // O AuthGuard no layout já garantiu que estamos autenticados.
    const { stay } = useGuest();
    const { property } = useProperty();

    // Se por algum motivo os dados ainda não chegaram, não renderiza nada.
    if (!stay || !property) {
        return null;
    }
    
    // Função para formatar as datas que agora são strings
    const formatDate = (dateString: string) => {
        return format(new Date(dateString), "dd 'de' MMMM", { locale: ptBR });
    };

    const breakfastType = property.breakfast?.type || 'delivery'; 
    const bookings = stay.bookings || [];

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-foreground">Olá, {stay.guestName.split(' ')[0]}!</h1>
                <p className="text-lg text-muted-foreground">
                    Sua estadia na {stay.cabinName} vai de {formatDate(stay.checkInDate)} até {formatDate(stay.checkOutDate)}.
                </p>
            </header>

            <BookingsList
              bookings={bookings}
              title="Seus Próximos Agendamentos"
              description="Fique por dentro das suas próximas experiências na Fazenda."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <ActionCard 
                    href={breakfastType === 'delivery' ? "/portal/cafe" : ''}
                    icon={<Coffee size={24} />}
                    title="Café da Manhã"
                    description={
                        breakfastType === 'delivery'
                        ? "Escolha os itens da sua cesta de café da manhã para receber na cabana."
                        : "Nosso café é servido diariamente no salão principal das 08h às 10h."
                    }
                >
                    {breakfastType === 'delivery' && (
                        <Button className="w-full">
                            Montar minha cesta <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </ActionCard>

                <ActionCard 
                    href="/portal/agendamentos"
                    icon={<Calendar size={24} />}
                    title="Agendar Experiências"
                    description="Reserve seu horário para o ofurô, massagens e outras atividades exclusivas."
                >
                    <Button variant="outline" className="w-full">
                        Ver todas as experiências
                    </Button>
                </ActionCard>
                
                <ActionCard 
                    href="/portal/regras"
                    icon={<BookOpenCheck size={24} />}
                    title="Guias e Regras"
                    description="Acesse nossas políticas, regras da pousada e guias locais para aproveitar ao máximo."
                >
                     <Button variant="outline" className="w-full">
                        Consultar informações
                    </Button>
                </ActionCard>

                <ActionCard 
                    href="/portal/pesquisas"
                    icon={<Star size={24} />}
                    title="Avalie a Fazenda"
                    description="Sua opinião é muito importante! Conte-nos como foi a sua experiência conosco."
                >
                     <Button variant="outline" className="w-full">
                        Responder pesquisas
                    </Button>
                </ActionCard>

                <ActionCard 
                    href="#"
                    icon={<Utensils size={24} />}
                    title="Cardápio Digital"
                    description="Explore nosso cardápio e peça pratos e bebidas direto na sua cabana."
                    isComingSoon
                />
                <ActionCard 
                    href="#"
                    icon={<MessageSquareHeart size={24} />}
                    title="Solicitações à Recepção"
                    description="Precisa de toalhas extras, lenha para a lareira ou alguma outra ajuda?"
                    isComingSoon
                />
                <ActionCard 
                    href="#"
                    icon={<CalendarPlus size={24} />}
                    title="Alterar Reserva"
                    description="Solicite uma saída mais tardia (late check-out) ou estenda sua estadia conosco."
                    isComingSoon
                />
            </div>
        </div>
    );
}