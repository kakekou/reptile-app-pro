'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PawPrint, ClipboardList, Heart, Plus } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',             icon: Home,          label: 'ホーム' },
  { href: '/individuals',  icon: PawPrint,      label: '個体' },
  { href: '/management',   icon: ClipboardList, label: '管理' },
  { href: '/breeding',     icon: Heart,         label: '繁殖' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  // ログイン画面では非表示
  if (pathname === '/login' || pathname.startsWith('/auth')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1E293B]/70 backdrop-blur-[12px] border-t border-white/5 safe-bottom">
      <div className="relative mx-auto max-w-lg">
        {/* 中央の+ボタン */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-5">
          <Link
            href="/"
            className="w-12 h-12 bg-primary rounded-full shadow-lg shadow-primary/40 flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
          </Link>
        </div>

        {/* ナビアイテム */}
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }, index) => {
            const isActive =
              href === '/'
                ? pathname === '/'
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors ${
                  index === 1 ? 'mr-6' : index === 2 ? 'ml-6' : ''
                } ${
                  isActive
                    ? 'text-primary'
                    : 'text-slate-400'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
