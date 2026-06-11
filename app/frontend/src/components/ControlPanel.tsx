import { useState, useEffect, useRef } from 'react'
import type { Session } from '../types'
import { api } from '../api'
import styles from './ControlPanel.module.css'

interface Props {
  session: Session
  onSessionUpdate: (s: Session) => void
  userRole: 'Admin' | 'Editor' | 'Viewer'
}

export function ControlPanel({ session, onSessionUpdate, userRole }: Props) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [statusChecked, setStatusChecked] = useState(false)
  const [mode, setMode] = useState<'screen' | 'browser'>('screen')

  useEffect(() => {
    api.recordingStatus().then(({ active }) => {
      setRecording(active)
      setStatusChecked(true)
    })
  }, [session.id])

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setElapsed(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [recording])

  // Listen for WS stop event to refresh session
  useEffect(() => {
    const wsUrl = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${wsUrl}//${window.location.host}/ws`)
    ws.onmessage = async (e) => {
      const data = JSON.parse(e.data)
      if (data.event === 'new_step') {
        const updated = await api.getSession(session.id)
        onSessionUpdate(updated)
      }
      if (data.event === 'stopped') {
        setRecording(false)
        const updated = await api.getSession(session.id)
        onSessionUpdate(updated)
      }
    }
    return () => ws.close()
  }, [session.id])

  async function handleStart() {
    if (userRole === 'Viewer') return
    await api.startRecording(session.id, mode)
    setRecording(true)
  }

  async function handleStop() {
    await api.stopRecording(session.id)
    setRecording(false)
    const updated = await api.getSession(session.id)
    onSessionUpdate(updated)
  }

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  if (!statusChecked) return null

  const isViewer = userRole === 'Viewer'

  return (
    <div className={`${styles.panel} ${recording ? styles.recording : ''}`} style={{ flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={styles.left}>
          <div className={styles.indicator}>
            {recording ? (
              <>
                <span className={styles.dot} />
                <span className={styles.ring} />
              </>
            ) : (
              <span className={styles.dotIdle} />
            )}
          </div>
          <div>
            <div className={styles.statusLabel}>
              {recording ? `Recording… ${fmtTime(elapsed)}` : 'Ready to record'}
            </div>
            <div className={styles.hint}>
              {recording
                ? 'Press F9 or click Stop to finish. Perform actions on your screen.'
                : isViewer
                ? 'You have read-only access (Viewer) to this project and cannot record guides.'
                : 'Choose a capture scope and click "Start Recording" to begin.'}
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.stepCount}>
            <span className={styles.stepCountNum}>{session.steps.length}</span>
            <span className={styles.stepCountLabel}>steps</span>
          </div>
          {recording ? (
            <button id="stop-recording-btn" className={`btn btn-danger ${styles.recBtn}`} onClick={handleStop}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              Stop Recording
            </button>
          ) : (
            <button 
              id="start-recording-btn" 
              className={`btn btn-primary ${styles.recBtn}`} 
              onClick={handleStart}
              disabled={isViewer}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
              Start Recording
            </button>
          )}
        </div>
      </div>

      {!recording && !isViewer && (
        <div className="mode-selection-group" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div 
            className={`mode-option-card ${mode === 'browser' ? 'selected' : ''}`}
            onClick={() => setMode('browser')}
          >
            <div className="mode-option-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10zM2 12h20"/></svg>
              Browser Only
            </div>
            <div className="mode-option-desc">Only captures clicks, keys, and scrolls inside web browsers (Edge, Chrome, Firefox).</div>
          </div>
          <div 
            className={`mode-option-card ${mode === 'screen' ? 'selected' : ''}`}
            onClick={() => setMode('screen')}
          >
            <div className="mode-option-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8M12 17v4"/></svg>
              Entire Screen
            </div>
            <div className="mode-option-desc">Captures actions in all open windows across your desktop.</div>
          </div>
        </div>
      )}
    </div>
  )
}
