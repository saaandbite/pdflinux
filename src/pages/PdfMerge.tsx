import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface MergeResult {
  file_count: number;
  output_path: string;
  output_size: number;
}

export default function PdfMerge() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<MergeResult | null>(null);
  const [error, setError] = useState('');

  const handleFiles = (newFiles: PdfFile[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setResult(null);
    setError('');
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) return;

    setProcessing(true);
    setProgress(20);
    setError('');
    setResult(null);

    try {
      const tempDir = await invoke<string>('get_temp_dir');
      const outputPath = `${tempDir}/merged_output.pdf`;

      setProgress(50);

      const res = await invoke<MergeResult>('merge_pdf', {
        inputPaths: files.map((f) => f.path),
        outputPath: outputPath,
      });

      setProgress(100);
      setResult(res);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Terjadi kesalahan.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      const savePath = await save({
        defaultPath: 'merged_output.pdf',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });
      if (savePath) {
        await invoke('save_file_to', { source: result.output_path, destination: savePath });
      }
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Gagal menyimpan file.');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  };

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali ke Dashboard</button>
        <h2>🔗 Gabung PDF</h2>
        <p>Gabungkan beberapa file PDF menjadi satu dokumen.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          <Dropzone onFilesSelected={handleFiles} multiple />

          {files.length > 0 && (
            <div className="file-list">
              {files.map((file, i) => (
                <FileItem key={`${file.name}-${i}`} file={file} onRemove={() => removeFile(i)} />
              ))}
            </div>
          )}

          {processing && <ProgressBar progress={progress} status="Menggabungkan file dengan qpdf..." />}

          {error && (
            <div className="result-card animate-in" style={{ borderColor: 'rgba(225,112,85,0.3)' }}>
              <h4>❌ Error</h4>
              <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          {result && (
            <div className="result-card success animate-in">
              <h4>✅ Penggabungan Berhasil!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                {result.file_count} file berhasil digabungkan ({formatSize(result.output_size)}).
              </p>
              <button className="btn-primary" onClick={handleSave}>💾 Simpan File</button>
            </div>
          )}

          {files.length >= 2 && !processing && !result && !error && (
            <button className="btn-primary" onClick={handleMerge}>
              🚀 Mulai Gabung ({files.length} file)
            </button>
          )}

          {files.length === 1 && !processing && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '16px', fontSize: '13px' }}>
              Tambahkan minimal 2 file untuk menggabungkan.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
