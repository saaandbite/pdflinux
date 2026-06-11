import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

type Quality = 'high' | 'medium' | 'low';

interface QualityOption {
  key: Quality;
  label: string;
  desc: string;
}

const qualityOptions: QualityOption[] = [
  { key: 'high', label: 'Tinggi', desc: 'Kualitas terbaik, pengurangan ukuran minimal' },
  { key: 'medium', label: 'Sedang', desc: 'Keseimbangan kualitas & ukuran' },
  { key: 'low', label: 'Rendah', desc: 'Ukuran terkecil, kualitas berkurang' },
];

interface CompressResult {
  original_size: number;
  compressed_size: number;
  output_path: string;
}

export default function PdfCompress() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [quality, setQuality] = useState<Quality>('medium');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CompressResult | null>(null);
  const [error, setError] = useState('');

  const handleFiles = (files: PdfFile[]) => {
    setFile(files[0]);
    setResult(null);
    setError('');
  };

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setError('');
  };

  const handleCompress = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(10);
    setError('');
    setResult(null);

    try {
      const tempDir = await invoke<string>('get_temp_dir');
      const outputPath = `${tempDir}/compressed_${file.name}`;

      setProgress(30);

      const res = await invoke<CompressResult>('compress_pdf', {
        inputPath: file.path,
        outputPath: outputPath,
        quality: quality,
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
        defaultPath: `compressed_${file?.name || 'output.pdf'}`,
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
        <h2>📦 Kompres PDF</h2>
        <p>Kurangi ukuran file PDF Anda dengan memilih level kualitas kompresi.</p>
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
              <h4>⚙️ Kualitas Kompresi</h4>
              <div className="quality-options">
                {qualityOptions.map((opt) => (
                  <button
                    key={opt.key}
                    className={`quality-btn ${quality === opt.key ? 'selected' : ''}`}
                    onClick={() => setQuality(opt.key)}
                  >
                    <span className="quality-label">{opt.label}</span>
                    <span className="quality-desc">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {processing && <ProgressBar progress={progress} status="Mengompres dengan Ghostscript..." />}

          {error && (
            <div className="result-card animate-in" style={{ borderColor: 'rgba(225,112,85,0.3)' }}>
              <h4>❌ Error</h4>
              <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          {result && (
            <div className="result-card success animate-in">
              <h4>✅ Kompresi Berhasil!</h4>
              <div className="result-stats">
                <div className="stat-item">
                  <div className="stat-value">{formatSize(result.original_size)}</div>
                  <div className="stat-label">Ukuran Asli</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{formatSize(result.compressed_size)}</div>
                  <div className="stat-label">Ukuran Baru</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    {Math.round((1 - result.compressed_size / result.original_size) * 100)}%
                  </div>
                  <div className="stat-label">Pengurangan</div>
                </div>
              </div>
              <button className="btn-primary" onClick={handleSave}>💾 Simpan File</button>
            </div>
          )}

          {file && !processing && !result && !error && (
            <button className="btn-primary" onClick={handleCompress}>
              🚀 Mulai Kompres
            </button>
          )}
        </div>
      </div>
    </>
  );
}
