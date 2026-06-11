import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface WatermarkResult { output_path: string; output_size: number; }

export default function PdfWatermark() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<WatermarkResult | null>(null);
  const [error, setError] = useState('');

  const handleFiles = (files: PdfFile[]) => { setFile(files[0]); setResult(null); setError(''); };
  const removeFile = () => { setFile(null); setResult(null); setText(''); setError(''); };

  const handleWatermark = async () => {
    if (!file || !text.trim()) return;
    setProcessing(true); setProgress(20); setError(''); setResult(null);
    try {
      const tempDir = await invoke<string>('get_temp_dir');
      setProgress(40);
      const res = await invoke<WatermarkResult>('watermark_pdf', {
        inputPath: file.path, outputPath: `${tempDir}/watermarked_${file.name}`, text: text.trim(),
      });
      setProgress(100); setResult(res);
    } catch (err: any) { setError(typeof err === 'string' ? err : err.message || 'Error'); }
    finally { setProcessing(false); }
  };

  const handleSave = async () => {
    if (!result) return;
    const savePath = await save({ defaultPath: `watermarked_${file?.name}`, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (savePath) await invoke('save_file_to', { source: result.output_path, destination: savePath });
  };

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali</button>
        <h2>◈ Watermark PDF</h2>
        <p>Tambahkan teks watermark diagonal ke seluruh halaman PDF.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {!file && <Dropzone onFilesSelected={handleFiles} />}
          {file && <div className="file-list"><FileItem file={file} onRemove={removeFile} /></div>}
          {file && !result && !error && (
            <div className="options-panel animate-in">
              <h4>◈ Teks Watermark</h4>
              <div className="input-group">
                <label>Masukkan teks yang ingin dijadikan watermark</label>
                <input type="text" placeholder="Contoh: RAHASIA, DRAFT, CONFIDENTIAL" value={text} onChange={(e) => setText(e.target.value)} />
              </div>
            </div>
          )}
          {processing && <ProgressBar progress={progress} status="Menambahkan watermark..." />}
          {error && <div className="result-card animate-in" style={{ borderColor: 'rgba(239,68,68,0.3)' }}><h4>✕ Error</h4><p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p></div>}
          {result && (
            <div className="result-card success animate-in">
              <h4>✓ Watermark Ditambahkan!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '14px' }}>Teks "{text}" berhasil ditambahkan ke seluruh halaman.</p>
              <button className="btn-primary" onClick={handleSave}>Simpan File</button>
            </div>
          )}
          {file && !processing && !result && !error && <button className="btn-primary" onClick={handleWatermark} disabled={!text.trim()}>Tambahkan Watermark</button>}
        </div>
      </div>
    </>
  );
}
