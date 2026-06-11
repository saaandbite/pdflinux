import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface GrayscaleResult {
  output_path: string;
  output_size: number;
}

export default function PdfGrayscale() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GrayscaleResult | null>(null);
  const [error, setError] = useState('');

  const handleFiles = (files: PdfFile[]) => { setFile(files[0]); setResult(null); setError(''); };
  const removeFile = () => { setFile(null); setResult(null); setError(''); };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(20);
    setError('');
    setResult(null);
    try {
      const tempDir = await invoke<string>('get_temp_dir');
      setProgress(50);
      const res = await invoke<GrayscaleResult>('grayscale_pdf', {
        inputPath: file.path,
        outputPath: `${tempDir}/grayscale_${file.name}`,
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
      defaultPath: `grayscale_${file?.name || 'output.pdf'}`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });
    if (savePath) await invoke('save_file_to', { source: result.output_path, destination: savePath });
  };

  const formatSize = (b: number) =>
    b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali</button>
        <h2>◑ Grayscale PDF</h2>
        <p>Ubah PDF berwarna menjadi hitam-putih untuk menghemat tinta saat mencetak.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {!file && <Dropzone onFilesSelected={handleFiles} />}
          {file && <div className="file-list"><FileItem file={file} onRemove={removeFile} /></div>}

          {processing && <ProgressBar progress={progress} status="Mengonversi ke grayscale..." />}

          {error && (
            <div className="result-card animate-in" style={{ borderColor: 'rgba(225,112,85,0.3)' }}>
              <h4>✕ Error</h4>
              <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          {result && (
            <div className="result-card success animate-in">
              <h4>✓ Konversi Berhasil!</h4>
              <div className="result-stats">
                <div className="stat-item">
                  <div className="stat-value">{formatSize(result.output_size)}</div>
                  <div className="stat-label">Ukuran Output</div>
                </div>
              </div>
              <button className="btn-primary" onClick={handleSave}>Simpan File</button>
            </div>
          )}

          {file && !processing && !result && !error && (
            <button className="btn-primary" onClick={handleProcess}>Konversi ke Grayscale</button>
          )}
        </div>
      </div>
    </>
  );
}
