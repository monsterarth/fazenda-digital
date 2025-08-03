'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { addDays, format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useFetchData } from '@/hooks/use-fetch-data';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { KPICard } from '@/components/kpi-card';
import { FeedbackList } from '@/components/feedback-list';
import { Calendar as CalendarIcon, Hash, Star, X as XIcon, Download, Loader2, ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CSVLink } from 'react-csv';
import { toast } from 'sonner';

import { NpsDisplay } from '@/components/nps-display';
import { InsightCard } from '@/components/insight-card';

// **CORREÇÃO DE HIDRATAÇÃO**: Carregamento dinâmico com ssr: false
const SatisfactionLineChart = dynamic(() => import('@/components/satisfaction-line-chart').then(mod => mod.SatisfactionLineChart), { ssr: false, loading: () => <Skeleton className="h-full w-full min-h-[300px]" /> });
const CategoryBarChart = dynamic(() => import('@/components/category-bar-chart'), { ssr: false, loading: () => <Skeleton className="h-full w-full min-h-[400px]" /> });

interface FilterOptions {
    cabins?: string[];
    countries?: string[];
    states?: string[];
    cities?: string[];
}

interface KpiResults {
    totalResponses: number;
    nps: { score: number; promoters: number; passives: number; detractors: number; total: number; };
    overallAverage: number;
    averageByCategory: { category: string; average: number }[];
    textFeedback: Record<string, { text: string; guestName: string; cabinName: string; }[]>;
    satisfactionOverTime: { date: string; averageRating: number }[];
    insights: { weakest?: { category: string; average: number }; strongest?: { category: string; average: number } };
}

interface ResultsApiResponse {
    results: KpiResults;
    filters: FilterOptions;
}

