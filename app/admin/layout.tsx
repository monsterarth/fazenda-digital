import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      {children}
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}