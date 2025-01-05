import React from "react";

import { AlertCircle } from "lucide-react";

const DashboardError = ({ errorMessage }: { errorMessage?: string }) => {
  return (
    <div className="h-[calc(100vh-7rem)] w-full flex flex-col gap-y-4 justify-center items-center text-lg">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <div className="flex items-center">
        {errorMessage || "An error occurred while fetching your buckets/files."}
      </div>
      <div className="text-sm text-gray-500">
        Please try again later or contact support if the issue persists.
      </div>
    </div>
  );
};

export default DashboardError;
