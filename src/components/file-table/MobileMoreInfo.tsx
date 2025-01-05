import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';
const MobileMoreInfo = ({ children }: { children: React.ReactNode }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <InfoIcon className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const MobileMoreInfoRow = ({
  heading,
  value,
}: {
  heading: string;
  value: string;
}) => {
  return (
    <div className="flex items-center gap-x-1 font-medium text-sm text-capitalize">
      <span className="text-muted-foreground text-xs font-light lowercase">
        {heading}:
      </span>
      {value}
    </div>
  );
};
export default MobileMoreInfo;
