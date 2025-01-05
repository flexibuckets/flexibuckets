import React from "react";

import { Loader2 } from "lucide-react";

const DashboardLoader = () => {
  return (
    <div className="h-[calc(100vh-7rem)] w-full flex flex-col gap-y-4 justify-center items-center text-lg">
      <Loader2 className="h-8 w-8 animate-spin" />
      <div className="flex items-center">
        Getting your buckets/files
        <span className="inline-block animate-bounce ml-2 text-xl">.</span>
        <span className="inline-block animate-bounce text-xl delay-200">.</span>
        <span className="inline-block animate-bounce text-xl delay-400">.</span>
      </div>
    </div>
  );
};

export default DashboardLoader;
