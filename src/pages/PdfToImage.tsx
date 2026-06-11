import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface ToImageResult {
  output_dir: string;
  image_count: number;
  format: string;
}

export default function PdfToImage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ToImageResult | null>(null);
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

  const handleConvert = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(15);
    setError('');
    setResult(null);

    try {
      const tempDir = await invoke<string>('get_temp_dir');
      const baseName = file.name.replace(/\.pdf$/i, '');
      const outputDir = `${tempDir}/images_${baseName}`;

      setProgress(30);

      const res = await invoke<ToImageResult>('pdf_to_image', {
        inputPath: file.path,
        outputDir: outputDir,
        format: format,
      });

      setProgress(100);
      setResult(res);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Terjadi kesalahan.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali ke Dashboard</button>
        <h2>🖼️ PDF ke Gambar</h2>
        <p>Konversikan setiap halaman PDF menjadi file gambar berkualitas tinggi (300 DPI).</p>
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
              <h4>🎨 Format Output</h4>
              <div className="quality-options">
                <button
                  className={`quality-btn ${format === 'png' ? 'selected' : ''}`}
                  onClick={() => setFormat('png')}
                >
                  <span className="quality-label">PNG</span>
                  <span className="quality-desc">Kualitas tinggi, cocok untuk dokumen</span>
                </button>
                <button
                  className={`quality-btn ${format === 'jpg' ? 'selected' : ''}`}
                  onClick={() => setFormat('jpg')}
                >
                  <span className="quality-label">JPG</span>
                  <span className="quality-desc">Ukuran kecil, cocok untuk berbagi</span>
                </button>
              </div>
            </div>
          )}

          {processing && <ProgressBar progress={progress} status="Mengonversi halaman dengan pdftoppm..." />}

          {error && (
            <div className="result-card animate-in" style={{ borderColor: 'rgba(225,112,85,0.3)' }}>
              <h4>❌ Error</h4>
              <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          {result && (
            <div className="result-card success animate-in">
              <h4>✅ Konversi Berhasil!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                {result.image_count} halaman berhasil dikonversi ke format <strong>.{result.format.toUpperCase()}</strong> (300 DPI).
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px', wordBreak: 'break-all' }}>
                📁 Lokasi: {result.output_dir}
              </p>
            </div>
          )}

          {file && !processing && !result && !error && (
            <button className="btn-primary" onClick={handleConvert}>
              🚀 Mulai Konversi
            </button>
          )}
        </div>
      </div>
    </>
  );
}
