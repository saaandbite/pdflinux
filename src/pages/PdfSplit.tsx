import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface SplitResult {
  output_path: string;
  page_count: number;
}

export default function PdfSplit() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [pageRange, setPageRange] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SplitResult | null>(null);
  const [error, setError] = useState('');

  const handleFiles = (files: PdfFile[]) => {
    setFile(files[0]);
    setResult(null);
    setError('');
  };

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setPageRange('');
    setError('');
  };

  const handleSplit = async () => {
    if (!file || !pageRange.trim()) return;

    setProcessing(true);
    setProgress(20);
    setError('');
    setResult(null);

    try {
      const tempDir = await invoke<string>('get_temp_dir');
      const outputPath = `${tempDir}/split_${file.name}`;

      setProgress(50);

      const res = await invoke<SplitResult>('split_pdf', {
        inputPath: file.path,
        outputPath: outputPath,
        pageRange: pageRange.trim(),
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
        defaultPath: `split_${file?.name || 'output.pdf'}`,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });
      if (savePath) {
        await invoke('save_file_to', { source: result.output_path, destination: savePath });
      }
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Gagal menyimpan file.');
    }
  };

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali ke Dashboard</button>
        <h2>✂️ Pisah PDF</h2>
        <p>Pisahkan halaman tertentu dari file PDF menjadi dokumen baru.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {!file && <Dropzone onFilesSelected={handleFiles} />}

          {file && (
            <div className="file-list">
              <FileItem file={file} onRemove={removeFile} />
            </div>
          )}

          {file && !result && !error && (
            <div className="options-panel animate-in">
              <h4>📄 Rentang Halaman</h4>
              <div className="input-group">
                <label>Masukkan nomor halaman yang ingin dipisahkan</label>
                <input
                  type="text"
                  placeholder="Contoh: 1-5,8,11-15"
                  value={pageRange}
                  onChange={(e) => setPageRange(e.target.value)}
                />
                <p className="page-range-hint">
                  Gunakan tanda koma untuk memisahkan seleksi, dan tanda hubung untuk rentang.
                </p>
              </div>
            </div>
          )}

          {processing && <ProgressBar progress={progress} status="Memisahkan halaman dengan qpdf..." />}

          {error && (
            <div className="result-card animate-in" style={{ borderColor: 'rgba(225,112,85,0.3)' }}>
              <h4>❌ Error</h4>
              <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          {result && (
            <div className="result-card success animate-in">
              <h4>✅ Pemisahan Berhasil!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                {result.page_count} halaman berhasil dipisahkan dari dokumen asli.
              </p>
              <button className="btn-primary" onClick={handleSave}>💾 Simpan File</button>
            </div>
          )}

          {file && !processing && !result && !error && (
            <button
              className="btn-primary"
              onClick={handleSplit}
              disabled={!pageRange.trim()}
            >
              🚀 Mulai Pisah
            </button>
          )}
        </div>
      </div>
    </>
  );
}
