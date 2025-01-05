import { formatBytes } from "@/lib/utils";
import { UsageType } from "@/types/payment.types";
import { PlanConfig } from "@/config/dodo";
import { 
  HardDrive, 
  Share2, 
  Download, 
  Database, 
  FileIcon,
  FolderTree 
} from "lucide-react";
import StatCard from "@/components/ui/stat-card";

interface UsageStatsProps {
  usageStats: UsageType;
  config: PlanConfig;
  bucketCount: number;
  fileCount: number;
  folderCount: number;
}

const UsageStats: React.FC<UsageStatsProps> = ({
  usageStats,
  config,
  bucketCount,
  fileCount,
  folderCount,
}) => {
  const {
    totalUploadSize,
    totalFileShares,
    totalSharedStorage,
    totalDownloadedSize,
  } = usageStats;

  const availableStorage = config.storage * 1024 * 1024 * 1024;
  const downloadLimit = config.downloadLimit * 1024 * 1024 * 1024;
  const shareLimit = config.sharedStorageLimit * 1024 * 1024 * 1024;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Usage Overview</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Storage Used"
          value={formatBytes(totalUploadSize)}
          Icon={HardDrive}
          progress={(parseInt(totalUploadSize) / availableStorage) * 100}
          total={formatBytes(availableStorage.toString())}
        />
        <StatCard
          title="Shared Files"
          value={`${totalFileShares} shares`}
          Icon={Share2}
          progress={(totalFileShares / config.fileShares) * 100}
          total={config.fileShares}
        />
        <StatCard
          title="Downloaded"
          value={formatBytes(totalDownloadedSize)}
          Icon={Download}
          progress={(parseInt(totalDownloadedSize) / downloadLimit) * 100}
          total={formatBytes(downloadLimit.toString())}
        />
        <StatCard
          title="Shared Data"
          value={formatBytes(totalSharedStorage)}
          Icon={Download}
          progress={(parseInt(totalSharedStorage) / shareLimit) * 100}
          total={formatBytes(shareLimit.toString())}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Buckets"
          value={bucketCount}
          Icon={Database}
          progress={(bucketCount / config.buckets) * 100}
          total={`${config.buckets} buckets`}
        />
        <StatCard
          title="Total Files"
          value={fileCount}
          Icon={FileIcon}
          progress={(fileCount / config.maxFileUpload) * 100}
          total={config.maxFileUpload}
        />
        <StatCard 
          title="Total Folders" 
          value={folderCount} 
          Icon={FolderTree} 
        />
      </div>
    </div>
  );
};

export default UsageStats;
