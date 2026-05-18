'use client';
import { useRef, useState, useCallback } from 'react';
import { CloudUpload, FileText, CheckCircle2, X } from 'lucide-react';

interface FileDropzoneProps {
  label: string;
  hint?: string;
  accept?: string;
  maxSizeMB?: number;
  onFileSelect?: (file: File | null) => void;
}

interface UploadedFile {
  name: string;
  sizeMB: string;
}

export function FileDropzone({ label, hint, accept = '.pdf', maxSizeMB = 10, onFileSelect }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File must be under ${maxSizeMB}MB`);
      return;
    }
    setUploadedFile({ name: file.name, sizeMB: (file.size / (1024 * 1024)).toFixed(1) });
    onFileSelect?.(file);
  }, [maxSizeMB, onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const removeFile = () => {
    setUploadedFile(null);
    onFileSelect?.(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {uploadedFile ? (
        <div className="flex items-center gap-3 p-3 rounded-input border border-green-200 bg-green-50">
          <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{uploadedFile.name}</p>
            <p className="text-xs text-muted-foreground">{uploadedFile.sizeMB} MB · Upload successful</p>
          </div>
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <button
            type="button"
            onClick={removeFile}
            className="text-muted-foreground hover:text-muted-foreground cursor-pointer min-w-[20px] min-h-[20px]"
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={[
            'flex flex-col items-center justify-center gap-2 p-6 rounded-input',
            'border-2 border-dashed cursor-pointer transition-colors duration-150',
            isDragging ? 'border-primary bg-yellow-50' : 'border-border hover:border-gray-400 bg-card',
          ].join(' ')}
          role="button"
          tabIndex={0}
          aria-label={`Upload ${label}`}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <CloudUpload className={['w-8 h-8', isDragging ? 'text-primary' : 'text-muted-foreground'].join(' ')} />
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-gray-800">Upload a file</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">PDF up to {maxSizeMB}MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="sr-only"
            aria-hidden="true"
          />
        </div>
      )}

      {error && <p role="alert" className="text-xs text-red-500">⚠ {error}</p>}
    </div>
  );
}
