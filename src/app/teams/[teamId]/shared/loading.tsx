import { TableLoader } from "@/components/share-file-table/SharedFileTables";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React from "react";

const loading = () => {
  return (
    <div className="p-6 bg-background text-foreground space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div className="text-2xl font-bold flex gap-x-2">
          <Skeleton className="h-6 w-16" /> Shared Files
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            {<TableHead>SharedBy</TableHead>}
            <TableHead>Shared On</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{<TableLoader count={3} colCount={6} />}</TableBody>
      </Table>
    </div>
  );
};

export default loading;
