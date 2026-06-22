'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthPanel from './AuthPanel';

const links = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/tickets', label: 'All Tickets' },
  { href: '/dashboard/breaches', label: 'SLA Breaches' },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <header className="dash-nav">
      <div className="dash-nav-inner">
        <div className="dash-brand">
          <Link href="/">Jira SLA</Link>
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
        <AuthPanel />
      </div>
    </header>
  );
}
