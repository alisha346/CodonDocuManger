import type { Session } from '../types'
import { api } from '../api'
import { StepCard } from './StepCard'
import styles from './Timeline.module.css'

interface Props {
  session: Session
  onSessionChange: (s: Session) => void
  userRole: 'Admin' | 'Editor' | 'Viewer'
}

export function Timeline({ session, onSessionChange, userRole }: Props) {
  const steps = [...session.steps].sort((a, b) => a.order - b.order)

  async function handleDeleted(_stepId: string) {
    const updated = await api.getSession(session.id)
    onSessionChange(updated)
  }

  async function handleDescriptionChange(stepId: string, desc: string) {
    onSessionChange({
      ...session,
      steps: session.steps.map(s => s.id === stepId ? { ...s, description: desc } : s),
    })
  }

  async function moveStep(stepId: string, direction: 'up' | 'down') {
    if (userRole === 'Viewer') return
    const sorted = [...steps]
    const idx = sorted.findIndex(s => s.id === stepId)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === sorted.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]]

    const newIds = sorted.map(s => s.id)
    await api.reorderSteps(session.id, newIds)
    const updated = await api.getSession(session.id)
    onSessionChange(updated)
  }

  if (steps.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
          </svg>
        </div>
        <p className={styles.emptyTitle}>No steps yet</p>
        <p className={styles.emptyHint}>Start recording and perform actions on your screen. Each click, scroll, and keyboard input will appear here automatically.</p>
      </div>
    )
  }

  const isViewer = userRole === 'Viewer'

  return (
    <div className={styles.timeline}>
      {steps.map((step, idx) => (
        <StepCard
          key={step.id}
          step={step}
          sessionId={session.id}
          onDeleted={handleDeleted}
          onDescriptionChange={handleDescriptionChange}
          onMoveUp={(id) => moveStep(id, 'up')}
          onMoveDown={(id) => moveStep(id, 'down')}
          isFirst={idx === 0}
          isLast={idx === steps.length - 1}
          readOnly={isViewer}
        />
      ))}
    </div>
  )
}
