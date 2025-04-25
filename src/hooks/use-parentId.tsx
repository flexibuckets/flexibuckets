'use client';

import { useEffect, useState } from "react";
import { useSearchParamsWithSuspense } from "./use-searchparams";

export const useParentId = () => {
  const { getParam } = useSearchParamsWithSuspense();
  const initialParentId = getParam("parentId");
  const [parentId, setParentId] = useState<string | null>(initialParentId);

  useEffect(() => {
    setParentId(initialParentId);
  }, [initialParentId]);

  const updateParentId = (val: string | null) => {
    setParentId(val);
  };

  return {
    parentId,
    updateParentId,
  };
};

export const ParentIdProvider = ({ children }: { children: React.ReactNode }) => {
  return children;
};
