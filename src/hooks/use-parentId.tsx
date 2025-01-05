import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const useParentId = () => {
  const searchParams = useSearchParams();
  const initialParentId = searchParams.get("parentId");
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

export default useParentId;
