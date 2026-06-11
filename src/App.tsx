import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import Sidebar from './components/Sidebar';

// Lazy load all pages for reduced initial bundle & RAM usage
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PdfCompress = lazy(() => import('./pages/PdfCompress'));
const PdfMerge = lazy(() => import('./pages/PdfMerge'));
const PdfSplit = lazy(() => import('./pages/PdfSplit'));
const PdfToImage = lazy(() => import('./pages/PdfToImage'));
const PdfProtect = lazy(() => import('./pages/PdfProtect'));
const PdfRotate = lazy(() => import('./pages/PdfRotate'));
const PdfUnlock = lazy(() => import('./pages/PdfUnlock'));
const PdfWatermark = lazy(() => import('./pages/PdfWatermark'));
const ImageToPdf = lazy(() => import('./pages/ImageToPdf'));
const PdfInfo = lazy(() => import('./pages/PdfInfo'));
const PdfCrop = lazy(() => import('./pages/PdfCrop'));
const PdfDeletePages = lazy(() => import('./pages/PdfDeletePages'));
const PdfReorder = lazy(() => import('./pages/PdfReorder'));
const PdfPageNumbers = lazy(() => import('./pages/PdfPageNumbers'));
const PdfToText = lazy(() => import('./pages/PdfToText'));
const PdfGrayscale = lazy(() => import('./pages/PdfGrayscale'));
const PdfOcr = lazy(() => import('./pages/PdfOcr'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '13px' }}>
      Memuat...
    </div>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar theme={theme} onToggleTheme={toggleTheme} />
        <main className="main-content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/compress" element={<PdfCompress />} />
              <Route path="/merge" element={<PdfMerge />} />
              <Route path="/split" element={<PdfSplit />} />
              <Route path="/to-image" element={<PdfToImage />} />
              <Route path="/protect" element={<PdfProtect />} />
              <Route path="/rotate" element={<PdfRotate />} />
              <Route path="/unlock" element={<PdfUnlock />} />
              <Route path="/watermark" element={<PdfWatermark />} />
              <Route path="/image-to-pdf" element={<ImageToPdf />} />
              <Route path="/info" element={<PdfInfo />} />
              <Route path="/crop" element={<PdfCrop />} />
              <Route path="/delete-pages" element={<PdfDeletePages />} />
              <Route path="/reorder" element={<PdfReorder />} />
              <Route path="/page-numbers" element={<PdfPageNumbers />} />
              <Route path="/to-text" element={<PdfToText />} />
              <Route path="/grayscale" element={<PdfGrayscale />} />
              <Route path="/ocr" element={<PdfOcr />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}
