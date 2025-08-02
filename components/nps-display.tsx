import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface NpsDisplayProps {
    score: number;
    promoters: number;
    passives: number;
    detractors: number;
    total: number;
}

export const NpsDisplay: React.FC<NpsDisplayProps> = ({ score, promoters, passives, detractors, total }) => {
    const getScoreColor = (s: number) => {
        if (s >= 50) return 'text-green-600';
        if (s > 0) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Net Promoter Score (NPS)</CardTitle>
                <CardDescription>Mede a lealdade dos seus hóspedes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4">
                <div className={`text-6xl font-bold ${getScoreColor(score)}`}>
                    {score}
                </div>
                <div className="w-full flex justify-around text-center">
                    <div>
                        <p className="text-xl font-bold text-green-600">{promoters}</p>
                        <p className="text-xs text-muted-foreground">Promotores</p>
                    </div>
                    <div>
                        <p className="text-xl font-bold text-yellow-600">{passives}</p>
                        <p className="text-xs text-muted-foreground">Neutros</p>
                    </div>
                    <div>
                        <p className="text-xl font-bold text-red-600">{detractors}</p>
                        <p className="text-xs text-muted-foreground">Detratores</p>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground pt-2">Baseado em {total} resposta(s)</p>
            </CardContent>
        </Card>
    );
};