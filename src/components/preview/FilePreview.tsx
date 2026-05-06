'use client';

import { useState, useEffect } from 'react';
import FileIcon from '@/components/file-upload/FileIcon';
import { Button } from '@/components/ui/button';
import {
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface FilePreviewProps {
  file: {
    name: string;
    type: string;
    size: number | string;
    url: string;
  };
  showHeader?: boolean;
}

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  scala: 'scala',
  dart: 'dart',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  sql: 'sql',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  md: 'markdown',
  markdown: 'markdown',
  r: 'r',
  lua: 'lua',
  perl: 'perl',
  pl: 'perl',
  dockerfile: 'docker',
  makefile: 'makefile',
  graphql: 'graphql',
  vue: 'html',
  svelte: 'html',
};

function getLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (EXTENSION_TO_LANGUAGE[ext]) return EXTENSION_TO_LANGUAGE[ext];
  const lower = fileName.toLowerCase();
  if (lower === 'dockerfile') return 'docker';
  if (lower === 'makefile') return 'makefile';
  if (lower === '.gitignore' || lower === '.env') return 'bash';
  return 'text';
}

function isPreviewable(type: string, name: string): boolean {
  const previewableTypes = [
    'image/',
    'video/',
    'audio/',
    'application/pdf',
    'text/',
    'application/json',
    'application/xml',
  ];
  if (previewableTypes.some((t) => type.startsWith(t))) return true;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ext in EXTENSION_TO_LANGUAGE;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  showHeader = true,
}) => {
  const [isError, setIsError] = useState(false);
  const [textContent, setTextContent] = useState<string>('');
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

  useEffect(() => {
    const loadTextContent = async () => {
      const textTypes = [
        'text/',
        'application/json',
        'application/xml',
      ];
      const isCode =
        fileExtension in EXTENSION_TO_LANGUAGE;
      if (textTypes.some((t) => file.type.startsWith(t)) || isCode) {
        try {
          setIsLoadingText(true);
          const response = await fetch(file.url);
          const text = await response.text();
          setTextContent(text);
        } catch {
          setIsError(true);
        } finally {
          setIsLoadingText(false);
        }
      }
    };

    loadTextContent();
  }, [file.url, file.type, fileExtension]);

  const resetImageView = () => {
    setZoom(1);
    setRotation(0);
  };

  const renderPreview = () => {
    if (file.type.startsWith('image/')) {
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1 mb-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setRotation((r) => (r + 90) % 360)}
            >
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={resetImageView}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ScrollArea className="max-h-[65vh] w-full">
            <div className="flex justify-center overflow-auto">
              <img
                src={file.url}
                alt={file.name}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
                className="max-w-full object-contain transition-transform"
                onError={() => setIsError(true)}
              />
            </div>
          </ScrollArea>
        </div>
      );
    }

    if (file.type.startsWith('video/')) {
      return (
        <div className="flex justify-center">
          <video
            controls
            className="max-w-full max-h-[65vh] rounded"
            onError={() => setIsError(true)}
          >
            <source src={file.url} type={file.type} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (file.type.startsWith('audio/')) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <FileIcon fileType={file.type} height="h-16" width="w-16" />
          <p className="font-medium">{file.name}</p>
          <audio
            controls
            className="w-full max-w-lg"
            onError={() => setIsError(true)}
          >
            <source src={file.url} type={file.type} />
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }

    if (file.type === 'application/pdf') {
      return (
        <div className="h-[65vh] w-full">
          <iframe
            src={`${file.url}#view=FitH`}
            className="w-full h-full rounded border"
            onError={() => setIsError(true)}
            title={file.name}
          />
        </div>
      );
    }

    const textTypes = ['text/', 'application/json', 'application/xml'];
    const isCode = fileExtension in EXTENSION_TO_LANGUAGE;

    if (textTypes.some((t) => file.type.startsWith(t)) || isCode) {
      if (isLoadingText) {
        return (
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        );
      }
      const language = getLanguageFromFileName(file.name);
      const lineCount = textContent.split('\n').length;
      return (
        <ScrollArea className="max-h-[65vh]">
          <div className="relative">
            <div className="absolute top-2 right-2 z-10">
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {language.toUpperCase()} &middot; {lineCount} lines
              </span>
            </div>
            <SyntaxHighlighter
              language={language}
              style={oneDark}
              customStyle={{
                margin: 0,
                borderRadius: '0.5rem',
                fontSize: '0.8rem',
                maxHeight: '65vh',
              }}
              showLineNumbers
              wrapLines
              wrapLongLines
            >
              {textContent}
            </SyntaxHighlighter>
          </div>
        </ScrollArea>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <FileIcon fileType={file.type} height="h-16" width="w-16" />
        <p className="text-muted-foreground">Preview not available for this file type</p>
        <p className="text-xs text-muted-foreground">{file.type || 'Unknown type'}</p>
      </div>
    );
  };

  const handleDownload = () => {
    window.open(file.url, '_blank');
  };

  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileIcon fileType={file.type} />
            <span className="font-medium truncate">{file.name}</span>
            <span className="text-sm text-muted-foreground shrink-0">
              ({formatBytes(String(file.size))})
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownload} className="shrink-0">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      )}

      <div className="border rounded-lg p-4">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-destructive">Error loading preview</p>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download file instead
            </Button>
          </div>
        ) : (
          renderPreview()
        )}
      </div>
    </div>
  );
};

export default FilePreview;
export { isPreviewable };
