import { auth } from "@/auth";
import AccessDenied from "@/components/dashboard/AccessDenied";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
const loading = () => {
  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">User Settings</h1>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Alter Ego Activation</CardTitle>
            <CardDescription>
              Ready to rebrand? Change your name and watch your alter ego come
              to life—cape optional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col  gap-y-4">
              <Label>Your Name</Label>
              <Skeleton className="h-10 w-full" />
              <div className="self-end">
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default loading;
