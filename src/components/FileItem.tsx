import type { PdfFile } from './Dropzone';

interface FileItemProps {
  file: PdfFile;
  onRemove: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

export default function FileItem({ file, onRemove }: FileItemProps) {
  return (
    <div className="file-item animate-in">
      <div className="file-icon">📄</div>
      <div className="file-info">
        <div className="file-name">{file.name}</div>
        <div className="file-size">{formatSize(file.size)}</div>
      </div>
      <button className="file-remove" onClick={onRemove} title="Hapus file">
        ✕
      </button>
    </div>
  );
}
