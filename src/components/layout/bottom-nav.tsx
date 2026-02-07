'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListChecks, Heart, ClipboardList } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',             icon: LayoutDashboard, label: 'ホーム' },
  { href: '/individuals',  icon: ListChecks,      label: '個体' },
  { href: '/management',   icon: ClipboardList,   label: '管理' },
  { href: '/breeding',     icon: Heart,           label: '繁殖' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  // ログイン画面では非表示
  if (pathname === '/login' || pathname.startsWith('/auth')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white/80 backdrop-blur-xl safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 pt-2 pb-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === '/'
              ? pathname === '/'
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-accent-blue'
                  : 'text-text-tertiary'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
