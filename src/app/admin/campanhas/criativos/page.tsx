/**
 * A funcionalidade de seleção de criativos foi unificada em /admin/campanhas/nova.
 * Este redirect garante que links antigos continuem funcionando.
 */
import { redirect } from 'next/navigation';

export default function CreativosRedirectPage() {
  redirect('/admin/campanhas/nova');
}
