import Link from "next/link";
import React from "react";

const Footer = () => {
  return (
    <footer className="w-full py-6 px-4 md:px-6 border-t border-gray-200 ">
      <div className="container mx-auto flex flex-col sm:flex-row justify-center items-center">
        <p className="text-xs sm:text-sm text-secondary-foreground/70 text-center sm:text-left">
          © 2025 FlexiBuckets. Open Source Version , Checkout the repo <Link href="https://github.com/flexibuckets/flexibuckets" target="_blank" className="text-primary underline">here.</Link>.
        </p>
        </div>
    </footer>
  );
};

export default Footer;
