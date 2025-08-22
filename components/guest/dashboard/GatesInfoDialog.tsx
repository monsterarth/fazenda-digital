// /components/guest/dashboard/GatesInfoDialog.tsx

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function GatesInfoDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>Senhas dos Portões</DialogTitle>
           <DialogDescription className="text-gray-400">
            Utilize estas senhas para acessar a propriedade.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center">
            <p className="text-lg">Senha de Acesso:</p>
            <p className="text-4xl font-bold tracking-widest">1008#</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}