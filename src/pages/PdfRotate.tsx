import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface RotateResult {
  output_path: string;
  output_size: number;
}

const angles = [
  { value: '90', label: '90°', desc: 'Putar ke kanan' },
  { value: '180', label: '180°', desc: 'Balik terbalik' },
  { value: '270', label: '270°', desc: 'Putar ke kiri' },
];

export default function PdfRotate() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [angle, setAngle] = useState('90');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<RotateResult | null>(null);
  const [error, setError] = useState('');

  const handleFiles = (files: PdfFile[]) => { setFile(files[0]); setResult(null); setError(''); };
  const removeFile = () => { setFile(null); setResult(null); setError(''); };

  const handleRotate = async () => {
    if (!file) return;
    setProcessing(true); setProgress(20); setError(''); setResult(null);
    try {
      const tempDir = await invoke<string>('get_temp_dir');
      setProgress(50);
      const res = await invoke<RotateResult>('rotate_pdf', {
        inputPath: file.path, outputPath: `${tempDir}/rotated_${file.name}`, angle, pages: 'all',
      });
      setProgress(100); setResult(res);
    } catch (err: any) { setError(typeof err === 'string' ? err : err.message || 'Error'); }
    finally { setProcessing(false); }
  };

  const handleSave = async () => {
    if (!result) return;
    const savePath = await save({ defaultPath: `rotated_${file?.name}`, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (savePath) await invoke('save_file_to', { source: result.output_path, destination: savePath });
  };

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali</button>
        <h2>↻ Rotasi PDF</h2>
        <p>Putar semua halaman PDF ke sudut yang diinginkan.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {!file && <Dropzone onFilesSelected={handleFiles} />}
          {file && <div className="file-list"><FileItem file={file} onRemove={removeFile} /></div>}
          {file && !result && !error && (
            <div className="options-panel animate-in">
              <h4>⚙ Sudut Rotasi</h4>
              <div className="quality-options">
                {angles.map((a) => (
                  <button key={a.value} className={`quality-btn ${angle === a.value ? 'selected' : ''}`} onClick={() => setAngle(a.value)}>
                    <span className="quality-label">{a.label}</span>
                    <span className="quality-desc">{a.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {processing && <ProgressBar progress={progress} status="Memutar halaman..." />}
          {error && <div className="result-card animate-in" style={{ borderColor: 'rgba(239,68,68,0.3)' }}><h4>✕ Error</h4><p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p></div>}
          {result && (
            <div className="result-card success animate-in">
              <h4>✓ Rotasi Berhasil!</h4>
              <button className="btn-primary" onClick={handleSave}>Simpan File</button>
            </div>
          )}
          {file && !processing && !result && !error && <button className="btn-primary" onClick={handleRotate}>Mulai Rotasi</button>}
        </div>
      </div>
    </>
  );
}
