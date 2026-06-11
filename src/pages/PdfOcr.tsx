import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface OcrResult {
  output_path: string;
  output_size: number;
  page_count: number;
}

type Language = 'eng' | 'ind' | 'eng+ind';

const languages: { key: Language; label: string; desc: string }[] = [
  { key: 'eng',     label: 'Inggris',            desc: 'English (eng)' },
  { key: 'ind',     label: 'Indonesia',           desc: 'Bahasa Indonesia (ind)' },
  { key: 'eng+ind', label: 'Inggris + Indonesia', desc: 'Kedua bahasa' },
];

export default function PdfOcr() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [language, setLanguage] = useState<Language>('ind');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState('');

  const handleFiles = (files: PdfFile[]) => { setFile(files[0]); setResult(null); setError(''); };
  const removeFile = () => { setFile(null); setResult(null); setError(''); };

  const handleOcr = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(10);
    setError('');
    setResult(null);
    try {
      const tempDir = await invoke<string>('get_temp_dir');
      setProgress(20);
      const res = await invoke<OcrResult>('ocr_pdf', {
        inputPath: file.path,
        outputPath: `${tempDir}/ocr_${file.name}`,
        language,
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
      defaultPath: `ocr_${file?.name || 'output.pdf'}`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });
    if (savePath) await invoke('save_file_to', { source: result.output_path, destination: savePath });
  };

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali</button>
        <h2>◎ OCR — Scan ke Teks</h2>
        <p>Ubah PDF hasil scan menjadi PDF yang teksnya bisa dicari dan disalin.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {!file && <Dropzone onFilesSelected={handleFiles} />}
          {file && <div className="file-list"><FileItem file={file} onRemove={removeFile} /></div>}

          {file && !result && !error && (
            <div className="options-panel animate-in">
              <h4>Bahasa Dokumen</h4>
              <div className="quality-options">
                {languages.map((l) => (
                  <button
                    key={l.key}
                    className={`quality-btn ${language === l.key ? 'selected' : ''}`}
                    onClick={() => setLanguage(l.key)}
                  >
                    <span className="quality-label">{l.label}</span>
                    <span className="quality-desc">{l.desc}</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
                Membutuhkan tesseract-ocr terinstal. OCR pada PDF banyak halaman memerlukan waktu lebih lama.
              </p>
            </div>
          )}

          {processing && (
            <ProgressBar
              progress={progress}
              status="Menjalankan OCR... (mungkin memerlukan beberapa menit)"
            />
          )}

          {error && (
            <div className="result-card animate-in" style={{ borderColor: 'rgba(225,112,85,0.3)' }}>
              <h4>✕ Error</h4>
              <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>
              {error.includes('tesseract') && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Pastikan tesseract-ocr sudah terinstal dan language pack tersedia.
                </p>
              )}
            </div>
          )}

          {result && (
            <div className="result-card success animate-in">
              <h4>✓ OCR Berhasil!</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {result.page_count} halaman berhasil diproses. Teks kini bisa dicari di dalam PDF.
              </p>
              <button className="btn-primary" onClick={handleSave}>Simpan PDF Terindeks</button>
            </div>
          )}

          {file && !processing && !result && !error && (
            <button className="btn-primary" onClick={handleOcr}>Mulai OCR</button>
          )}
        </div>
      </div>
    </>
  );
}
