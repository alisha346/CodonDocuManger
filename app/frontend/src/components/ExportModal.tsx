import type { Session } from '../types'
import { api } from '../api'
import styles from './ExportModal.module.css'

interface Props {
  session: Session
  onClose: () => void
}

export function ExportModal({ session, onClose }: Props) {
  function downloadHtml() {
    window.open(api.exportHtmlUrl(session.id), '_blank')
  }
  function downloadMarkdown() {
    window.open(api.exportMarkdownUrl(session.id), '_blank')
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`${styles.modal} animate-fade-in`}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Export Guide</h2>
            <p className={styles.subtitle}>{session.steps.length} steps · {session.name}</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} id="export-modal-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className={styles.options}>
          <button className={styles.option} id="export-html-btn" onClick={downloadHtml}>
            <div className={styles.optionIcon} style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5">
                <path d="M4 4l2 12.5 6 2 6-2 2-12.5H4z"/>
                <path d="M8 8h8M7 12h10M9.5 16H14.5"/>
              </svg>
            </div>
            <div className={styles.optionBody}>
              <div className={styles.optionTitle}>Standalone HTML</div>
              <div className={styles.optionDesc}>A self-contained HTML file with all screenshots embedded. Share as a single file — works offline in any browser.</div>
            </div>
            <div className={styles.optionArrow}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M7 7h10v10"/></svg>
            </div>
          </button>

          <button className={styles.option} id="export-markdown-btn" onClick={downloadMarkdown}>
            <div className={styles.optionIcon} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M7 15V9l3 3 3-3v6M17 9v6"/>
              </svg>
            </div>
            <div className={styles.optionBody}>
              <div className={styles.optionTitle}>Markdown (.md)</div>
              <div className={styles.optionDesc}>Plain text Markdown with step descriptions. Perfect for Notion, GitHub READMEs, or Confluence.</div>
            </div>
            <div className={styles.optionArrow}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M7 7h10v10"/></svg>
            </div>
          </button>

          <button className={styles.option} id="export-print-btn" onClick={() => window.open(api.exportPdfUrl(session.id), '_blank')}>
            <div className={styles.optionIcon} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                <path d="M6 14h12v8H6z"/>
              </svg>
            </div>
            <div className={styles.optionBody}>
              <div className={styles.optionTitle}>PDF Document (.pdf)</div>
              <div className={styles.optionDesc}>Download a formatted PDF document of the guide with all screenshots, perfect for printing or offline reading.</div>
            </div>
            <div className={styles.optionArrow}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M7 7h10v10"/></svg>
            </div>
          </button>
        </div>

        <div className={styles.footer}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          <span>Tip: The standalone HTML file includes all images as base64 — no internet connection needed to view it.</span>
        </div>
      </div>
    </div>
  )
}
