'use client';

import { useRef, useState } from 'react';
import { Paperclip, Camera, X, Loader2, ExternalLink, FileText, FileWarning } from 'lucide-react';
import { fileProxyUrl } from '@/lib/utils';

interface InvoiceUploadProps {
  value: string;
  onChange: (url: string) => void;
}

const MAX_SIZE_BYTES = 30 * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function isImage(url: string): boolean {
  const clean = url.split('?')[0].toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|bmp|tiff?)$/.test(clean);
}

function getFileIcon(url: string) {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.pdf')) return '📄';
  if (clean.endsWith('.doc') || clean.endsWith('.docx')) return '📝';
  return '📎';
}

export default function InvoiceUpload({ value, onChange }: InvoiceUploadProps) {
  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');

  const validate = (file: File): string | null => {
    if (file.size > MAX_SIZE_BYTES) return `File too large — maximum size is 30 MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB)`;
    const type = file.type.toLowerCase();
    if (type.startsWith('video/') || type.startsWith('audio/')) return 'Video and audio files are not allowed';
    if (!ALLOWED_TYPES.includes(type) && !type.startsWith('image/')) return 'Only images, PDFs, and Word documents are allowed';
    return null;
  };

  const upload = async (file: File) => {
    setError('');
    const validationError = validate(file);
    if (validationError) { setError(validationError); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upload failed'); return; }
      onChange(data.url);
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  };

  const filename = value ? decodeURIComponent(value.split('/').pop()?.split('?')[0] || '') : '';
  const isImg = value ? isImage(value) : false;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Invoice <span className="text-gray-400 font-normal">(optional · max 30 MB · images, PDF, Word)</span>
      </label>

      {value ? (
        <div className="border border-green-200 rounded-lg bg-green-50 overflow-hidden">
          {isImg && (
            <a href={fileProxyUrl(value)} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={fileProxyUrl(value)}
                alt="Invoice preview"
                className="w-full max-h-48 object-contain bg-white border-b border-green-100"
              />
            </a>
          )}
          <div className="flex items-center gap-2 px-3 py-2">
            {isImg
              ? <Paperclip className="w-4 h-4 text-green-600 shrink-0" />
              : <span className="text-base shrink-0">{getFileIcon(value)}</span>
            }
            <a href={fileProxyUrl(value)} target="_blank" rel="noopener noreferrer"
              className="text-sm text-green-700 font-medium truncate hover:underline flex-1">
              {filename || 'View Attachment'}
            </a>
            <a href={fileProxyUrl(value)} target="_blank" rel="noopener noreferrer"
              title="Open in new tab"
              className="text-green-500 hover:text-green-700 shrink-0">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button type="button" onClick={() => onChange('')}
              title="Remove attachment"
              className="text-gray-400 hover:text-red-500 transition shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:text-primary-600 hover:border-primary-400 hover:bg-primary-50 transition disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            {uploading ? 'Uploading…' : 'Choose File'}
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:text-primary-600 hover:border-primary-400 hover:bg-primary-50 transition disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            Camera
          </button>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <FileWarning className="w-3.5 h-3.5 shrink-0" />{error}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFile}
      />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
    </div>
  );
}
