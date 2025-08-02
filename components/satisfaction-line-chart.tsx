"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartData {
    date: string;
    averageRating: number;
}

interface SatisfactionLineChartProps {
    data: ChartData[];
}

export const SatisfactionLineChart: React.FC<SatisfactionLineChartProps> = ({ data }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Satisfação ao Longo do Tempo</CardTitle>
                <CardDescription>Média de avaliação (1-5) por dia de resposta.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[1, 5]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="averageRating" name="Média de Satisfação" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};