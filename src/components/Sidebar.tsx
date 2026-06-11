import { NavLink } from 'react-router-dom';

const groups = [
  {
    title: 'Menu',
    items: [
      { path: '/', label: 'Dashboard', icon: '⊞' },
    ],
  },
  {
    title: 'Atur Halaman',
    items: [
      { path: '/merge',        label: 'Gabung PDF',         icon: '⊕' },
      { path: '/split',        label: 'Pisah PDF',           icon: '✂' },
      { path: '/delete-pages', label: 'Hapus Halaman',       icon: '✕' },
      { path: '/reorder',      label: 'Susun Ulang',         icon: '⇅' },
      { path: '/rotate',       label: 'Rotasi PDF',          icon: '↻' },
      { path: '/crop',         label: 'Crop PDF',            icon: '⬡' },
      { path: '/page-numbers', label: 'Nomor Halaman',       icon: '#' },
    ],
  },
  {
    title: 'Ukuran & Kualitas',
    items: [
      { path: '/compress',  label: 'Kompres PDF', icon: '↓' },
      { path: '/grayscale', label: 'Grayscale',   icon: '◑' },
      { path: '/watermark', label: 'Watermark',   icon: '◈' },
    ],
  },
  {
    title: 'Konversi',
    items: [
      { path: '/to-image',    label: 'PDF → Gambar',  icon: '▣' },
      { path: '/image-to-pdf', label: 'Gambar → PDF', icon: '⊞' },
      { path: '/to-text',     label: 'PDF → Teks',    icon: 'T' },
      { path: '/ocr',         label: 'OCR Scan',      icon: '◎' },
    ],
  },
  {
    title: 'Keamanan',
    items: [
      { path: '/protect', label: 'Proteksi PDF', icon: '⊘' },
      { path: '/unlock', label: 'Buka Kunci', icon: '⊙' },
    ],
  },
  {
    title: 'Informasi',
    items: [
      { path: '/info', label: 'Info PDF', icon: 'ⓘ' },
    ],
  },
];

interface SidebarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Sidebar({ theme, onToggleTheme }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">P</div>
        <h1>PDF Tools</h1>
      </div>
      <nav className="sidebar-nav">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="nav-section-title">{group.title}</div>
            {group.items.map((t) => (
              <NavLink
                key={t.path}
                to={t.path}
                end={t.path === '/'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="icon">{t.icon}</span>
                {t.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={onToggleTheme}>
          <span>{theme === 'light' ? '☀ Light' : '● Dark'}</span>
          <span style={{ fontSize: '11px', opacity: 0.5 }}>Toggle</span>
        </button>
      </div>
    </aside>
  );
}
