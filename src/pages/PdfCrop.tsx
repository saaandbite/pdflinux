import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface CropResult { output_path: string; output_size: number; }

export default function PdfCrop() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [top, setTop] = useState('10');
  const [bottom, setBottom] = useState('10');
  const [left, setLeft] = useState('10');
  const [right, setRight] = useState('10');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CropResult | null>(null);
  const [error, setError] = useState('');

  const handleFiles = (files: PdfFile[]) => { setFile(files[0]); setResult(null); setError(''); };
  const removeFile = () => { setFile(null); setResult(null); setError(''); };

  const handleCrop = async () => {
    if (!file) return;
    setProcessing(true); setProgress(20); setError(''); setResult(null);
    try {
      const tempDir = await invoke<string>('get_temp_dir');
      setProgress(50);
      const res = await invoke<CropResult>('crop_pdf', {
        inputPath: file.path,
        outputPath: `${tempDir}/cropped_${file.name}`,
        top: parseFloat(top) || 0,
        bottom: parseFloat(bottom) || 0,
        left: parseFloat(left) || 0,
        right: parseFloat(right) || 0,
      });
      setProgress(100); setResult(res);
    } catch (err: any) { setError(typeof err === 'string' ? err : err.message || 'Error'); }
    finally { setProcessing(false); }
  };

  const handleSave = async () => {
    if (!result) return;
    const savePath = await save({ defaultPath: `cropped_${file?.name}`, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (savePath) await invoke('save_file_to', { source: result.output_path, destination: savePath });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: 'var(--bg-primary)', border: '1.5px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit',
    outline: 'none', textAlign: 'center',
  };

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali</button>
        <h2>⬡ Crop PDF</h2>
        <p>Potong margin halaman PDF dari setiap sisi.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {!file && <Dropzone onFilesSelected={handleFiles} />}
          {file && <div className="file-list"><FileItem file={file} onRemove={removeFile} /></div>}

          {file && !result && !error && (
            <div className="options-panel animate-in">
              <h4>⬡ Margin Crop (mm)</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Masukkan jumlah milimeter yang ingin dipotong dari setiap sisi.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Atas</label>
                  <input type="number" min="0" value={top} onChange={(e) => setTop(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Bawah</label>
                  <input type="number" min="0" value={bottom} onChange={(e) => setBottom(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Kiri</label>
                  <input type="number" min="0" value={left} onChange={(e) => setLeft(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Kanan</label>
                  <input type="number" min="0" value={right} onChange={(e) => setRight(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {processing && <ProgressBar progress={progress} status="Memotong halaman..." />}
          {error && <div className="result-card animate-in" style={{ borderColor: 'rgba(239,68,68,0.3)' }}><h4>✕ Error</h4><p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p></div>}
          {result && (
            <div className="result-card success animate-in">
              <h4>✓ Crop Berhasil!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '14px' }}>
                Margin berhasil dipotong ({top}mm atas, {bottom}mm bawah, {left}mm kiri, {right}mm kanan).
              </p>
              <button className="btn-primary" onClick={handleSave}>Simpan File</button>
            </div>
          )}
          {file && !processing && !result && !error && <button className="btn-primary" onClick={handleCrop}>Mulai Crop</button>}
        </div>
      </div>
    </>
  );
}
