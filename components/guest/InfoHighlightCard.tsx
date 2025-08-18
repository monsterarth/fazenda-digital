"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, Coffee } from "lucide-react";

interface InfoHighlightCardProps {
    type: 'wifi' | 'breakfast';
    title: string;
    info: string;
    details?: string;
}

const icons = {
    wifi: <Wifi className="h-6 w-6 text-primary" />,
    breakfast: <Coffee className="h-6 w-6 text-primary" />,
};

export function InfoHighlightCard({ type, title, info, details }: InfoHighlightCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icons[type]}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{info}</div>
                {details && <p className="text-xs text-muted-foreground">{details}</p>}
            </CardContent>
        </Card>
    );
}