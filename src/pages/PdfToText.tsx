import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface TextResult {
  output_path: string;
  output_size: number;
  char_count: number;
}

export default function PdfToText() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TextResult | null>(null);
  const [error, setError] = useState('');

  const handleFiles = (files: PdfFile[]) => { setFile(files[0]); setResult(null); setError(''); };
  const removeFile = () => { setFile(null); setResult(null); setError(''); };

  const handleExtract = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(30);
    setError('');
    setResult(null);
    try {
      const tempDir = await invoke<string>('get_temp_dir');
      const outputPath = `${tempDir}/${file.name.replace(/\.pdf$/i, '')}.txt`;
      setProgress(60);
      const res = await invoke<TextResult>('pdf_to_text', {
        inputPath: file.path,
        outputPath,
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
    const baseName = file?.name.replace(/\.pdf$/i, '') || 'output';
    const savePath = await save({
      defaultPath: `${baseName}.txt`,
      filters: [{ name: 'Text Files', extensions: ['txt'] }],
    });
    if (savePath) await invoke('save_file_to', { source: result.output_path, destination: savePath });
  };

  const formatSize = (b: number) =>
    b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali</button>
        <h2>T PDF → Teks</h2>
        <p>Ekstrak semua teks dari PDF menjadi file .txt yang bisa diedit.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {!file && <Dropzone onFilesSelected={handleFiles} />}
          {file && <div className="file-list"><FileItem file={file} onRemove={removeFile} /></div>}

          {processing && <ProgressBar progress={progress} status="Mengekstrak teks dengan pdftotext..." />}

          {error && (
            <div className="result-card animate-in" style={{ borderColor: 'rgba(225,112,85,0.3)' }}>
              <h4>✕ Error</h4>
              <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          {result && (
            <div className="result-card success animate-in">
              <h4>✓ Ekstraksi Berhasil!</h4>
              <div className="result-stats">
                <div className="stat-item">
                  <div className="stat-value">{result.char_count.toLocaleString()}</div>
                  <div className="stat-label">Karakter</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{formatSize(result.output_size)}</div>
                  <div className="stat-label">Ukuran File</div>
                </div>
              </div>
              <button className="btn-primary" onClick={handleSave}>Simpan File .txt</button>
            </div>
          )}

          {file && !processing && !result && !error && (
            <button className="btn-primary" onClick={handleExtract}>Ekstrak Teks</button>
          )}
        </div>
      </div>
    </>
  );
}
