"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi } from "lucide-react";
import Image from "next/image";

interface WifiCardProps {
  ssid?: string;
  password?: string;
}

export function WifiCard({ ssid, password }: WifiCardProps) {
    if (!ssid) return null;

    // Formato padrão para QR Codes de Wi-Fi
    const qrCodeData = `WIFI:T:WPA;S:${ssid};P:${password};;`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCodeData)}`;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wifi /> Wi-Fi da Cabana</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4">
                <Image 
                    src={qrCodeUrl}
                    alt="QR Code para conectar ao Wi-Fi"
                    width={120}
                    height={120}
                    className="rounded-lg border p-1"
                />
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Rede</p>
                    <p className="font-bold text-lg">{ssid}</p>
                </div>
                {password && (
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Senha</p>
                        <p className="font-mono text-lg bg-muted p-2 rounded-md">{password}</p>
                    </div>
                )}
                 <CardDescription className="text-xs text-center pt-2">
                    Aponte a câmera do seu celular para o QR Code para conectar-se automaticamente.
                </CardDescription>
            </CardContent>
        </Card>
    );
}