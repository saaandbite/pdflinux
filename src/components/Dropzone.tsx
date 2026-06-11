import { useState, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export interface PdfFile {
  name: string;
  size: number;
  path: string;
}

interface DropzoneProps {
  onFilesSelected: (files: PdfFile[]) => void;
  multiple?: boolean;
}

export default function Dropzone({ onFilesSelected, multiple = false }: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // In Tauri, dropped files have a path property
    const droppedFiles = Array.from(e.dataTransfer.files);
    const pdfFiles: PdfFile[] = [];

    for (const f of droppedFiles) {
      if (!f.name.toLowerCase().endsWith('.pdf')) continue;
      const path = (f as any).path as string | undefined;
      if (path) {
        const size = await invoke<number>('get_pdf_info', { inputPath: path }).catch(() => f.size);
        pdfFiles.push({ name: f.name, size, path });
      }
    }

    if (pdfFiles.length > 0) {
      onFilesSelected(pdfFiles);
    }
  }, [onFilesSelected]);

  const handleClick = async () => {
    try {
      const selected = await open({
        multiple: multiple,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });

      if (!selected) return;

      const paths = Array.isArray(selected) ? selected : [selected];
      const pdfFiles: PdfFile[] = [];

      for (const p of paths) {
        const name = p.split('/').pop() || 'document.pdf';
        const size = await invoke<number>('get_pdf_info', { inputPath: p }).catch(() => 0);
        pdfFiles.push({ name, size, path: p });
      }

      if (pdfFiles.length > 0) {
        onFilesSelected(pdfFiles);
      }
    } catch (err) {
      console.error('Gagal membuka file dialog:', err);
    }
  };

  return (
    <div
      className={`dropzone ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <span className="drop-icon">📁</span>
      <h3>Seret & Lepas File PDF di Sini</h3>
      <p>atau klik untuk memilih file dari komputer Anda</p>
    </div>
  );
}
