// /components/guest/dashboard/WeatherComponent.tsx

"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  CloudRain,
  Sun,
  Wind,
  Cloudy,
  CloudSun,
  CloudSnow,
  CloudFog,
  CloudLightning,
  Loader2,
  AlertTriangle, // Ícone de alerta
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Interface (sem alterações)
interface WeatherData {
  current: { temp_c: number; condition: { text: string; icon: string }; wind_kph: number; precip_mm: number; };
  forecast: { forecastday: { date: string; day: { maxtemp_c: number; mintemp_c: number; condition: { text: string; icon: string; }; }; }[]; };
}

// Mapeamento de ícones (sem alterações)
const weatherIconMap: { [key: string]: React.ElementType } = {
  "Sunny": Sun, "Clear": Sun, "Partly cloudy": CloudSun, "Cloudy": Cloudy, "Overcast": Cloud, "Mist": CloudFog, "Patchy rain possible": CloudRain, "Patchy snow possible": CloudSnow, "Patchy sleet possible": CloudRain, "Patchy freezing drizzle possible": CloudRain, "Thundery outbreaks possible": CloudLightning, "Blowing snow": CloudSnow, "Blizzard": CloudSnow, "Fog": CloudFog, "Freezing fog": CloudFog, "Patchy light drizzle": CloudRain, "Light drizzle": CloudRain, "Freezing drizzle": CloudRain, "Heavy freezing drizzle": CloudRain, "Patchy light rain": CloudRain, "Light rain": CloudRain, "Moderate rain at times": CloudRain, "Moderate rain": CloudRain, "Heavy rain at times": CloudRain, "Heavy rain": CloudRain, "Light freezing rain": CloudRain, "Moderate or heavy freezing rain": CloudRain, "Light sleet": CloudRain, "Moderate or heavy sleet": CloudRain, "Patchy light snow": CloudSnow, "Light snow": CloudSnow, "Patchy moderate snow": CloudSnow, "Moderate snow": CloudSnow, "Patchy heavy snow": CloudSnow, "Heavy snow": CloudSnow, "Ice pellets": CloudSnow, "Light rain shower": CloudRain, "Moderate or heavy rain shower": CloudRain, "Torrential rain shower": CloudRain, "Light sleet showers": CloudRain, "Moderate or heavy sleet showers": CloudRain, "Light snow showers": CloudSnow, "Moderate or heavy snow showers": CloudSnow, "Light showers of ice pellets": CloudSnow, "Moderate or heavy showers of ice pellets": CloudSnow, "Patchy light rain with thunder": CloudLightning, "Moderate or heavy rain with thunder": CloudLightning, "Patchy light snow with thunder": CloudLightning, "Moderate or heavy snow with thunder": CloudLightning,
};

const getWeatherIcon = (conditionText: string) => {
  const Icon = weatherIconMap[conditionText] || Cloud;
  return <Icon className="h-6 w-6" />;
};

export function WeatherComponent() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pega a chave da API das variáveis de ambiente
  const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setError("API Key faltando.");
      setLoading(false);
      return;
    }

    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=-28.2400,-48.6700&days=4&aqi=no&alerts=no&lang=pt`
        );
        if (!response.ok) {
          throw new Error("Falha ao buscar dados do clima.");
        }
        const data = await response.json();
        setWeather(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [apiKey]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  // Renderiza a mensagem de erro diretamente na interface
  if (error) {
    return (
      <div className="flex items-center space-x-2 text-xs text-yellow-300">
        <AlertTriangle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  const CurrentIcon = getWeatherIcon(weather.current.condition.text);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer text-right">
          <div className="flex items-center justify-end space-x-2">
            <span className="text-3xl font-bold">
              {Math.round(weather.current.temp_c)}°C
            </span>
            {CurrentIcon}
          </div>
          <div className="text-xs text-gray-300 flex items-center justify-end space-x-2">
            <span>Chuva: {weather.current.precip_mm}mm</span>
            <span>Vento: {Math.round(weather.current.wind_kph)}km/h</span>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>Previsão para os Próximos Dias</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {weather.forecast.forecastday.slice(1).map((day) => {
            const ForecastIcon = getWeatherIcon(day.day.condition.text);
            const date = new Date(day.date + "T00:00:00");
             const dayOfWeek = date.toLocaleDateString("pt-BR", { weekday: "long" });

            return (
              <div key={day.date} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    {ForecastIcon}
                    <div>
                        <p className="font-semibold capitalize">{dayOfWeek}</p>
                        <p className="text-sm text-gray-400">{day.day.condition.text}</p>
                    </div>
                </div>
                <div>
                  <span className="font-semibold">
                    {Math.round(day.day.mintemp_c)}° / {Math.round(day.day.maxtemp_c)}°
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}