const SurveyResultsPage: React.FC = () => {
    const params = useParams();
    const router = useRouter();
    const surveyId = params?.surveyId as string | undefined;

    // **CORREÇÃO DE HIDRATAÇÃO**: Estado para controlar quando o componente está no cliente
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    const [date, setDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -90), to: new Date() });
    const [selectedCabin, setSelectedCabin] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [exportData, setExportData] = useState<any[]>([]);
    const csvLinkRef = useRef<CSVLink & HTMLAnchorElement & { link: HTMLAnchorElement }>(null);

    const apiUrl = useMemo(() => {
        const startDate = date?.from ? format(date.from, 'yyyy-MM-dd') : '';
        const endDate = date?.to ? format(date.to, 'yyyy-MM-dd') : '';
        if (!surveyId || !startDate || !endDate) return null;
        
        const urlParams = new URLSearchParams({ startDate, endDate });
        if (selectedCabin) urlParams.append('cabin', selectedCabin);
        if (selectedCountry) urlParams.append('country', selectedCountry);
        if (selectedState) urlParams.append('state', selectedState);
        if (selectedCity) urlParams.append('city', selectedCity);
        
        return `/api/surveys/${surveyId}/results?${urlParams.toString()}`;
    }, [surveyId, date, selectedCabin, selectedCountry, selectedState, selectedCity]);

    const { data, isLoading, error } = useFetchData<ResultsApiResponse>(apiUrl);
    const results = data?.results;
    const filters = data?.filters;

    const handleExport = async () => {
        setIsExporting(true);
        toast.info("Preparando dados para exportação...");
        const exportUrl = apiUrl?.replace('/results?', '/export?');
        if (!exportUrl) {
            toast.error("Filtros inválidos.");
            setIsExporting(false);
            return;
        }
        try {
            const res = await fetch(exportUrl);
            if (!res.ok) throw new Error("Falha ao buscar dados para exportação.");
            const data = await res.json();
            if (data.length === 0) {
                toast.info("Nenhum dado para exportar com os filtros atuais.");
                setIsExporting(false);
                return;
            }
            setExportData(data);
        } catch (err: any) {
            toast.error("Erro na exportação", { description: err.message });
        } finally {
            // A exportação será concluída no useEffect
        }
    };
    
    useEffect(() => {
        if (exportData.length > 0 && csvLinkRef.current) {
            csvLinkRef.current.link.click();
            setExportData([]);
            setIsExporting(false); // Resetar o estado de exportação
        }
    }, [exportData]);

    const clearFilters = () => {
        setSelectedCabin('');
        setSelectedCountry('');
        setSelectedState('');
        setSelectedCity('');
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
                <div>
                     <Button variant="outline" size="sm" className="mb-4" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/> Voltar</Button>
                    <h1 className="text-3xl font-bold tracking-tight">Resultados da Pesquisa</h1>
                    <p className="text-muted-foreground">Filtre e analise as respostas recebidas.</p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                    <Button variant="outline" onClick={handleExport} disabled={isExporting || isLoading}>
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Exportar CSV
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date" variant={"outline"} className={cn("w-[280px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>) : format(date.from, "LLL dd, y")) : (<span>Selecione um período</span>)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            
            <div className="p-4 border rounded-lg bg-slate-50">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                    <div className="col-span-2 md:col-span-1">
                        <Label>Cabana</Label>
                        <Select value={selectedCabin} onValueChange={setSelectedCabin} disabled={isLoading || !filters?.cabins?.length}>
                            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                            <SelectContent>{filters?.cabins?.sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div><Label>País</Label><Select value={selectedCountry} onValueChange={setSelectedCountry} disabled={isLoading || !filters?.countries?.length}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent>{filters?.countries?.sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Estado</Label><Select value={selectedState} onValueChange={setSelectedState} disabled={isLoading || !filters?.states?.length}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent>{filters?.states?.sort().map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Cidade</Label><Select value={selectedCity} onValueChange={setSelectedCity} disabled={isLoading || !filters?.cities?.length}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent>{filters?.cities?.sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                    <Button onClick={clearFilters} variant="ghost"><XIcon className="mr-2 h-4 w-4"/>Limpar Filtros</Button>
                </div>
            </div>

            {isLoading && (<div className="space-y-6"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-36" /><Skeleton className="h-36" /><Skeleton className="h-36" /><Skeleton className="h-36" /></div><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-96 lg:col-span-2" /><Skeleton className="h-96" /></div></div>)}
            {error && <p className="text-red-500 text-center py-10">Erro ao carregar resultados: {error.message}</p>}
            
            {/* **CORREÇÃO DE HIDRATAÇÃO**: Renderização condicional */}
            {isClient && !isLoading && !error && results && (
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <KPICard title="Respostas (Filtrado)" value={results.totalResponses ?? 0} icon={<Hash />} />
                        <KPICard title="Satisfação Geral (CSAT)" value={(results.overallAverage || 0).toFixed(2)} icon={<Star />} description="Média das notas de 1 a 5" />
                        {results.insights?.strongest && <InsightCard type="strength" title={results.insights.strongest.category} value={results.insights.strongest.average} />}
                        {results.insights?.weakest && <InsightCard type="opportunity" title={results.insights.weakest.category} value={results.insights.weakest.average} />}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2"><SatisfactionLineChart data={results.satisfactionOverTime || []} /></div>
                        {results.nps && results.nps.total > 0 ? <NpsDisplay {...results.nps} /> : <KPICard title="Net Promoter Score (NPS)" value="N/A" description="Nenhuma resposta NPS no período." icon={<Star />} />}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                           {results.averageByCategory && results.averageByCategory.length > 0 && <CategoryBarChart data={(results.averageByCategory || []).map(item => ({ name: item.category, value: parseFloat((item.average || 0).toFixed(2)) }))} />}
                        </div>
                        <FeedbackList feedbacks={results.textFeedback || {}} />
                    </div>
                </div>
            )}
            
            {/* **CORREÇÃO DE HIDRATAÇÃO**: Renderização condicional */}
            {isClient && <CSVLink data={exportData} filename={`export_pesquisa_${format(new Date(), 'yyyy-MM-dd')}.csv`} className="hidden" ref={csvLinkRef} target="_blank" />}
        </div>
    );
}

export default SurveyResultsPage;