import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from 'lucide-react';
import { DEFAULT_LIMITS } from "@/config/limits";
import { formatBytes } from "@/lib/utils";

const PlanInfo = () => {
  const features = [
    `${formatBytes((DEFAULT_LIMITS.storage * 1024 * 1024 * 1024).toString())} Storage`,
    `${DEFAULT_LIMITS.fileShares.toLocaleString()} File Shares`,
    `${formatBytes((DEFAULT_LIMITS.sharedStorageLimit * 1024 * 1024 * 1024).toString())} Shared Storage`,
    `${formatBytes((DEFAULT_LIMITS.downloadLimit * 1024 * 1024 * 1024).toString())} Download Limit`,
    `${DEFAULT_LIMITS.buckets} Buckets`,
    `${DEFAULT_LIMITS.maxFileUpload.toLocaleString()} Max Files`,
    `${formatBytes((DEFAULT_LIMITS.maxFileUploadSize * 1024 * 1024).toString())} Max File Size`,
    DEFAULT_LIMITS.addFreeSharing ? 'Free Sharing Enabled' : 'Free Sharing Disabled'
  ];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <InfoIcon className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>
          <h4 className="text-lg font-bold capitalize mb-2">System Limits</h4>
          <ul className="text-sm">
            {features.map((feature, index) => (
              <li key={index} className="mb-1">
                • {feature}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PlanInfo;

