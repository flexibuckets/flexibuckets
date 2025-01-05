import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Loader2, MoreHorizontal, Lock } from 'lucide-react';


const TableAction = ({
  isLoading,
  children,
}: {
  isLoading: boolean;
  children: React.ReactNode;
}) => {
  

  return (
    <>
      {isLoading ? (
        <div className="px-2">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="flex flex-col gap-y-1 px-2"
          >
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {children}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
};

export default TableAction;
