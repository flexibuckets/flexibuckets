'use client';

import { useState, useEffect } from 'react';
import FileIcon from '@/components/file-upload/FileIcon';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface FilePreviewProps {
  file: {
    name: string;
    type: string;
    size: number;
    url: string;
  };
}

const FilePreview: React.FC<FilePreviewProps> = ({ file }) => {
  const [isError, setIsError] = useState(false);
  const [textContent, setTextContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

  useEffect(() => {
    const loadTextContent = async () => {
      const textTypes = ['text/', 'application/json', 'application/xml'];
      if (textTypes.some(type => file.type.startsWith(type))) {
        try {
          setIsLoading(true);
          const response = await fetch(file.url);
          const text = await response.text();
          setTextContent(text);
        } catch (error) {
          console.error('Error loading text content:', error);
          setIsError(true);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadTextContent();
  }, [file.url, file.type]);

  const renderPreview = () => {
    // Image preview
    if (file.type.startsWith('image/')) {
      return (
        <div className="flex justify-center">
          <img
            src={file.url}
            alt={file.name}
            className="max-w-full max-h-[70vh] object-contain"
            onError={() => setIsError(true)}
          />
        </div>
      );
    }

    // Video preview
    if (file.type.startsWith('video/')) {
      return (
        <div className="flex justify-center">
          <video
            controls
            className="max-w-full max-h-[70vh]"
            onError={() => setIsError(true)}
          >
            <source src={file.url} type={file.type} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Audio preview
    if (file.type.startsWith('audio/')) {
      return (
        <div className="flex justify-center">
          <audio
            controls
            className="w-full max-w-2xl"
            onError={() => setIsError(true)}
          >
            <source src={file.url} type={file.type} />
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }

    // PDF preview
    if (file.type === 'application/pdf') {
      return (
        <div className="flex justify-center h-[70vh]">
          <iframe
            src={`${file.url}#view=FitH`}
            className="w-full h-full"
            onError={() => setIsError(true)}
          />
        </div>
      );
    }

    // Text/Code preview
    const textTypes = ['text/', 'application/json', 'application/xml'];
    if (textTypes.some(type => file.type.startsWith(type))) {
      if (isLoading) {
        return (
          <div className="flex justify-center py-12">
            <p>Loading content...</p>
          </div>
        );
      }
      return (
        <div className="w-full max-h-[70vh] overflow-auto">
          <pre className="p-4 bg-secondary rounded-lg">
            <code>{textContent}</code>
          </pre>
        </div>
      );
    }

    // Default: No preview available
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileIcon fileType={file.type} height="h-20" width="w-20" />
        <p className="mt-4 text-muted-foreground">Preview not available</p>
      </div>
    );
  };

  const handleDownload = () => {
    window.open(file.url, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileIcon fileType={file.type} />
          <span className="font-medium">{file.name}</span>
          <span className="text-sm text-muted-foreground">
            ({formatBytes(file.size.toString())})
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>

      <div className="border rounded-lg p-4">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive">Error loading preview</p>
          </div>
        ) : (
          renderPreview()
        )}
      </div>
    </div>
  );
};

export default FilePreview; 