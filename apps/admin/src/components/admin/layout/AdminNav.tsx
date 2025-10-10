'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Video,
  Gamepad2,
  Shield,
  Settings,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { RBACGate } from '../shared/RBACGate';

const navItems = [
  {
    title: 'Overview',
    href: '/admin/overview',
    icon: LayoutDashboard,
  },
  {
    title: 'Users & Creators',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Economy & Payments',
    href: '/admin/economy',
    icon: DollarSign,
  },
  {
    title: 'Live & Reels',
    href: '/admin/live',
    icon: Video,
  },
  {
    title: 'Games & Tournaments',
    href: '/admin/games',
    icon: Gamepad2,
  },
  {
    title: 'Moderation & Safety',
    href: '/admin/moderation',
    icon: Shield,
  },
];

const superAdminItems = [
  {
    title: 'System & Config',
    href: '/admin/system',
    icon: Settings,
  },
  {
    title: 'Halo-AI Console',
    href: '/admin/halo-ai',
    icon: Sparkles,
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.title}
          </Link>
        );
      })}

      <div className="my-2 border-t border-border" />

      <RBACGate superAdminOnly>
        {superAdminItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </RBACGate>
    </nav>
  );
}
