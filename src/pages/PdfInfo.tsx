import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';

interface PdfMetadata {
  title: string; author: string; pages: string; file_size: string;
  pdf_version: string; creator: string; producer: string; page_size: string; encrypted: string;
}

export default function PdfInfo() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (files: PdfFile[]) => {
    const f = files[0];
    setFile(f); setMetadata(null); setError(''); setLoading(true);
    try {
      const meta = await invoke<PdfMetadata>('get_pdf_metadata', { inputPath: f.path });
      setMetadata(meta);
    } catch (err: any) { setError(typeof err === 'string' ? err : err.message || 'Error'); }
    finally { setLoading(false); }
  };

  const removeFile = () => { setFile(null); setMetadata(null); setError(''); };

  const fields = metadata ? [
    ['Judul', metadata.title],
    ['Penulis', metadata.author],
    ['Halaman', metadata.pages],
    ['Ukuran', metadata.file_size],
    ['Versi PDF', metadata.pdf_version],
    ['Pembuat', metadata.creator],
    ['Produser', metadata.producer],
    ['Ukuran Halaman', metadata.page_size],
    ['Terenkripsi', metadata.encrypted],
  ] : [];

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali</button>
        <h2>ⓘ Info PDF</h2>
        <p>Lihat metadata dan informasi detail dari file PDF.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {!file && <Dropzone onFilesSelected={handleFiles} />}
          {file && <div className="file-list"><FileItem file={file} onRemove={removeFile} /></div>}
          {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '16px', fontSize: '13px' }}>Memuat metadata...</p>}
          {error && <div className="result-card animate-in" style={{ borderColor: 'rgba(239,68,68,0.3)' }}><h4>✕ Error</h4><p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p></div>}
          {metadata && (
            <div className="options-panel animate-in" style={{ marginTop: '16px' }}>
              <h4>ⓘ Metadata</h4>
              {fields.map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontWeight: 600, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>{value || '-'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
