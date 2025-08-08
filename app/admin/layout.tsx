import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Este layout agora é minimalista. Ele apenas envolve TODAS as rotas /admin
  // com o provedor de autenticação, para que possamos saber se o usuário está logado ou não.
  // Ele NÃO renderiza a Sidebar nem busca dados.
  return (
    <AuthProvider>
      {children}
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}