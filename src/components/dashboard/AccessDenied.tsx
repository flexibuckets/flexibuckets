"use client";
import React from "react";
import { useRouter } from "next/navigation"; // Adjust if not using Next.js
import { Button } from "../ui/button"; // Replace with your actual button component
import { Lock } from "lucide-react";
const AccessDenied = () => {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-7.5rem)] gap-y-2">
      <Lock className="w-16 h-16 text-destructive " />
      <h2 className="text-2xl font-semibold text-red-500 ">Access Denied</h2>
      <p className="text-red-400  text-center">
        Please sign in to view your buckets.
      </p>
      <Button variant="destructive" onClick={() => router.push("/auth")}>
        Sign In
      </Button>
    </div>
  );
};

export default AccessDenied;
