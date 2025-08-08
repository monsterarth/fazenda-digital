import { AuthProvider } from "@/context/AuthContext";
import PrivateRoute from "@/components/admin/private-route";
import { Toaster } from "@/components/ui/sonner"; // Adicionado para notificações

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // A busca de dados da propriedade foi removida daqui, pois agora é feita
  // dentro do PrivateRoute, apenas para usuários logados.
  // A Sidebar receberá os dados através do PropertyContext.
  return (
    <AuthProvider>
      <PrivateRoute>
        {children}
      </PrivateRoute>
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}