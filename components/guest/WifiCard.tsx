"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Wifi, Copy, QrCode } from "lucide-react";
import Image from "next/image";
import { toast, Toaster } from 'sonner';

interface WifiCardProps {
  ssid?: string;
  password?: string;
}

export function WifiCard({ ssid, password }: WifiCardProps) {
    if (!ssid) {
        // Se não houver SSID configurado para a cabana, o card não é renderizado.
        return null;
    }

    const qrCodeData = `WIFI:T:WPA;S:${ssid};P:${password || ''};;`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCodeData)}`;

    const handleCopyPassword = () => {
        if (password) {
            navigator.clipboard.writeText(password);
            toast.success("Senha do Wi-Fi copiada!");
        }
    };

    return (
        <>
            <Toaster richColors position="top-center" />
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wifi /> Wi-Fi da Cabana</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                        <div>
                            <p className="text-sm text-muted-foreground">Rede</p>
                            <p className="font-bold">{ssid}</p>
                        </div>
                        {password && (
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Senha</p>
                                <p className="font-mono text-lg">{password}</p>
                            </div>
                        )}
                    </div>

                    {/* ## INÍCIO DA CORREÇÃO: Layout de 2 botões ## */}
                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={handleCopyPassword} variant="secondary" disabled={!password}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar Senha
                        </Button>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <QrCode className="mr-2 h-4 w-4" />
                                    QR Code
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[300px]">
                                <DialogHeader>
                                    <DialogTitle>Compartilhar Wi-Fi</DialogTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Aponte a câmera para o QR Code e conecte-se à rede <strong>{ssid}</strong>.
                                    </p>
                                </DialogHeader>
                                <div className="flex items-center justify-center p-4">
                                    <Image 
                                        src={qrCodeUrl}
                                        alt={`QR Code da rede ${ssid}`}
                                        width={200}
                                        height={200}
                                        className="rounded-lg border p-1"
                                    />
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                    {/* ## FIM DA CORREÇÃO ## */}
                </CardContent>
            </Card>
        </>
    );
}