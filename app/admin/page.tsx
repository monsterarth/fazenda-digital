import { redirect } from 'next/navigation';

export default function AdminRootPage() {
  // Redireciona permanentemente qualquer acesso a /admin para /admin/dashboard
  redirect('/admin/dashboard');
}