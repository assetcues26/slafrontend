'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthSession } from '../hooks/useAuthSession';

const links = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/tickets', label: 'All Tickets' },
  { href: '/dashboard/breaches', label: 'SLA Breaches' },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const { session, loading, signOut } = useAuthSession();
  const email = session?.user.email ?? '';
  const initial = email ? email[0]?.toUpperCase() : '?';

  return (
    <header className="dash-nav">
      <div className="dash-nav-inner">
        <div className="dash-brand">
          <span className="dash-brand-logo" aria-hidden>AC</span>
          <Link href="/">Assetcues Support</Link>
        </div>
        <nav className="dash-links">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? 'active' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="dash-user">
          {loading ? (
            <span className="muted">Loading…</span>
          ) : session ? (
            <>
              <span className="dash-avatar" aria-hidden>{initial}</span>
              <span className="dash-user-email">{email}</span>
              <button className="btn-signout" type="button" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="ghost">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
