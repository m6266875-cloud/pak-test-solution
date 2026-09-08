/**
 * PHASE 2 — Print/PDF sheet modal.
 *
 * Portals the paper document to <body> and switches the app into
 * “print-open” mode, where global.css hides #root and lays the sheet out for
 * A4. The user saves a PDF through the browser’s own “Save as PDF” — no
 * puppeteer/chromium dependency, works in any deployment.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, X } from 'lucide-react';
import { PaperDoc } from './generate/PaperDoc';
import type { PaperV2 } from '../../types';

export function PrintSheet({ paper, onClose }: { paper: PaperV2; onClose: () => void }) {
  const [showKey, setShowKey] = useState(false);

  const doPrint = () => {
    document.body.classList.add('print-open');
    const cleanup = () => document.body.classList.remove('print-open');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 3000);
    window.print();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="print-overlay" dir="ltr">
      {/* toolbar — hidden while printing */}
      <div className="no-print flex items-center justify-between max-w-[820px] mx-auto mb-3 gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-surface-800 text-sm">Print preview</h3>
          <button
            className={showKey ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
            onClick={() => setShowKey(!showKey)}>
            {showKey ? 'Answer key ON' : 'Answer key OFF'}
          </button>
          <span className="text-[11px] text-surface-400">MCQs print letter-bubbles; Urdu prints RTL.</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost btn-sm" onClick={onClose}><X className="w-4 h-4" /> Close</button>
          <button className="btn-primary btn-sm" onClick={doPrint}><FileDown className="w-4 h-4" /> Download PDF</button>
        </div>
      </div>
      <PaperDoc paper={paper} showKey={showKey} />
    </div>,
    document.body
  );
}
