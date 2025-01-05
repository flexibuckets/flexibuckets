import Link from "next/link";
import React from "react";

const Footer = () => {
  return (
    <footer className="w-full py-6 px-4 md:px-6 border-t border-gray-200 ">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
        <p className="text-xs sm:text-sm text-secondary-foreground/70 text-center sm:text-left">
          © 2024 FlexiBuckets. All rights reserved. Keeping your buckets full
          and your worries empty. 🪣✨
        </p>
        <nav className="flex gap-4 sm:gap-6 mt-4 sm:mt-0">
          <Link
            prefetch={false}
            className="text-xs sm:text-sm text-secondary-foreground/70 hover:text-secondary-foreground/90 transition-colors"
            href="/refund-policy">
            Refund Policy 💸
          </Link>
          <Link
            prefetch={false}
            className="text-xs sm:text-sm text-secondary-foreground/70 hover:text-secondary-foreground/90 transition-colors"
            href="/tos">
            Terms of Service 📜
          </Link>
          <Link
            prefetch={false}
            className="text-xs sm:text-sm text-secondary-foreground/70 hover:text-secondary-foreground/90 transition-colors"
            href="/privacy-policy">
            Privacy Policy 🔐
          </Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
