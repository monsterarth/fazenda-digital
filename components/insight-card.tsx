import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface InsightCardProps {
    type: 'strength' | 'opportunity';
    title: string;
    value: number;
}

export const InsightCard: React.FC<InsightCardProps> = ({ type, title, value }) => {
    const isStrength = type === 'strength';
    const Icon = isStrength ? TrendingUp : TrendingDown;
    const color = isStrength ? 'text-green-600' : 'text-red-600';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{isStrength ? 'Ponto Forte' : 'Oportunidade'}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-lg font-bold">{title}</div>
                <p className="text-xs text-muted-foreground">
                    Média de <span className={`font-semibold ${color}`}>{value.toFixed(2)}</span> de 5
                </p>
            </CardContent>
        </Card>
    );
};