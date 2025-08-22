// /components/guest/dashboard/WifiInfoDialog.tsx

"use client";

import { useGuest } from "@/context/GuestProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export function WifiInfoDialog({ children }: { children: React.ReactNode }) {
    const { stay } = useGuest();
    
    const wifiSsid = stay?.cabin?.wifiSsid;
    const wifiPassword = stay?.cabin?.wifiPassword;

    // Se não houver SSID, não faz sentido renderizar o conteúdo do Dialog
    if (!wifiSsid) {
        return null; 
    }

    const qrCodeData = `WIFI:T:WPA;S:${wifiSsid};P:${wifiPassword || ''};;`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCodeData)}`;

    const copyToClipboard = () => {
        if (wifiPassword) {
            navigator.clipboard.writeText(wifiPassword);
            toast.success("Senha copiada!", {
                description: "A senha da rede Wi-Fi foi copiada para sua área de transferência.",
            });
        }
    };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Conectar ao Wi-Fi</DialogTitle>
          <DialogDescription>
             Aponte a câmera do seu celular para o QR Code para conectar-se automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-white rounded-lg border">
                <Image 
                    src={qrCodeUrl} 
                    alt={`QR Code para a rede ${wifiSsid}`} 
                    width={200} 
                    height={200} 
                />
            </div>
            <div className="text-center w-full rounded-lg border bg-muted/50 p-3">
                <p><span className="font-semibold text-sm text-muted-foreground">Rede:</span> {wifiSsid}</p>
                {wifiPassword && (
                    <p><span className="font-semibold text-sm text-muted-foreground">Senha:</span> {wifiPassword}</p>
                )}
            </div>
            <Button onClick={copyToClipboard} variant="outline" className="w-full" disabled={!wifiPassword}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar Senha
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}