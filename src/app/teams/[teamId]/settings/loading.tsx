import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
const SettingsLoader = () => {
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Settings</CardTitle>
          <CardDescription>
            Manage your team&apos;s basic information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Team Name</Label>
              <Skeleton className="h-10 w-full" />
            </div>

            <div>
              <Label>Description</Label>
              <Skeleton className="h-32 w-full" />
            </div>

            <div>
              <Label>Maximum Members</Label>
              <Skeleton className="h-10 w-full" />
              <p>Maximum number of members allowed in the team</p>
            </div>

            <Button disabled={true}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Invite Code</CardTitle>
          <CardDescription>Manage your team&apos;s invite code</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-full h-10" />
            <Button disabled={true}>Regenerate</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsLoader;
