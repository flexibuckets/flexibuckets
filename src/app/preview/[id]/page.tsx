'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FilePreview from "@/components/preview/FilePreview";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PreviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [fileData, setFileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFileData = async () => {
      try {
        // TODO: Replace with actual API endpoint
        const response = await fetch(`/api/files/${id}`);
        const data = await response.json();
        setFileData(data);
      } catch (error) {
        console.error("Error fetching file data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFileData();
    }
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
      
      {fileData && (
        <div className="bg-background border border-border rounded-lg p-6">
          <FilePreview file={fileData} />
        </div>
      )}
    </div>
  );
} 