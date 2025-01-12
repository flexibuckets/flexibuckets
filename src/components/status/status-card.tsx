import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface StatusCardProps {
  title: string;
  status: string;
  metrics?: {
    memory?: number;
    memoryLimit?: number;
    cpu?: number;
    used?: number;
    total?: number;
    free?: number;
  };
  uptime?: number;
}

export function StatusCard({ title, status, metrics, uptime }: StatusCardProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'info':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatMemorySize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    const mb = bytes / (1024 * 1024);
    
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const calculateMemoryUsage = () => {
    if (metrics?.memory && metrics?.memoryLimit) {
      return (metrics.memory / metrics.memoryLimit) * 100;
    }
    if (metrics?.used && metrics?.total) {
      return (metrics.used / metrics.total) * 100;
    }
    return 0;
  };

  const memoryUsage = calculateMemoryUsage();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {getStatusIcon()}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {metrics && (
            <>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Memory</span>
                  <span>
                    {metrics.memory ? formatMemorySize(metrics.memory) : 
                     metrics.used ? formatMemorySize(metrics.used) : '0 MB'}
                    {metrics.memoryLimit ? ` / ${formatMemorySize(metrics.memoryLimit)}` :
                     metrics.total ? ` / ${formatMemorySize(metrics.total)}` : ''}
                  </span>
                </div>
                <Progress 
                  value={memoryUsage} 
                  className={`h-1 ${memoryUsage > 90 ? "bg-red-500" : 
                                   memoryUsage > 70 ? "bg-yellow-500" : 
                                   "bg-green-500"}`}
                />
              </div>
              {metrics.cpu !== undefined && (
                <div className="text-xs text-muted-foreground">
                  CPU Usage: {metrics.cpu > 0.01 ? metrics.cpu.toFixed(1) : '< 0.1'}%
                </div>
              )}
            </>
          )}
          {uptime && (
            <div className="text-xs text-muted-foreground mt-2">
              Uptime: {formatUptime(uptime)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 