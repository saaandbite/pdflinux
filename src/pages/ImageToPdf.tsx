import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import ProgressBar from '../components/ProgressBar';

interface ImageToPdfResult { output_path: string; output_size: number; image_count: number; }

interface ImageFile { name: string; path: string; }

export default function ImageToPdf() {
  const navigate = useNavigate();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImageToPdfResult | null>(null);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'webp', 'tiff'] }],
      });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      const newImages = paths.map((p) => ({ name: p.split('/').pop() || 'image', path: p }));
      setImages((prev) => [...prev, ...newImages]);
      setResult(null); setError('');
    } catch (err) { console.error(err); }
  };

  const removeImage = (index: number) => { setImages((prev) => prev.filter((_, i) => i !== index)); setResult(null); };

  const handleConvert = async () => {
    if (images.length === 0) return;
    setProcessing(true); setProgress(20); setError(''); setResult(null);
    try {
      const tempDir = await invoke<string>('get_temp_dir');
      setProgress(40);
      const res = await invoke<ImageToPdfResult>('image_to_pdf', {
        inputPaths: images.map((i) => i.path), outputPath: `${tempDir}/images_to_pdf.pdf`,
      });
      setProgress(100); setResult(res);
    } catch (err: any) { setError(typeof err === 'string' ? err : err.message || 'Error'); }
    finally { setProcessing(false); }
  };

  const handleSave = async () => {
    if (!result) return;
    const savePath = await save({ defaultPath: 'output.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (savePath) await invoke('save_file_to', { source: result.output_path, destination: savePath });
  };

  const formatSize = (b: number) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali</button>
        <h2>⊞ Gambar ke PDF</h2>
        <p>Konversi satu atau beberapa gambar menjadi satu file PDF.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          <div className="dropzone" onClick={handleAdd}>
            <span className="drop-icon" style={{ opacity: 0.6 }}>🖼</span>
            <h3>Klik untuk memilih gambar</h3>
            <p>PNG, JPG, BMP, WebP, TIFF</p>
          </div>

          {images.length > 0 && (
            <div className="file-list">
              {images.map((img, i) => (
                <div className="file-item animate-in" key={`${img.name}-${i}`}>
                  <div className="file-icon">🖼</div>
                  <div className="file-info">
                    <div className="file-name">{img.name}</div>
                  </div>
                  <button className="file-remove" onClick={() => removeImage(i)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {processing && <ProgressBar progress={progress} status="Mengonversi gambar..." />}
          {error && <div className="result-card animate-in" style={{ borderColor: 'rgba(239,68,68,0.3)' }}><h4>✕ Error</h4><p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p></div>}
          {result && (
            <div className="result-card success animate-in">
              <h4>✓ Konversi Berhasil!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '14px' }}>{result.image_count} gambar → 1 PDF ({formatSize(result.output_size)})</p>
              <button className="btn-primary" onClick={handleSave}>Simpan File PDF</button>
            </div>
          )}
          {images.length > 0 && !processing && !result && !error && <button className="btn-primary" onClick={handleConvert}>Konversi ke PDF ({images.length} gambar)</button>}
        </div>
      </div>
    </>
  );
}
