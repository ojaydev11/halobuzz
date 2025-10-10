import { redirect } from 'next/navigation';

/**
 * Root page - redirects to admin dashboard
 * Actual redirect is configured in next.config.js
 */
export default function HomePage() {
  redirect('/admin/overview');
}
