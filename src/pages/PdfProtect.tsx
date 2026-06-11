import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface ProtectResult {
  output_path: string;
  output_size: number;
}

export default function PdfProtect() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ProtectResult | null>(null);
  const [error, setError] = useState('');

  const handleFiles = (files: PdfFile[]) => {
    setFile(files[0]);
    setResult(null);
    setError('');
  };

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleProtect = async () => {
    if (!file) return;
    if (!password || password !== confirmPassword) {
      setError('Password tidak cocok atau kosong.');
      return;
    }

    setProcessing(true);
    setProgress(20);
    setError('');
    setResult(null);

    try {
      const tempDir = await invoke<string>('get_temp_dir');
      const outputPath = `${tempDir}/protected_${file.name}`;

      setProgress(50);

      const res = await invoke<ProtectResult>('protect_pdf', {
        inputPath: file.path,
        outputPath: outputPath,
        password: password,
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
        defaultPath: `protected_${file?.name || 'output.pdf'}`,
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

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali ke Dashboard</button>
        <h2>🔒 Proteksi PDF</h2>
        <p>Tambahkan password untuk mengamankan dokumen PDF Anda dari akses tidak sah.</p>
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
              <h4>🔑 Atur Password</h4>
              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Konfirmasi Password</label>
                <input
                  type="password"
                  placeholder="Ulangi password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>
                  ⚠️ Password tidak cocok.
                </p>
              )}
            </div>
          )}

          {processing && <ProgressBar progress={progress} status="Mengenkripsi file dengan qpdf..." />}

          {error && (
            <div className="result-card animate-in" style={{ borderColor: 'rgba(225,112,85,0.3)' }}>
              <h4>❌ Error</h4>
              <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          {result && (
            <div className="result-card success animate-in">
              <h4>✅ Proteksi Berhasil!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                File PDF Anda kini dilindungi password ({formatSize(result.output_size)}).
              </p>
              <button className="btn-primary" onClick={handleSave}>💾 Simpan File Terproteksi</button>
            </div>
          )}

          {file && !processing && !result && !error && (
            <button
              className="btn-primary"
              onClick={handleProtect}
              disabled={!passwordsMatch}
            >
              🚀 Proteksi Sekarang
            </button>
          )}
        </div>
      </div>
    </>
  );
}
