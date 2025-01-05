"use state";
import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useQuery } from "@tanstack/react-query";
import { getBreadcrumbsLinks } from "@/app/actions";
import { Skeleton } from "../ui/skeleton";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

type FileBreadCrumbsProps = {
  bucketId: string;
  parentId: string;
  bucketName: string;
  isTeams?: boolean;
};

const getUrl = (bucketId: string, parentId?: string): string => {
  const urlWithoutParentId = `/dashboard/bucket/${bucketId}`;
  if (!parentId) return urlWithoutParentId;
  else return `${urlWithoutParentId}?parentId=${parentId}`;
};
const FileBreadCrumbs: React.FC<FileBreadCrumbsProps> = ({
  bucketId,
  bucketName,
  parentId,
  isTeams = false,
}) => {
  const { data: breadcrumbs, isLoading } = useQuery({
    queryFn: () => getBreadcrumbsLinks({ parentId }),
    queryKey: [isTeams ? "team-breadcrumbs" : "breadcrumbs"],
    staleTime: Infinity,
  });
  const router = useRouter();
  const handleBreadcrumbClick = (parentId?: string) => {
    const params = new URLSearchParams(window.location.search);
    if (parentId) {
      params.set("parentId", parentId);
      router.push(`?${params.toString()}`);
    } else {
      params.delete("parentId");
      router.replace(getUrl(bucketId));
    }
  };
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink>
            <Button
              onClick={() => handleBreadcrumbClick()}
              className="p-0"
              variant="link">
              {bucketName}
            </Button>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {isLoading ? (
          <BreadcrumbLoader />
        ) : breadcrumbs && breadcrumbs.length > 0 ? (
          <>
            {breadcrumbs.map(({ id, name }, index) => (
              <BreadcrumbItem key={id}>
                {index === breadcrumbs.length - 1 ? (
                  <>
                    <BreadcrumbPage>
                      <Button
                        onClick={() => handleBreadcrumbClick(id)}
                        disabled
                        className="p-0"
                        variant="link">
                        {name}
                      </Button>
                    </BreadcrumbPage>
                  </>
                ) : (
                  <>
                    <BreadcrumbLink asChild>
                      <Button
                        onClick={() => handleBreadcrumbClick(id)}
                        className="p-0"
                        variant="link">
                        {name}
                      </Button>
                    </BreadcrumbLink>
                    <BreadcrumbSeparator />
                  </>
                )}
              </BreadcrumbItem>
            ))}
          </>
        ) : (
          <p className="text-sm text-destructive">
            Unable to load directories.
          </p>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

const BreadcrumbLoader = () => {
  return (
    <>
      <BreadcrumbItem>
        <BreadcrumbPage>
          <Skeleton className="h-4 w-6" />
        </BreadcrumbPage>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>
          <Skeleton className="h-4 w-6" />
        </BreadcrumbPage>
      </BreadcrumbItem>
    </>
  );
};
export default FileBreadCrumbs;
