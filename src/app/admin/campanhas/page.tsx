import { redirect } from 'next/navigation';

// /admin/campanhas → redireciona para o dashboard
export default function CampanhasIndex() {
  redirect('/admin/campanhas/dashboard');
}
