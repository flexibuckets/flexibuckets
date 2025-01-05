"use client";
import { LayoutDashboard, LogIn } from "lucide-react";
import Link from "next/link";
import React from "react";
import { buttonVariants } from "./ui/button";
import { useSession } from "next-auth/react";

const AuthButton = () => {
  const { status } = useSession();

  if (status === "authenticated")
    return (
      <Link href={"/dashboard"} className={buttonVariants()}>
        <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
      </Link>
    );

  return (
    <Link href={"/auth/signin"} className={buttonVariants()}>
      <LogIn className="h-4 w-4 mr-2" /> Login
    </Link>
  );
};

export default AuthButton;
