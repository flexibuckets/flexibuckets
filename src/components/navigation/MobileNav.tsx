'use client';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { buttonVariants } from '../ui/button';
import { Separator } from '@/components/ui/separator';
import React from 'react';

import { NavLink } from '@/lib/types';
import AuthButton from '../AuthButton';
import { ThemeSwitcher } from '../ThemeSwitcher';

const MobileNav = ({ links }: { links: NavLink[] }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  const pathname = usePathname();

  useEffect(() => {
    if (isOpen) toggleOpen();
  }, [pathname]);

  const closeOnCurrent = (href: string) => {
    if (pathname === href) {
      toggleOpen();
    }
  };
  return (
    <div className="lg:hidden">
      <Menu onClick={toggleOpen} className="relative z-50 h-8 w-8 " />
      {isOpen ? (
        <div className="fixed animate-in slide-in-from-top-5 fade-in-20 inset-0 z-0 w-full">
          <ul className="absolute bg-background border-b border-zinc-200 shadow-xl grid w-full gap-3 px-2.5 md:px-20 pt-20 pb-8">
            {links?.map(({ href, label }, index) => {
              return (
                <li key={index}>
                  <Link
                    onClick={() => closeOnCurrent(href)}
                    href={href}
                    className={buttonVariants({
                      variant: 'ghost',
                      size: 'sm',
                    })}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
            <Separator />
            <li>
              <ThemeSwitcher withLabel={true} />
            </li>
            <li>
              <AuthButton />
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default MobileNav;
