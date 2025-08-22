"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Cloud, CloudRain, Wind } from 'lucide-react';

const weatherConditions: { [key: string]: { icon: React.ElementType, label: string } } = {
  'sunny': { icon: Sun, label: 'Ensolarado' },
  'cloudy': { icon: Cloud, label: 'Nublado' },
  'partly cloudy': { icon: Cloud, label: 'Parcialmente Nublado' },
  'mostly cloudy': { icon: Cloud, label: 'Predominantemente Nublado' },
  'light rain': { icon: CloudRain, label: 'Chuva Leve' },
};

const weatherData = {
    current: {
        temp: "26°",
        condition: "sunny",
    },
    forecast: {
        high: "26°",
        low: "19°",
        wind: "25 km/h", // Unidade ajustada
        chanceOfRain: "10%"
    }
};

const WeatherIcon = ({ condition }: { condition: string }) => {
    const Icon = weatherConditions[condition]?.icon || Sun;
    // ++ CORREÇÃO: Ícone usa a cor primária do tema ++
    return <Icon className="w-12 h-12 text-primary" />;
}

export function WeatherCard() {
  return (
    // ++ CORREÇÃO: Removido o gradiente, usando estilos de Card padrão para consistência ++
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Clima na Região</CardTitle>
        <CardDescription>Previsão para Imbituba, SC</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <WeatherIcon condition={weatherData.current.condition} />
                <div>
                    <p className="text-5xl font-bold">{weatherData.current.temp}</p>
                    <p className="capitalize text-muted-foreground">{weatherConditions[weatherData.current.condition]?.label}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex flex-col items-start">
                    <span className="font-bold text-base">{weatherData.forecast.high}</span>
                    <span className="text-xs text-muted-foreground">Máxima</span>
                </div>
                <div className="flex flex-col items-start">
                    <span className="font-bold text-base">{weatherData.forecast.low}</span>
                    <span className="text-xs text-muted-foreground">Mínima</span>
                </div>
                <div className="flex flex-col items-start">
                    <span className="font-bold text-base">{weatherData.forecast.chanceOfRain}</span>
                    <span className="text-xs text-muted-foreground">Chuva</span>
                </div>
                 <div className="flex flex-col items-start">
                    <span className="font-bold text-base">{weatherData.forecast.wind}</span>
                    <span className="text-xs text-muted-foreground">Vento</span>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}