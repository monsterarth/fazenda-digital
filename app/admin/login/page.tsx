// fazenda-digital/app/admin/login/page.tsx

"use client";

import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast, Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import { app } from '@/lib/firebase';
import Link from 'next/link'; // IMPORTADO
import { Separator } from '@/components/ui/separator'; // IMPORTADO

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const auth = getAuth(app);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading("Autenticando...");

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            toast.loading("Verificando permissões de administrador...", { id: toastId });
            const idTokenResult = await user.getIdTokenResult(true);

            // ++ ESTA É A CORREÇÃO ++
            // Verifica se o usuário tem QUALQUER 'role' definida, em vez de 'admin: true'
            if (!!idTokenResult.claims.role) {
            // ++ FIM DA CORREÇÃO ++
                toast.success("Login realizado com sucesso!", { id: toastId });
                router.push('/admin/stays'); // Redireciona para a página inicial do admin
            } else {
                await signOut(auth);
                throw new Error("Você não tem permissão para acessar esta área.");
            }

        } catch (error: any) {
            let description = "Verifique seu e-mail e senha.";
            if (error.message.includes("permissão")) {
                description = error.message;
            }
            toast.error("Falha no login", { id: toastId, description });
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100">
            <Toaster richColors position="top-center" />
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Login do Administrador</CardTitle>
                    <CardDescription>Acesse o painel de gestão.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="admin@email.com" 
                                required 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                required 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Entrar"}
                        </Button>
                    </form>
                </CardContent>
                {/* INÍCIO DA ALTERAÇÃO */}
                <CardFooter className="flex-col gap-4">
                    <Separator />
                    <Link href="/" className="w-full">
                        <Button variant="outline" className="w-full">
                            Acessar como Hóspede
                        </Button>
                    </Link>
                </CardFooter>
                {/* FIM DA ALTERAÇÃO */}
            </Card>
        </main>
    );
}