import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface StatusCardProps {
  title: string;
  status: string;
  metrics?: {
    memory?: number;
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

  const memoryUsage = metrics?.memory ?? 
    ((metrics?.used ?? 0) / (metrics?.total ?? 1)) * 100;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {getStatusIcon()}
      </CardHeader>
      <CardContent>
        {metrics && (
          <div className="space-y-2">
            {metrics.memory && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Memory</span>
                  <span>{formatBytes(metrics.memory.toString())}</span>
                </div>
                <Progress value={memoryUsage} className="h-1" />
              </div>
            )}
            {metrics.cpu && (
              <div className="text-xs text-muted-foreground">
                CPU Usage: {(metrics.cpu / 100).toFixed(1)}%
              </div>
            )}
          </div>
        )}
        {uptime && (
          <div className="text-xs text-muted-foreground mt-2">
            Uptime: {formatUptime(uptime)}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 