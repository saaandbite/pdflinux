import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface ReorderResult {
  output_path: string;
  output_size: number;
  page_count: number;
}

export default function PdfReorder() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [pageOrder, setPageOrder] = useState('');
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ReorderResult | null>(null);
  const [error, setError] = useState('');

  const handleFiles = async (files: PdfFile[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setError('');
    try {
      const meta = await invoke<{ pages: string }>('get_pdf_metadata', { inputPath: f.path });
      const n = parseInt(meta.pages) || null;
      setTotalPages(n);
      if (n) setPageOrder(Array.from({ length: n }, (_, i) => i + 1).join(','));
    } catch {
      setTotalPages(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setPageOrder('');
    setTotalPages(null);
    setError('');
  };

  const handleReorder = async () => {
    if (!file || !pageOrder.trim()) return;
    setProcessing(true);
    setProgress(20);
    setError('');
    setResult(null);
    try {
      const tempDir = await invoke<string>('get_temp_dir');
      setProgress(50);
      const res = await invoke<ReorderResult>('reorder_pages', {
        inputPath: file.path,
        outputPath: `${tempDir}/reordered_${file.name}`,
        pageOrder: pageOrder.trim(),
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
      defaultPath: `reordered_${file?.name || 'output.pdf'}`,
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
        <h2>⇅ Susun Ulang Halaman</h2>
        <p>Ubah urutan halaman PDF sesuai keinginan.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {!file && <Dropzone onFilesSelected={handleFiles} />}
          {file && <div className="file-list"><FileItem file={file} onRemove={removeFile} /></div>}

          {file && !result && !error && (
            <div className="options-panel animate-in">
              <h4>Urutan Halaman Baru</h4>
              {totalPages && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Dokumen ini memiliki <strong>{totalPages}</strong> halaman.
                </p>
              )}
              <div className="input-group">
                <label>Masukkan nomor halaman sesuai urutan yang diinginkan</label>
                <input
                  type="text"
                  placeholder="Contoh: 3,1,2,4 atau 4-1 (terbalik)"
                  value={pageOrder}
                  onChange={(e) => setPageOrder(e.target.value)}
                />
                <p className="page-range-hint">
                  Pisahkan dengan koma. Halaman bisa diulang. Contoh "2,2,1,3" akan menduplikasi halaman 2.
                </p>
              </div>
            </div>
          )}

          {processing && <ProgressBar progress={progress} status="Menyusun ulang halaman..." />}

          {error && (
            <div className="result-card animate-in" style={{ borderColor: 'rgba(225,112,85,0.3)' }}>
              <h4>✕ Error</h4>
              <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          {result && (
            <div className="result-card success animate-in">
              <h4>✓ Berhasil!</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {result.page_count} halaman telah disusun ulang.
              </p>
              <button className="btn-primary" onClick={handleSave}>Simpan File</button>
            </div>
          )}

          {file && !processing && !result && !error && (
            <button className="btn-primary" onClick={handleReorder} disabled={!pageOrder.trim()}>
              Susun Ulang
            </button>
          )}
        </div>
      </div>
    </>
  );
}
