"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartData {
    name: string;
    value: number;
}

interface CategoryBarChartProps {
    data: ChartData[];
}

const CategoryBarChart: React.FC<CategoryBarChartProps> = ({ data }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Desempenho por Categoria</CardTitle>
                <CardDescription>Média de avaliação (1-5) para cada categoria de KPI.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[1, 5]} />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip />
                        <Bar dataKey="value" name="Média" fill="#82ca9d" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

export default CategoryBarChart;