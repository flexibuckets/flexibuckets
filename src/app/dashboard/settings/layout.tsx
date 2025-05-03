'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserIcon, KeyRound } from 'lucide-react';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    {
      title: 'Account',
      href: '/dashboard/settings',
      icon: UserIcon,
    },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6">
        <div className="flex flex-col md:flex-row md:space-x-8">
          <div className="md:w-1/4 mb-8 md:mb-0">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-md',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="md:w-3/4">{children}</div>
        </div>
      </div>
    </div>
  );
} 