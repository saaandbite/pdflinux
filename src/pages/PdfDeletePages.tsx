import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface DeleteResult {
  output_path: string;
  output_size: number;
  pages_deleted: number;
  pages_remaining: number;
}

export default function PdfDeletePages() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [pagesToDelete, setPagesToDelete] = useState('');
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DeleteResult | null>(null);
  const [error, setError] = useState('');

  const handleFiles = async (files: PdfFile[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setError('');
    try {
      const meta = await invoke<{ pages: string }>('get_pdf_metadata', { inputPath: f.path });
      setTotalPages(parseInt(meta.pages) || null);
    } catch {
      setTotalPages(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setPagesToDelete('');
    setTotalPages(null);
    setError('');
  };

  const handleDelete = async () => {
    if (!file || !pagesToDelete.trim()) return;
    setProcessing(true);
    setProgress(20);
    setError('');
    setResult(null);
    try {
      const tempDir = await invoke<string>('get_temp_dir');
      setProgress(50);
      const res = await invoke<DeleteResult>('delete_pages', {
        inputPath: file.path,
        outputPath: `${tempDir}/deleted_${file.name}`,
        pagesToDelete: pagesToDelete.trim(),
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
    const savePath = await save({
      defaultPath: `deleted_${file?.name || 'output.pdf'}`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });
    if (savePath) {
      await invoke('save_file_to', { source: result.output_path, destination: savePath });
    }
  };

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali</button>
        <h2>✕ Hapus Halaman</h2>
        <p>Hapus halaman tertentu dari file PDF Anda.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {!file && <Dropzone onFilesSelected={handleFiles} />}
          {file && <div className="file-list"><FileItem file={file} onRemove={removeFile} /></div>}

          {file && !result && !error && (
            <div className="options-panel animate-in">
              <h4>Halaman yang Akan Dihapus</h4>
              {totalPages && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Dokumen ini memiliki <strong>{totalPages}</strong> halaman.
                </p>
              )}
              <div className="input-group">
                <label>Masukkan nomor halaman yang ingin dihapus</label>
                <input
                  type="text"
                  placeholder="Contoh: 2,5,7-10"
                  value={pagesToDelete}
                  onChange={(e) => setPagesToDelete(e.target.value)}
                />
                <p className="page-range-hint">
                  Gunakan koma untuk beberapa halaman dan tanda hubung untuk rentang.
                </p>
              </div>
            </div>
          )}

          {processing && <ProgressBar progress={progress} status="Menghapus halaman..." />}

          {error && (
            <div className="result-card animate-in" style={{ borderColor: 'rgba(225,112,85,0.3)' }}>
              <h4>✕ Error</h4>
              <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          {result && (
            <div className="result-card success animate-in">
              <h4>✓ Berhasil!</h4>
              <div className="result-stats">
                <div className="stat-item">
                  <div className="stat-value">{result.pages_deleted}</div>
                  <div className="stat-label">Halaman Dihapus</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{result.pages_remaining}</div>
                  <div className="stat-label">Halaman Tersisa</div>
                </div>
              </div>
              <button className="btn-primary" onClick={handleSave}>Simpan File</button>
            </div>
          )}

          {file && !processing && !result && !error && (
            <button className="btn-primary" onClick={handleDelete} disabled={!pagesToDelete.trim()}>
              Hapus Halaman
            </button>
          )}
        </div>
      </div>
    </>
  );
}
