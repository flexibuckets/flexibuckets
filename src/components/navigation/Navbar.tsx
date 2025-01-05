import { navLinks } from '@/lib/routes';
import Link from 'next/link';
import React from 'react';
import { buttonVariants } from '../ui/button';
import MobileNav from './MobileNav';
import AuthButton from '../AuthButton';
import { ThemeSwitcher } from '../ThemeSwitcher';
import Logo from '@/assets/logo.png';
import Image from 'next/image';
const Navbar = () => {
  return (
    <nav className="sticky h-14 inset-x-0 top-0 z-30 w-full bg-background/75 backdrop-blur-lg transition-all">
      <div className="mx-auto w-full max-w-screen-xl px-2.5 md:px-20 h-full">
        <div className="flex relative items-center justify-between h-full">
          <Link className="z-50" href="/">
            <Image src={Logo} height={75} width={100} alt="Flexibuckets" />
          </Link>

          <MobileNav links={navLinks} />
          <div className="lg:flex items-center gap-x-5 lg:gap-x-10 hidden">
            {navLinks?.map(({ href, label }, index) => {
              return (
                <Link
                  href={href}
                  key={index}
                  className={buttonVariants({
                    variant: 'ghost',
                    size: 'sm',
                  })}
                >
                  {label}
                </Link>
              );
            })}
          </div>
          <div className="lg:flex items-center  gap-x-5 hidden">
            <ThemeSwitcher />
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
