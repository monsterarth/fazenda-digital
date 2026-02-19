// app/admin/(dashboard)/relatorios/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { getKitchenMetrics } from '@/app/actions/get-kitchen-metrics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, Utensils, ShoppingBasket, AlertCircle } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Line, LineChart } from 'recharts';
import { toast } from 'sonner';

export default function RelatoriosPage() {
    const [range, setRange] = useState<'thisMonth' | 'lastMonth'>('thisMonth');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            const result = await getKitchenMetrics(range);
            if (result) {
                setData(result);
            } else {
                toast.error("Falha ao carregar dados.");
            }
            setLoading(false);
        }
        load();
    }, [range]);

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-brand-primary" /></div>;
    }

    if (!data) return null;

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-brand-dark-green">Inteligência de Custos</h1>
                    <p className="text-brand-mid-green">Análise de gastos com insumos (CMV) do café da manhã.</p>
                </div>
                <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
                    <TabsList>
                        <TabsTrigger value="thisMonth">Este Mês</TabsTrigger>
                        <TabsTrigger value="lastMonth">Mês Passado</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Custo Total (Rastreado)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-brand-dark-green">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.summary.totalCost)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Pratos Quentes + Cestas</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">CPP (Apenas Cestas)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.summary.cppBaskets)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Custo por Hóspede (Delivery)</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Gastos no Salão</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.summary.hallCost)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Apenas Pratos Quentes</p>
                    </CardContent>
                </Card>

                {/* CARD PLACEHOLDER (BUFFET) */}
                <Card className="bg-slate-50 border-dashed border-slate-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                             Custo do Buffet <Badge variant="outline" className="text-[10px] h-4">Em Breve</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-300">R$ --,--</div>
                        <p className="text-xs text-slate-400 mt-1">Controle de insumos do balcão</p>
                    </CardContent>
                </Card>
            </div>

            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Evolução do Custo Diário */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-brand-primary"/> Evolução de Custos</CardTitle>
                        <CardDescription>Gastos diários calculados via Ficha Técnica.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.chartData}>
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                                <Tooltip 
                                    formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                />
                                <Legend />
                                <Bar dataKey="cesta" name="Cestas (Delivery)" stackId="a" fill="#0f766e" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="salao" name="Salão (Pratos)" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Itens do Salão */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Utensils className="h-5 w-5 text-amber-500"/> Pratos Mais Pedidos (Salão)</CardTitle>
                        <CardDescription>Top 5 itens solicitados à cozinha.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.topItems.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <span className="font-medium text-brand-dark-green">{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-bold text-brand-dark-green">{item.count} un</span>
                                    </div>
                                </div>
                            ))}
                            {data.topItems.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">Nenhum dado disponível.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3 items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                    <strong>Nota sobre os dados:</strong> Os valores apresentados são baseados no 
                    <em> Custo da Mercadoria Vendida (CMV)</em>, calculado a partir das Fichas Técnicas no momento do pedido. 
                    Custos operacionais (gás, mão de obra) e itens do buffet livre não estão inclusos nestes totais.
                </div>
            </div>
        </div>
    );
}

function Badge({ variant, className, children }: any) {
    // Mini componente local para evitar erros de importação se o UI Kit mudar
    const bg = variant === 'outline' ? 'bg-transparent border' : 'bg-slate-100';
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${bg} ${className}`}>{children}</span>;
}