import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface UnlockResult { output_path: string; output_size: number; }

export default function PdfUnlock() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [password, setPassword] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UnlockResult | null>(null);
  const [error, setError] = useState('');

  const handleFiles = (files: PdfFile[]) => { setFile(files[0]); setResult(null); setError(''); };
  const removeFile = () => { setFile(null); setResult(null); setPassword(''); setError(''); };

  const handleUnlock = async () => {
    if (!file || !password) return;
    setProcessing(true); setProgress(20); setError(''); setResult(null);
    try {
      const tempDir = await invoke<string>('get_temp_dir');
      setProgress(50);
      const res = await invoke<UnlockResult>('unlock_pdf', {
        inputPath: file.path, outputPath: `${tempDir}/unlocked_${file.name}`, password,
      });
      setProgress(100); setResult(res);
    } catch (err: any) { setError(typeof err === 'string' ? err : err.message || 'Error'); }
    finally { setProcessing(false); }
  };

  const handleSave = async () => {
    if (!result) return;
    const savePath = await save({ defaultPath: `unlocked_${file?.name}`, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (savePath) await invoke('save_file_to', { source: result.output_path, destination: savePath });
  };

  const formatSize = (b: number) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali</button>
        <h2>⊙ Buka Kunci PDF</h2>
        <p>Hapus password dari file PDF yang terkunci.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {!file && <Dropzone onFilesSelected={handleFiles} />}
          {file && <div className="file-list"><FileItem file={file} onRemove={removeFile} /></div>}
          {file && !result && !error && (
            <div className="options-panel animate-in">
              <h4>⊙ Masukkan Password</h4>
              <div className="input-group">
                <label>Password file PDF</label>
                <input type="password" placeholder="Masukkan password..." value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
          )}
          {processing && <ProgressBar progress={progress} status="Mendekripsi file..." />}
          {error && <div className="result-card animate-in" style={{ borderColor: 'rgba(239,68,68,0.3)' }}><h4>✕ Error</h4><p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p></div>}
          {result && (
            <div className="result-card success animate-in">
              <h4>✓ Berhasil Dibuka!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '14px' }}>Password berhasil dihapus ({formatSize(result.output_size)}).</p>
              <button className="btn-primary" onClick={handleSave}>Simpan File</button>
            </div>
          )}
          {file && !processing && !result && !error && <button className="btn-primary" onClick={handleUnlock} disabled={!password}>Buka Kunci</button>}
        </div>
      </div>
    </>
  );
}
