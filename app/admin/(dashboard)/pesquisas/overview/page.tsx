"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Survey } from '@/types/survey';
import Link from 'next/link';
import { subDays } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { KPICard } from '@/components/kpi-card';
import { ArrowRight, BarChart2, CheckSquare, Gift, Loader2, Star } from 'lucide-react';

// Interface para combinar dados da pesquisa com suas estatísticas
interface SurveyWithStats extends Survey {
  totalResponses: number;
  weeklyResponses: number;
}

export default function PesquisasOverviewPage() {
  const { isAdmin } = useAuth();
  const [surveysWithStats, setSurveysWithStats] = useState<SurveyWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    // Listener para a coleção de pesquisas
    const surveysQuery = query(collection(db, 'surveys'));
    const unsubscribeSurveys = onSnapshot(surveysQuery, (surveysSnapshot) => {
      const surveysData = surveysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Survey));

      // Listener para a coleção de respostas
      const responsesQuery = query(collection(db, 'surveyResponses'));
      const unsubscribeResponses = onSnapshot(responsesQuery, (responsesSnapshot) => {
        const sevenDaysAgo = Timestamp.fromDate(subDays(new Date(), 7));

        // Agrupa as respostas por surveyId para contagem eficiente
        const responsesBySurvey = responsesSnapshot.docs.reduce((acc, doc) => {
          const response = doc.data();
          const surveyId = response.surveyId;
          if (!acc[surveyId]) {
            acc[surveyId] = [];
          }
          acc[surveyId].push(response);
          return acc;
        }, {} as Record<string, any[]>);

        // Combina os dados da pesquisa com as estatísticas calculadas
        const calculatedStats: SurveyWithStats[] = surveysData.map(survey => {
          const responses = responsesBySurvey[survey.id] || [];
          const weeklyResponses = responses.filter(r => r.submittedAt && r.submittedAt > sevenDaysAgo).length;
          
          return {
            ...survey,
            totalResponses: responses.length,
            weeklyResponses: weeklyResponses,
          };
        });

        setSurveysWithStats(calculatedStats);
        setLoading(false);
      });

      // Cleanup do listener de respostas quando o de pesquisas for atualizado
      return () => unsubscribeResponses();
    });

    // Cleanup do listener de pesquisas
    return () => unsubscribeSurveys();
  }, [isAdmin]);

  // Calcula os KPIs gerais com base nos dados já processados
  const overallStats = useMemo(() => {
    if (!surveysWithStats) return { totalSurveys: 0, totalResponses: 0, weeklyResponses: 0 };
    
    const totalResponses = surveysWithStats.reduce((sum, s) => sum + s.totalResponses, 0);
    const weeklyResponses = surveysWithStats.reduce((sum, s) => sum + s.weeklyResponses, 0);

    return {
      totalSurveys: surveysWithStats.length,
      totalResponses,
      weeklyResponses,
    };
  }, [surveysWithStats]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral das Pesquisas</h1>
        <p className="text-muted-foreground">Acompanhe o engajamento e os resultados das suas pesquisas de satisfação.</p>
      </header>

      {/* KPIs Gerais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICard title="Pesquisas Ativas" value={overallStats.totalSurveys} icon={<CheckSquare />} description="Total de pesquisas configuradas no sistema." />
        <KPICard title="Respostas (Últimos 7 dias)" value={overallStats.weeklyResponses} icon={<BarChart2 />} description="Novas respostas recebidas na última semana." />
        <KPICard title="Total de Respostas" value={overallStats.totalResponses} icon={<Star />} description="Total de respostas acumuladas em todas as pesquisas." />
      </div>

      {/* Lista de Pesquisas */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Suas Pesquisas</h2>
        {surveysWithStats.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {surveysWithStats.map(survey => (
              <Card key={survey.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <CardTitle>{survey.title}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">{survey.description}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {survey.isDefault && <Badge variant="secondary">Padrão</Badge>}
                      {survey.reward?.hasReward && <Badge variant="outline" className="text-green-600 border-green-400"><Gift className="mr-1 h-3 w-3" /> Recompensa</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow flex items-end justify-between">
                    <div className="text-sm text-muted-foreground">
                        <p><strong className="text-foreground font-bold text-2xl">{survey.totalResponses}</strong> Respostas Totais</p>
                        <p className="text-green-600 font-semibold">{survey.weeklyResponses > 0 ? `${survey.weeklyResponses} na última semana` : 'Nenhuma resposta recente'}</p>
                    </div>
                    <Button asChild>
                        <Link href={`/admin/pesquisas/${survey.id}/resultados`}>
                            Ver Resultados <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">Nenhuma pesquisa encontrada.</p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/admin/settings/pesquisas">
                    Crie sua primeira pesquisa
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
