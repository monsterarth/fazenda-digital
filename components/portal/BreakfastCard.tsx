"use client";

import { Property, BreakfastOrder } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BreakfastCardProps {
  property: Property;
  todaysOrder?: BreakfastOrder;
}

export function BreakfastCard({ property, todaysOrder }: BreakfastCardProps) {
    const breakfastConfig = property.breakfast;

    // Se o módulo de café da manhã não estiver habilitado na propriedade, o card não é renderizado.
    if (!breakfastConfig?.isAvailable) {
        return null;
    }

    // Se o café é servido no local (não por cesta), exibe um card informativo simples.
    if (breakfastConfig.type === 'on-site') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Coffee /> Café da Manhã</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{breakfastConfig.orderingStartTime} - {breakfastConfig.orderingEndTime}</p>
                    <p className="text-sm text-muted-foreground">Nosso café é servido diariamente no salão principal.</p>
                </CardContent>
            </Card>
        );
    }
    
    // Lógica para o café da manhã por entrega (cesta)
    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Coffee /> Sua Cesta de Café da Manhã</CardTitle>
                <CardDescription>Receba uma deliciosa cesta de café da manhã diretamente na sua cabana.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-center items-center text-center space-y-3">
                {todaysOrder ? (
                    <div className="text-green-600 flex flex-col items-center gap-2 p-4">
                        <CheckCircle className="h-12 w-12" />
                        <p className="font-bold text-lg">Cesta já montada!</p>
                        <p className="text-sm text-muted-foreground">Sua entrega está programada para o horário de sempre. Bom apetite!</p>
                    </div>
                ) : (
                    <div className="text-amber-700 flex flex-col items-center gap-2 p-4">
                        <AlertTriangle className="h-12 w-12" />
                        <p className="font-bold text-lg">Não esqueça da sua cesta!</p>
                        <p className="text-sm text-muted-foreground">
                            Você tem até as {breakfastConfig.orderingEndTime} de hoje para montar sua cesta para amanhã.
                        </p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 {!todaysOrder && (
                    <Button asChild className="w-full">
                        <Link href="/portal/cafe">
                            Montar minha cesta <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}