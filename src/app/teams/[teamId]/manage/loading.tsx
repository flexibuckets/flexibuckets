import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
const loading = () => {
  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            {/* Skeleton for team name */}
            <Skeleton className="w-48 h-6 mb-2" />

            {/* Skeleton for member count */}
            <Skeleton className="w-24 h-4" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage your team members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Array of skeleton rows to simulate loading members */}
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {/* Skeleton for avatar */}
                    <Skeleton className="w-10 h-10 rounded-full" />

                    <div>
                      {/* Skeletons for name and email */}
                      <Skeleton className="w-24 h-4 mb-1" />
                      <Skeleton className="w-32 h-3" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Skeleton for role control */}
                    <Skeleton className="w-20 h-8" />

                    {/* Skeleton for remove button */}
                    <Skeleton className="w-8 h-8" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default loading;
