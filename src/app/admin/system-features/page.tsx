import { redirect } from 'next/navigation';

export default function RedirectToFeatures() {
  redirect('/admin/master/features');
}
