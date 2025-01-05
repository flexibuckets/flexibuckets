"use client";
import React, { useState } from "react";
import { Button } from "./button";
import { Copy, CopyCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type CopyBtnProps = {
  text: string;
  className?: string;
  withLabel?: boolean;
};
const CopyBtn = ({ text, className, withLabel = false }: CopyBtnProps) => {
  const [copied, setCopied] = useState<boolean>(false);
  const { toast } = useToast();
  const handleCopyClick = () => {
    navigator.clipboard.writeText(text);
    if (!copied) {
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1000);

      if (!withLabel) {
        toast({
          description: (
            <span className="font-medium text-base flex items-center">
              Copied <CopyCheck className="h-4 w-4 ml-2" />
            </span>
          ),
          variant: "success",
        });
      }
    }
  };
  const label = copied ? "Copied" : "Copy";
  return (
    <Button
      onClick={handleCopyClick}
      variant={"ghost"}
      className={cn("bg-accent", className)}>
      {copied ? (
        <>
          <CopyCheck className="h-4 w-4 " />
        </>
      ) : (
        <Copy className="h-4 w-4 " />
      )}
      <span className="ml-2">{withLabel && label}</span>
    </Button>
  );
};

export default CopyBtn;
