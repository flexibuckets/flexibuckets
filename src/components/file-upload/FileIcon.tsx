import React from "react";
import { Image, FileSpreadsheet, FileVideo, FileText, FileType, FileMusic, File, Code, FileJson, FileArchive, FileAudio, FileIcon as FilePdf, FileImage } from 'lucide-react';
import { AndroidSVG } from "./android-svg";
import { AppleSVG } from "./apple-svg";
import { PhotoshopSVG } from "./photoshop-svg";
import { IllustratorSVG } from "./illustrator-svg";
import { AfterEffectsSVG } from "./after-effects-svg";

interface FileIconProps {
  fileType: string;
  height?: string;
  width?: string;
}

const FileIcon: React.FC<FileIconProps> = ({
  fileType,
  height = "h-4",
  width = "w-4",
}) => {
  const extension = fileType.toLowerCase();
  const sizeClasses = `${width} ${height}`;

  // Function to get icon based on file extension
  const getIconByExtension = (ext: string) => {
    switch (ext) {
      case 'js':
      case 'jsx':
        return <Code className={`text-yellow-500 ${sizeClasses}`} />;
      case 'ts':
      case 'tsx':
        return <Code className={`text-blue-500 ${sizeClasses}`} />;
      case 'py':
        return <Code className={`text-green-500 ${sizeClasses}`} />;
      case 'java':
        return <Code className={`text-red-500 ${sizeClasses}`} />;
      case 'c':
      case 'cpp':
      case 'h':
      case 'hpp':
        return <Code className={`text-purple-500 ${sizeClasses}`} />;
      case 'rb':
        return <Code className={`text-red-600 ${sizeClasses}`} />;
      case 'go':
        return <Code className={`text-cyan-500 ${sizeClasses}`} />;
      case 'php':
        return <Code className={`text-indigo-500 ${sizeClasses}`} />;
      case 'swift':
        return <Code className={`text-orange-500 ${sizeClasses}`} />;
      case 'rs':
        return <Code className={`text-orange-600 ${sizeClasses}`} />;
      case 'kt':
        return <Code className={`text-purple-600 ${sizeClasses}`} />;
      case 'scala':
        return <Code className={`text-red-500 ${sizeClasses}`} />;
      case 'dart':
        return <Code className={`text-blue-400 ${sizeClasses}`} />;
      case 'yml':
      case 'yaml':
        return <FileText className={`text-red-300 ${sizeClasses}`} />;
      case 'toml':
        return <FileText className={`text-gray-500 ${sizeClasses}`} />;
      case 'md':
      case 'markdown':
        return <FileText className={`text-blue-300 ${sizeClasses}`} />;
      case 'dockerfile':
        return <FileText className={`text-blue-400 ${sizeClasses}`} />;
      case 'sh':
      case 'bash':
        return <FileText className={`text-green-600 ${sizeClasses}`} />;
      case 'xml':
        return <Code className={`text-orange-400 ${sizeClasses}`} />;
      case 'json':
        return <FileJson className={`text-yellow-500 ${sizeClasses}`} />;
      case 'csv':
        return <FileSpreadsheet className={`text-green-600 ${sizeClasses}`} />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return <FileArchive className={`text-yellow-600 ${sizeClasses}`} />;
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'flac':
        return <FileAudio className={`text-purple-500 ${sizeClasses}`} />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
      case 'flv':
      case 'mkv':
        return <FileVideo className={`text-red-500 ${sizeClasses}`} />;
      case 'pdf':
        return <FilePdf className={`text-red-600 ${sizeClasses}`} />;
      case 'doc':
      case 'docx':
        return <FileType className={`text-blue-600 ${sizeClasses}`} />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className={`text-green-600 ${sizeClasses}`} />;
      case 'ppt':
      case 'pptx':
        return <FileType className={`text-orange-600 ${sizeClasses}`} />;
      case 'txt':
        return <FileText className={`text-gray-500 ${sizeClasses}`} />;
      case 'html':
      case 'htm':
        return <Code className={`text-orange-500 ${sizeClasses}`} />;
      case 'css':
      case 'scss':
      case 'sass':
        return <Code className={`text-blue-400 ${sizeClasses}`} />;
      case 'svg':
        return <FileImage className={`text-orange-400 ${sizeClasses}`} />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'bmp':
      case 'webp':
        return <Image className={`text-blue-500 ${sizeClasses}`} />;
      case 'psd':
        return <PhotoshopSVG className={sizeClasses} />;
      case 'ai':
        return <IllustratorSVG className={sizeClasses} />;
      case 'aep':
        return <AfterEffectsSVG className={sizeClasses} />;
      case 'apk':
        return <AndroidSVG className={`text-green-500 ${sizeClasses}`} />;
      case 'ipa':
        return <AppleSVG className={`text-gray-500 ${sizeClasses}`} />;
      default:
        return <File className={`text-gray-500 ${sizeClasses}`} />;
    }
  };

  // Check if the fileType is a MIME type or a file extension
  if (fileType.includes('/')) {
    // Handle MIME types
    const [type, subtype] = fileType.split('/');
    switch (type) {
      case 'image':
        return <Image className={`text-blue-500 ${sizeClasses}`} />;
      case 'video':
        return <FileVideo className={`text-red-500 ${sizeClasses}`} />;
      case 'audio':
        return <FileAudio className={`text-purple-500 ${sizeClasses}`} />;
      case 'text':
        return getIconByExtension(subtype);
      case 'application':
        return getIconByExtension(subtype);
      default:
        return <File className={`text-gray-500 ${sizeClasses}`} />;
    }
  } else {
    // Handle file extensions
    return getIconByExtension(fileType.replace('.', ''));
  }
};

export default FileIcon;

