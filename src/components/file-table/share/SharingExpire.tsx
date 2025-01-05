import { format } from "date-fns";
import React from "react";

const SharingExpire = ({ expiresAt }: { expiresAt: Date | null }) => {
  if (!expiresAt)
    return (
      <span className="text-destructive dark:text-red-300 text-sm">
        File is shared to public permanently.
      </span>
    );
  return (
    <span className="text-destructive dark:text-red-300 text-sm">
      File sharing stops at: {format(expiresAt, "dd/MM/yyyy p")}
    </span>
  );
};

export default SharingExpire;
