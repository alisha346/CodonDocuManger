import { useState, useRef } from 'react'
import type { Step } from '../types'
import { api } from '../api'
import styles from './StepCard.module.css'

interface Props {
  step: Step
  sessionId: string
  onDeleted: (id: string) => void
  onDescriptionChange: (id: string, desc: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  isFirst: boolean
  isLast: boolean
  readOnly?: boolean
}

const ACTION_ICONS: Record<string, string> = {
  click: '🖱️',
  type: '⌨️',
  scroll: '📜',
}

export function StepCard({
  step, sessionId, onDeleted, onDescriptionChange, onMoveUp, onMoveDown, isFirst, isLast, readOnly = false
}: Props) {
  const [editing, setEditing] = useState(false)
  const [desc, setDesc] = useState(step.description)
  const [saving, setSaving] = useState(false)
  const [imgExpanded, setImgExpanded] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const screenshotFilename = step.screenshot ? step.screenshot.split('\\').pop()?.split('/').pop() : null
  const imgUrl = screenshotFilename ? api.screenshotUrl(sessionId, screenshotFilename) : null

  async function saveDescription() {
    if (desc === step.description) { setEditing(false); return }
    setSaving(true)
    await api.updateStep(sessionId, step.id, desc)
    onDescriptionChange(step.id, desc)
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete() {
    await api.deleteStep(sessionId, step.id)
    onDeleted(step.id)
  }

  return (
    <div className={`${styles.card} animate-fade-in`}>
      <div className={styles.leftRail}>
        <div className={styles.stepNum}>{step.order}</div>
        <div className={styles.rail} />
      </div>

      <div className={styles.body}>
        <div className={styles.header}>
          <div className={styles.meta}>
            <span className={`badge badge-${step.type}`}>
              {ACTION_ICONS[step.type] || ''} {step.type}
            </span>
            {step.app_name && (
              <span className={styles.appBadge}>{step.app_name}</span>
            )}
            {step.window_title && step.window_title !== step.app_name && (
              <span className={styles.windowTitle} title={step.window_title}>
                {step.window_title.length > 40 ? step.window_title.slice(0, 40) + '…' : step.window_title}
              </span>
            )}
          </div>
          {!readOnly && (
            <div className={styles.actions}>
              <button className="btn btn-ghost btn-sm btn-icon" title="Move up" disabled={isFirst} onClick={() => onMoveUp(step.id)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              </button>
              <button className="btn btn-ghost btn-sm btn-icon" title="Move down" disabled={isLast} onClick={() => onMoveDown(step.id)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              </button>
              <button className="btn btn-ghost btn-sm btn-icon" title="Edit description" onClick={() => { setEditing(true); setTimeout(() => textRef.current?.focus(), 50) }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button className="btn btn-danger btn-sm btn-icon" title="Delete step" onClick={handleDelete}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className={styles.editArea}>
            <textarea
              ref={textRef}
              className="input"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={2}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveDescription() } if (e.key === 'Escape') { setDesc(step.description); setEditing(false) } }}
            />
            <div className={styles.editBtns}>
              <button className="btn btn-primary btn-sm" onClick={saveDescription} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setDesc(step.description); setEditing(false) }}>Cancel</button>
            </div>
          </div>
        ) : (
          <p 
            className={styles.description} 
            onDoubleClick={() => { if (!readOnly) setEditing(true) }}
            style={{ cursor: readOnly ? 'default' : 'pointer' }}
          >
            {desc}
          </p>
        )}

        {step.type === 'type' && step.typed_text && (
          <div className={styles.typedText}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h4M14 8h4M6 12h2M10 12h4M16 12h2M6 16h12"/></svg>
            <code>{step.typed_text}</code>
          </div>
        )}

        {imgUrl && (
          <div className={styles.screenshotWrap}>
            <img
              src={imgUrl}
              alt={`Step ${step.order} screenshot`}
              className={`${styles.screenshot} ${imgExpanded ? styles.expanded : ''}`}
              onClick={() => setImgExpanded(!imgExpanded)}
              title={imgExpanded ? 'Click to collapse' : 'Click to expand'}
            />
            <div className={styles.imgHint}>
              {imgExpanded ? '↙ Click to collapse' : '↗ Click to expand'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
