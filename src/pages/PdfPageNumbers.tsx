import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface PageNumberResult {
  output_path: string;
  output_size: number;
}

type Position = 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right';

const positions: { key: Position; label: string }[] = [
  { key: 'bottom-center', label: 'Bawah Tengah' },
  { key: 'bottom-left',   label: 'Bawah Kiri' },
  { key: 'bottom-right',  label: 'Bawah Kanan' },
  { key: 'top-left',      label: 'Atas Kiri' },
  { key: 'top-center',    label: 'Atas Tengah' },
  { key: 'top-right',     label: 'Atas Kanan' },
];

export default function PdfPageNumbers() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [position, setPosition] = useState<Position>('bottom-center');
  const [fontSize, setFontSize] = useState(12);
  const [startNumber, setStartNumber] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PageNumberResult | null>(null);
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
      setProgress(40);
      const res = await invoke<PageNumberResult>('add_page_numbers', {
        inputPath: file.path,
        outputPath: `${tempDir}/numbered_${file.name}`,
        position,
        fontSize,
        startNumber,
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
      defaultPath: `numbered_${file?.name || 'output.pdf'}`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });
    if (savePath) await invoke('save_file_to', { source: result.output_path, destination: savePath });
  };

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali</button>
        <h2># Nomor Halaman</h2>
        <p>Tambahkan nomor halaman secara otomatis ke setiap halaman PDF.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {!file && <Dropzone onFilesSelected={handleFiles} />}
          {file && <div className="file-list"><FileItem file={file} onRemove={removeFile} /></div>}

          {file && !result && !error && (
            <div className="options-panel animate-in">
              <h4>Pengaturan Nomor Halaman</h4>

              <div className="input-group" style={{ marginBottom: '16px' }}>
                <label>Posisi</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  {positions.map((p) => (
                    <button
                      key={p.key}
                      className={`quality-btn ${position === p.key ? 'selected' : ''}`}
                      style={{ padding: '8px', fontSize: '12px' }}
                      onClick={() => setPosition(p.key)}
                    >
                      <span className="quality-label" style={{ fontSize: '12px' }}>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>Ukuran Font (pt)</label>
                  <input
                    type="number"
                    min={6}
                    max={36}
                    value={fontSize}
                    onChange={(e) => setFontSize(Math.max(6, Math.min(36, parseInt(e.target.value) || 12)))}
                  />
                </div>
                <div className="input-group">
                  <label>Mulai dari Nomor</label>
                  <input
                    type="number"
                    min={1}
                    value={startNumber}
                    onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              </div>
            </div>
          )}

          {processing && <ProgressBar progress={progress} status="Menambahkan nomor halaman..." />}

          {error && (
            <div className="result-card animate-in" style={{ borderColor: 'rgba(225,112,85,0.3)' }}>
              <h4>✕ Error</h4>
              <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          {result && (
            <div className="result-card success animate-in">
              <h4>✓ Berhasil!</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Nomor halaman berhasil ditambahkan.
              </p>
              <button className="btn-primary" onClick={handleSave}>Simpan File</button>
            </div>
          )}

          {file && !processing && !result && !error && (
            <button className="btn-primary" onClick={handleProcess}>Tambah Nomor Halaman</button>
          )}
        </div>
      </div>
    </>
  );
}
