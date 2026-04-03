import React, { useCallback, useState } from 'react';
import { Upload, File, Image, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DroppedFile {
  id: string;
  file: File;
  name: string;
  type: 'image' | 'text' | 'code' | 'other';
  preview?: string;
  content?: string;
}

interface FileDropZoneProps {
  onFilesDropped: (files: DroppedFile[]) => void;
  files: DroppedFile[];
  onRemoveFile: (id: string) => void;
  compact?: boolean;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesDropped,
  files,
  onRemoveFile,
  compact = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const getFileType = (file: File): DroppedFile['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (
      file.type === 'text/plain' ||
      file.type === 'text/html' ||
      file.type === 'text/css' ||
      file.type === 'application/javascript' ||
      file.type === 'text/javascript' ||
      file.name.match(/\.(tsx?|jsx?|html|css|json|md)$/i)
    ) return 'code';
    if (file.type.startsWith('text/')) return 'text';
    return 'other';
  };

  const processFile = async (file: File): Promise<DroppedFile> => {
    const type = getFileType(file);
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const droppedFile: DroppedFile = {
      id,
      file,
      name: file.name,
      type,
    };

    // Generate preview for images
    if (type === 'image') {
      droppedFile.preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    // Read text content for code/text files
    if (type === 'code' || type === 'text') {
      droppedFile.content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(file);
      });
    }

    return droppedFile;
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    const processedFiles = await Promise.all(droppedFiles.map(processFile));
    onFilesDropped(processedFiles);
  }, [onFilesDropped]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const processedFiles = await Promise.all(selectedFiles.map(processFile));
    onFilesDropped(processedFiles);
    e.target.value = '';
  };

  if (compact && files.length === 0) {
    return (
      <label
        className={cn(
          "flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer transition-colors",
          "text-muted-foreground hover:text-foreground hover:bg-muted",
          isDragging && "bg-primary/10 text-primary"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="w-3 h-3" />
        <span>Drop files</span>
        <input
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInput}
          accept="image/*,.txt,.html,.css,.js,.jsx,.ts,.tsx,.json,.md"
        />
      </label>
    );
  }

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <label
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all",
          "text-muted-foreground hover:border-primary/50 hover:bg-primary/5",
          isDragging && "border-primary bg-primary/10"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className={cn("w-6 h-6", isDragging && "text-primary")} />
        <div className="text-center">
          <p className="text-sm font-medium">Drop files here</p>
          <p className="text-xs">Images, code, or text files</p>
        </div>
        <input
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInput}
          accept="image/*,.txt,.html,.css,.js,.jsx,.ts,.tsx,.json,.md"
        />
      </label>

      {/* File previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="relative group flex items-center gap-2 px-2 py-1 bg-muted rounded text-xs"
            >
              {file.type === 'image' && file.preview ? (
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-6 h-6 object-cover rounded"
                />
              ) : file.type === 'code' ? (
                <File className="w-4 h-4 text-blue-500" />
              ) : (
                <File className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="max-w-[100px] truncate">{file.name}</span>
              <button
                onClick={() => onRemoveFile(file.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};