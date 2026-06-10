import { useState, useEffect } from 'react'
import type { Session, Project, User, ProjectMember, DriveConfig, DriveFileNode } from './types'
import { api } from './api'
import { ControlPanel } from './components/ControlPanel'
import { Timeline } from './components/Timeline'
import { ExportModal } from './components/ExportModal'
import './App.css'

type View = 'dashboard' | 'editor'
type SubSection = 'general' | 'branding' | 'documents' | 'members'

export default function App() {
  // Authentication State
  const [user, setUser] = useState<User | null>(null)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  // View States
  const [view, setView] = useState<View>('dashboard')
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  
  // Projects & Navigation States
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string>('operations-project-id')
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>('operations-project-id')
  const [activeSubSection, setActiveSubSection] = useState<SubSection>('documents')
  const [creatingProject, setCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  // Sessions / Guides
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)
  const [newName, setNewName] = useState('')
  
  // Settings Form States
  const [projName, setProjName] = useState('')
  const [projUrl, setProjUrl] = useState('')
  const [projAdmin, setProjAdmin] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  // Branding States
  const [editingBranding, setEditingBranding] = useState(false)
  const [brandLogo, setBrandLogo] = useState('')
  const [brandColor1, setBrandColor1] = useState('#a855f7')
  const [brandColor2, setBrandColor2] = useState('#7c3aed')
  const [brandFont, setBrandFont] = useState('Default Font')
  
  // Member States
  const [newMemberUsername, setNewMemberUsername] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'Admin' | 'Editor' | 'Viewer'>('Viewer')
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])

  // Editor specific states
  const [showExport, setShowExport] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  // Google Drive State
  const [driveConfig, setDriveConfig] = useState<DriveConfig>({
    client_id: '',
    client_secret: '',
    connected: false,
    simulation: true,
    user_email: 'demo.user@gmail.com'
  })
  const [driveClientId, setDriveClientId] = useState('')
  const [driveClientSecret, setDriveClientSecret] = useState('')
  const [driveSimulation, setDriveSimulation] = useState(true)
  const [driveFiles, setDriveFiles] = useState<DriveFileNode[]>([])
  const [syncingDrive, setSyncingDrive] = useState(false)

  async function loadDriveConfig() {
    try {
      const cfg = await api.getDriveConfig()
      setDriveConfig(cfg)
      setDriveClientId(cfg.client_id)
      setDriveClientSecret(cfg.client_secret)
      setDriveSimulation(cfg.simulation)
      if (cfg.connected || cfg.simulation) {
        const files = await api.getDriveFiles()
        setDriveFiles(files)
      }
    } catch (err) {
      console.error('Failed to load drive config:', err)
    }
  }

  async function handleSaveDriveConfig() {
    try {
      await api.saveDriveConfig(driveClientId.trim(), driveClientSecret.trim(), driveSimulation)
      alert('Google Drive configuration saved successfully!')
      loadDriveConfig()
    } catch (err: any) {
      alert('Failed to save config: ' + err.message)
    }
  }

  async function handleConnectDrive() {
    if (!driveClientId.trim()) {
      alert('Please enter a Google Client ID.')
      return
    }
    try {
      const authUrl = await api.getDriveAuthUrl(driveClientId.trim())
      window.location.href = authUrl
    } catch (err: any) {
      alert('Failed to fetch auth link: ' + err.message)
    }
  }

  async function handleDisconnectDrive() {
    if (!confirm('Are you sure you want to disconnect from Google Drive?')) return
    try {
      await api.disconnectDrive()
      alert('Disconnected successfully!')
      loadDriveConfig()
      setDriveFiles([])
    } catch (err: any) {
      alert('Failed to disconnect: ' + err.message)
    }
  }

  async function handleSyncDrive() {
    setSyncingDrive(true)
    try {
      const res = await api.syncDrive()
      if (res.success) {
        alert('All local projects and guides successfully backed up to Google Drive!')
        loadDriveFiles()
      } else {
        alert('Sync failed: ' + res.error)
      }
    } catch (err: any) {
      alert('Sync failed: ' + err.message)
    } finally {
      setSyncingDrive(false)
    }
  }

  async function loadDriveFiles() {
    try {
      const files = await api.getDriveFiles()
      setDriveFiles(files)
    } catch (err) {
      console.error('Failed to load drive files:', err)
    }
  }

  const renderDriveTree = (nodes: DriveFileNode[]) => {
    return (
      <ul style={{ listStyleType: 'none', paddingLeft: '16px', margin: '4px 0' }}>
        {nodes.map((node, idx) => (
          <li key={idx} style={{ margin: '6px 0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.9rem' }}>{node.type === 'folder' ? '📁' : '📄'}</span>
              <span style={{ fontWeight: node.type === 'folder' ? 700 : 400, color: 'var(--text-primary)' }}>{node.name}</span>
              {node.size && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginLeft: '6px' }}>({node.size})</span>}
            </div>
            {node.children && renderDriveTree(node.children)}
          </li>
        ))}
      </ul>
    )
  }

  // Load Drive Config & handle query parameter redirects
  useEffect(() => {
    if (user) {
      loadDriveConfig()
      
      const params = new URLSearchParams(window.location.search)
      
      // 1. Settings Redirection Check
      if (params.get('view') === 'settings') {
        setView('dashboard')
        setActiveProjectId('operations-project-id')
        setExpandedProjectId('operations-project-id')
        setActiveSubSection('general')
        
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname
        window.history.replaceState({ path: newUrl }, '', newUrl)
      }
      
      // 2. Open specific Guide/Session Check
      const sessionParam = params.get('session')
      if (sessionParam) {
        openEditorById(sessionParam)
        
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname
        window.history.replaceState({ path: newUrl }, '', newUrl)
      }
    }
  }, [user])

  // Load user from localStorage on init
  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (_) {
        localStorage.removeItem('user')
      }
    } else {
      const params = new URLSearchParams(window.location.search)
      if (params.get('view') === 'signup') {
        setIsSignUp(true)
        
        // Clean query parameters from URL without reloading
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname
        window.history.replaceState({ path: newUrl }, '', newUrl)
      }
    }
  }, [])

  // Load projects once user is authenticated
  useEffect(() => {
    if (user) {
      loadProjects()
    }
  }, [user])

  // Load project members and sessions when active project/subsection changes
  useEffect(() => {
    if (user && activeProjectId) {
      const proj = projects.find(p => p.id === activeProjectId)
      if (proj) {
        setProjName(proj.name)
        setProjUrl(proj.team_url)
        setProjAdmin(proj.admin_name)
        setBrandLogo(proj.branding.logo || '')
        setBrandColor1(proj.branding.colors?.[0] || '#a855f7')
        setBrandColor2(proj.branding.colors?.[1] || '#7c3aed')
        setBrandFont(proj.branding.font || 'Default Font')
        setEditingBranding(false)
      }
      
      if (activeSubSection === 'documents') {
        loadSessions(activeProjectId)
      } else if (activeSubSection === 'members') {
        loadMembers(activeProjectId)
      }
    }
  }, [activeProjectId, activeSubSection, projects, user])

  // ─── API Calls ─────────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    try {
      const res = await api.login(loginUsername, loginPassword)
      if (res.ok) {
        localStorage.setItem('user', JSON.stringify(res.user))
        setUser(res.user)
        setLoginUsername('')
        setLoginPassword('')
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed')
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    try {
      const res = await api.signup(loginUsername, loginPassword, loginEmail)
      if (res.ok) {
        localStorage.setItem('user', JSON.stringify(res.user))
        setUser(res.user)
        setLoginUsername('')
        setLoginPassword('')
        setLoginEmail('')
        setIsSignUp(false)
      }
    } catch (err: any) {
      setLoginError(err.message || 'Signup failed')
    }
  }

  function handleLogout() {
    localStorage.removeItem('user')
    setUser(null)
    setProjects([])
    setSessions([])
    setView('dashboard')
    setActiveSession(null)
  }

  async function loadProjects() {
    if (!user) return
    const list = await api.listProjects(user.username)
    setProjects(list)
    if (list.length > 0) {
      // If active project is not in the list, switch to the first one
      if (!list.some(p => p.id === activeProjectId)) {
        setActiveProjectId(list[0].id)
        setExpandedProjectId(list[0].id)
      }
    }
  }

  async function loadSessions(projectId: string) {
    setLoadingSessions(true)
    try {
      const list = await api.listSessions(projectId)
      setSessions(list)
    } finally {
      setLoadingSessions(false)
    }
  }

  async function loadMembers(projectId: string) {
    const list = await api.getMembers(projectId)
    setProjectMembers(list)
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    if (!newProjectName.trim() || !user) return
    const p = await api.createProject(newProjectName.trim(), user.username)
    setProjects(prev => [...prev, p])
    setActiveProjectId(p.id)
    setExpandedProjectId(p.id)
    setActiveSubSection('documents')
    setNewProjectName('')
    setCreatingProject(false)
  }

  async function handleDeleteProject() {
    if (effectiveRole !== 'Admin') return
    if (!confirm(`Are you sure you want to delete the project "${activeProject?.name}"? All guides and screenshots will be permanently deleted.`)) return
    
    try {
      await api.deleteProject(activeProjectId)
      const remaining = projects.filter(p => p.id !== activeProjectId)
      setProjects(remaining)
      if (remaining.length > 0) {
        setActiveProjectId(remaining[0].id)
        setExpandedProjectId(remaining[0].id)
        setActiveSubSection('documents')
      } else {
        setActiveProjectId('')
        setExpandedProjectId(null)
      }
    } catch (e: any) {
      alert(e.message || 'Failed to delete project')
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    if (effectiveRole !== 'Admin') return
    setSavingSettings(true)
    try {
      const p = await api.updateProjectSettings(activeProjectId, projName, projUrl, projAdmin)
      setProjects(prev => prev.map(item => item.id === p.id ? p : item))
    } finally {
      setSavingSettings(false)
    }
  }

  async function saveBranding() {
    if (effectiveRole !== 'Admin') return
    const p = await api.updateProjectBranding(activeProjectId, brandLogo, [brandColor1, brandColor2], brandFont)
    setProjects(prev => prev.map(item => item.id === p.id ? p : item))
    setEditingBranding(false)
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault()
    if (!newMemberUsername.trim() || effectiveRole !== 'Admin') return
    const p = await api.addMember(activeProjectId, newMemberUsername.trim(), newMemberRole)
    setProjects(prev => prev.map(item => item.id === p.id ? p : item))
    setProjectMembers(p.members)
    setNewMemberUsername('')
    setNewMemberRole('Viewer')
  }

  async function removeMember(username: string) {
    if (effectiveRole !== 'Admin') return
    const p = await api.removeMember(activeProjectId, username)
    setProjects(prev => prev.map(item => item.id === p.id ? p : item))
    setProjectMembers(p.members)
  }

  async function createSession() {
    if (effectiveRole === 'Viewer') return
    const session = await api.createSession(newName.trim() || '', activeProjectId)
    setSessions(prev => [session, ...prev])
    setNewName('')
    setCreatingSession(false)
    openEditor(session)
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (effectiveRole === 'Viewer') return
    await api.deleteSession(id)
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  function openEditor(session: Session) {
    setActiveSession(session)
    setView('editor')
  }

  async function openEditorById(id: string) {
    const session = await api.getSession(id)
    openEditor(session)
  }

  async function saveTitle() {
    if (!activeSession || effectiveRole === 'Viewer') return
    if (titleDraft === activeSession.name) { setEditingTitle(false); return }
    const updated = await api.renameSession(activeSession.id, titleDraft)
    setActiveSession(updated)
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
    setEditingTitle(false)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setBrandLogo(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const activeProject = projects.find(p => p.id === activeProjectId)
  
  // Find current user's role in selected project (default to Viewer if not a member, unless global Admin)
  const userRole: 'Admin' | 'Editor' | 'Viewer' = (() => {
    if (!user) return 'Viewer'
    if (user.global_role === 'Admin') return 'Admin'
    const member = activeProject?.members.find(m => m.username.toLowerCase() === user.username.toLowerCase())
    return member?.role || 'Viewer'
  })()

  const effectiveRole: 'Admin' | 'Editor' | 'Viewer' = userRole

  // Apply project brand colors dynamically as CSS variables
  const themeStyles = activeProject ? {
    '--accent': activeProject.branding.colors?.[0] || '#a855f7',
    '--accent-dark': activeProject.branding.colors?.[1] || '#7c3aed',
    '--grad-accent': `linear-gradient(135deg, ${activeProject.branding.colors?.[0] || '#a855f7'}, ${activeProject.branding.colors?.[1] || '#7c3aed'})`
  } as React.CSSProperties : {}

  const fmtDate = (ts: number) => {
    return new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // ─── Render: Login Page ───────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="app">
        <div className="blob blob-1" />
        <div className="blob blob-2" />

        <nav className="navbar glass">
          <div className="navbar-brand">
            <div className="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <span className="brand-name">CodonDocuManger</span>
          </div>
        </nav>

        <div className="login-container">
          <div className="login-card glass animate-fade-in">
            <div className="login-title">CodonDocuManger</div>
            <div className="login-subtitle">{isSignUp ? 'Create a new account' : 'Sign in to record and manage guides'}</div>

            {loginError && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '16px', textAlign: 'center' }}>{loginError}</div>}

            <form onSubmit={isSignUp ? handleSignup : handleLogin}>
              <div className="login-form-group">
                <label>Username</label>
                <input
                  type="text"
                  className="input login-input"
                  placeholder="Enter username"
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  required
                />
              </div>
              {isSignUp && (
                <div className="login-form-group">
                  <label>Email ID</label>
                  <input
                    type="email"
                    className="input login-input"
                    placeholder="Enter email ID"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="login-form-group">
                <label>Password</label>
                <input
                  type="password"
                  className="input login-input"
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary login-button">
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => { setIsSignUp(!isSignUp); setLoginError('') }}
                type="button"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: Visual Guide Editor ──────────────────────────────────────────
  if (view === 'editor' && activeSession) {
    return (
      <div className="app" style={themeStyles}>
        <div className="blob blob-1" />
        <div className="blob blob-2" />

        {/* Editor Navbar */}
        <nav className="navbar glass project-branded-navbar" style={{ '--project-brand-color': activeProject?.branding.colors?.[0] } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button id="back-to-dashboard" className="btn btn-ghost btn-sm btn-icon" onClick={() => { setView('dashboard'); loadSessions(activeProjectId) }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
            <div className="navbar-brand">
              {activeProject?.branding.logo ? (
                <img src={activeProject.branding.logo} alt={activeProject.name} className="project-logo-image" />
              ) : (
                <>
                  <div className="brand-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                  </div>
                  <span className="brand-name">{activeProject?.name || 'CodonDocuManger'}</span>
                </>
              )}
            </div>

            {editingTitle && effectiveRole !== 'Viewer' ? (
              <input
                id="session-title-input"
                className="input"
                style={{ maxWidth: 300, padding: '6px 12px', fontSize: '0.9rem' }}
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                autoFocus
              />
            ) : (
              <div
                className="editor-title"
                onClick={() => { if (effectiveRole !== 'Viewer') { setTitleDraft(activeSession.name); setEditingTitle(true) } }}
                title={effectiveRole !== 'Viewer' ? "Click to rename" : undefined}
                id="session-title-display"
              >
                {activeSession.name}
                {effectiveRole !== 'Viewer' && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button id="export-btn" className="btn btn-ghost btn-sm" onClick={() => setShowExport(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Export
            </button>
          </div>
        </nav>

        <div className="editor-layout">
          <aside className="editor-sidebar">
            <ControlPanel
              session={activeSession}
              onSessionUpdate={updated => setActiveSession(updated)}
              userRole={effectiveRole}
            />

            <div className="sidebar-info glass">
              <div className="info-row">
                <span className="info-label">Steps</span>
                <span className="info-val accent">{activeSession.steps.length}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Created</span>
                <span className="info-val">{fmtDate(activeSession.created_at)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Last updated</span>
                <span className="info-val">{fmtDate(activeSession.updated_at)}</span>
              </div>
            </div>

            <div className="sidebar-help glass">
              <div className="help-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                Tips
              </div>
              <ul className="help-list">
                {effectiveRole !== 'Viewer' && (
                  <>
                    <li>Double-click a step description to edit it</li>
                    <li>Use ↑↓ arrows to reorder steps</li>
                  </>
                )}
                <li>Click a screenshot to expand it</li>
              </ul>
            </div>
          </aside>

          <main className="editor-main">
            <Timeline
              session={activeSession}
              onSessionChange={updated => setActiveSession(updated)}
              userRole={effectiveRole}
            />
          </main>
        </div>

        {showExport && (
          <ExportModal session={activeSession} onClose={() => setShowExport(false)} />
        )}
      </div>
    )
  }

  // ─── Render: Dashboard Layout ─────────────────────────────────────────────
  return (
    <div className="app" style={themeStyles}>
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      {/* Main Navbar */}
      <nav className="navbar glass project-branded-navbar" style={{ '--project-brand-color': activeProject?.branding.colors?.[0] } as React.CSSProperties}>
        <div className="navbar-brand">
          {activeProject?.branding.logo ? (
            <img src={activeProject.branding.logo} alt={activeProject.name} className="project-logo-image" />
          ) : (
            <>
              <div className="brand-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
              <span className="brand-name">CodonDocuManger</span>
            </>
          )}
          <span className="brand-tag">{activeProject?.name || 'Local'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Logged in: <strong style={{ color: 'var(--text-primary)' }}>{user.username}</strong> ({user.global_role})
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log Out</button>
        </div>
      </nav>

      <div className="teams-layout">
        {/* Left Project Sidebar */}
        <aside className="teams-sidebar">
          <div className="teams-section-header">
            <span>My Teams</span>
            <button className="add-team-btn" title="Create project" onClick={() => setCreatingProject(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>

          {creatingProject && (
            <form onSubmit={createProject} style={{ padding: '0 12px 12px' }}>
              <input
                className="input"
                style={{ fontSize: '0.8rem', padding: '6px 10px', marginBottom: '6px', width: '100%' }}
                placeholder="Project name…"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                autoFocus
                required
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1, padding: '4px' }}>Create</button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1, padding: '4px' }} onClick={() => setCreatingProject(false)}>Cancel</button>
              </div>
            </form>
          )}

          <div className="project-list">
            {projects.map(proj => {
              const isSelected = activeProjectId === proj.id
              const isExpanded = expandedProjectId === proj.id
              const firstLetter = proj.name ? proj.name[0] : 'P'
              
              // Custom colors for avatar based on project id
              const avatarColor = proj.branding?.colors?.[0] || '#3b82f6'

              return (
                <div className="project-item" key={proj.id}>
                  <div 
                    className={`project-header ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setActiveProjectId(proj.id)
                      setExpandedProjectId(isExpanded ? null : proj.id)
                    }}
                  >
                    <div className="project-info-wrap">
                      <div className="project-avatar" style={{ backgroundColor: avatarColor }}>{firstLetter}</div>
                      <span className="project-name-label">{proj.name}</span>
                    </div>
                    <span className={`project-arrow ${isExpanded ? 'expanded' : ''}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="project-sublinks animate-fade-in">
                      <div 
                        className={`sublink-item ${activeSubSection === 'general' ? 'active' : ''}`}
                        onClick={() => { setActiveProjectId(proj.id); setActiveSubSection('general') }}
                      >
                        General
                      </div>
                      <div 
                        className={`sublink-item ${activeSubSection === 'branding' ? 'active' : ''}`}
                        onClick={() => { setActiveProjectId(proj.id); setActiveSubSection('branding') }}
                      >
                        Branding
                      </div>
                      <div 
                        className={`sublink-item ${activeSubSection === 'documents' ? 'active' : ''}`}
                        onClick={() => { setActiveProjectId(proj.id); setActiveSubSection('documents') }}
                      >
                        Documents
                      </div>
                      <div 
                        className={`sublink-item ${activeSubSection === 'members' ? 'active' : ''}`}
                        onClick={() => { setActiveProjectId(proj.id); setActiveSubSection('members') }}
                      >
                        Team Members
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="teams-content">
          {projects.length === 0 ? (
            <div className="empty-projects-welcome glass animate-fade-in" style={{
              maxWidth: '640px',
              margin: '40px auto',
              padding: '40px',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              textAlign: 'center'
            }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>
                Welcome to CodonDocuManger!
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem', lineHeight: '1.6' }}>
                You are not a member of any project teams yet. To start capturing visual guides, please choose one of the options below:
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', textAlign: 'left' }}>
                <div className="option-card glass" style={{
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ➕ Create Project
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', marginTop: '6px' }}>
                      Start a brand new workspace. You will be the Administrator and can customize branding, invite members, and configure details.
                    </p>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ width: '100%', marginTop: '12px' }}
                    onClick={() => setCreatingProject(true)}
                  >
                    Create New Project
                  </button>
                </div>
                
                <div className="option-card glass" style={{
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      👥 Join Existing
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', marginTop: '6px' }}>
                      Ask an Administrator of an existing project to invite your registered email ID:
                    </p>
                    <code style={{
                      display: 'block',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      marginTop: '8px',
                      textAlign: 'center',
                      wordBreak: 'break-all'
                    }}>
                      {user.email}
                    </code>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px' }}>
                    Access appears automatically upon invitation.
                  </div>
                </div>
              </div>
            </div>
          ) : activeProject ? (
            <div className="animate-fade-in">
              {/* SECTION: GENERAL SETTINGS */}
              {activeSubSection === 'general' && (
                <div>
                  <h2 className="panel-title">{activeProject.name} General Settings</h2>
                  <div className="settings-card glass">
                    <form onSubmit={saveSettings}>
                      <div className="settings-form-group">
                        <label>Project Name</label>
                        <input
                          type="text"
                          className="input"
                          value={projName}
                          onChange={e => setProjName(e.target.value)}
                          disabled={effectiveRole !== 'Admin'}
                          required
                        />
                      </div>
                      <div className="settings-form-row">
                        <div className="settings-form-group">
                          <label>Team URL</label>
                          <input
                            type="text"
                            className="input"
                            value={projUrl}
                            onChange={e => setProjUrl(e.target.value)}
                            disabled={effectiveRole !== 'Admin'}
                            required
                          />
                        </div>
                        <div className="settings-form-group">
                          <label>Administrator Name</label>
                          <input
                            type="text"
                            className="input"
                            value={projAdmin}
                            onChange={e => setProjAdmin(e.target.value)}
                            disabled={effectiveRole !== 'Admin'}
                            required
                          />
                        </div>
                      </div>
                      {effectiveRole === 'Admin' ? (
                        <button type="submit" className="btn btn-primary" disabled={savingSettings}>
                          {savingSettings ? 'Saving Changes…' : 'Save General Settings'}
                        </button>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          🔒 Only project administrators can change general settings.
                        </div>
                      )}
                    </form>
                  </div>

                  {effectiveRole === 'Admin' && (
                    <div className="settings-card glass" style={{ marginTop: '24px', borderColor: '#ef4444' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ef4444', marginBottom: '12px' }}>Danger Zone</h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Deleting this project will permanently delete all captured guides and screenshots under this project. This action cannot be undone.
                      </p>
                      <button className="btn btn-danger" onClick={handleDeleteProject}>
                        Delete Project
                      </button>
                    </div>
                  )}

                  {/* Google Drive Cloud Sync */}
                  <div className="settings-card glass" style={{ marginTop: '24px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '12px' }}>☁️ Google Drive Cloud Storage</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Synchronize your visual guides, metadata, and settings directly with your Google Drive folder.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: driveConfig.connected ? '#10b981' : '#ef4444', boxShadow: driveConfig.connected ? '0 0 8px #10b981' : '0 0 8px #ef4444' }}></div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        Status: {driveConfig.connected ? `Connected as ${driveConfig.user_email}` : driveConfig.simulation ? 'Simulation Mode' : 'Disconnected'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="settings-form-group">
                        <label>Google OAuth Client ID</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Enter Google Client ID"
                          value={driveClientId}
                          onChange={e => setDriveClientId(e.target.value)}
                        />
                      </div>
                      <div className="settings-form-group">
                        <label>Google OAuth Client Secret</label>
                        <input
                          type="password"
                          className="input"
                          placeholder="Enter Google Client Secret"
                          value={driveClientSecret}
                          onChange={e => setDriveClientSecret(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <input
                          type="checkbox"
                          id="drive-simulation-checkbox"
                          checked={driveSimulation}
                          onChange={e => setDriveSimulation(e.target.checked)}
                          style={{ accentColor: 'var(--accent)' }}
                        />
                        <label htmlFor="drive-simulation-checkbox" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          Enable Simulation Mode (Works instantly without custom Client ID/Secret)
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveDriveConfig}>
                          Save Configuration
                        </button>
                        
                        {!driveConfig.connected && !driveConfig.simulation && (
                          <button type="button" className="btn btn-primary btn-sm" onClick={handleConnectDrive}>
                            ⚡ Connect Google Account
                          </button>
                        )}
                        
                        {(driveConfig.connected || driveConfig.simulation) && (
                          <>
                            <button type="button" className="btn btn-primary btn-sm" onClick={handleSyncDrive} disabled={syncingDrive}>
                              {syncingDrive ? 'Syncing...' : '🔄 Sync Codebase to Drive'}
                            </button>
                            <button type="button" className="btn btn-danger btn-sm" onClick={handleDisconnectDrive}>
                              Disconnect
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {(driveConfig.connected || driveConfig.simulation) && (
                      <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>📁 Google Drive File Explorer (Backup Tree)</h4>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: '12px' }} onClick={loadDriveFiles}>
                          Refresh Cloud Explorer
                        </button>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', maxHeight: '300px', overflowY: 'auto' }}>
                          {driveFiles.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)' }}>No files found or refresh needed.</div>
                          ) : (
                            renderDriveTree(driveFiles)
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: BRANDING SETTINGS */}
              {activeSubSection === 'branding' && (
                <div>
                  <h2 className="panel-title">{activeProject.name} Branding</h2>
                  
                  <div className="branding-theme-card glass">
                    <div className="branding-header-row">
                      <span className="branding-label">Theme Customizer</span>
                      {effectiveRole === 'Admin' && !editingBranding && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingBranding(true)}>Edit Theme</button>
                      )}
                    </div>

                    <div className="branding-preview-area">
                      <div className="branding-logo-box">
                        {brandLogo ? (
                          <img src={brandLogo} alt="Brand logo preview" />
                        ) : (
                          <span>No logo</span>
                        )}
                      </div>
                      <div className="branding-colors-wrap">
                        <span className="branding-label" style={{ fontSize: '0.75rem', textAlign: 'center' }}>Brand Colors</span>
                        <div className="branding-swatches">
                          <div className="color-swatch" style={{ backgroundColor: brandColor1 }} />
                          <div className="color-swatch" style={{ backgroundColor: brandColor2 }} />
                        </div>
                        <div className="font-indicator">{brandFont}</div>
                      </div>
                    </div>
                  </div>

                  {editingBranding && effectiveRole === 'Admin' && (
                    <div className="branding-edit-pane glass animate-fade-in">
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>Edit Project Brand Theme</h3>
                      
                      <div className="settings-form-group">
                        <label>Brand Logo (PNG/JPG)</label>
                        <input
                          type="file"
                          accept="image/*"
                          className="input"
                          onChange={handleLogoUpload}
                          style={{ padding: '6px' }}
                        />
                        {brandLogo && (
                          <button className="btn btn-danger btn-sm" style={{ marginTop: '8px' }} onClick={() => setBrandLogo('')}>
                            Remove Logo
                          </button>
                        )}
                      </div>

                      <div className="settings-form-group">
                        <label>Theme Brand Colors</label>
                        <div className="branding-colors-picker">
                          <div className="color-picker-input-group">
                            <span>Primary Gradient Start</span>
                            <input
                              type="color"
                              value={brandColor1}
                              onChange={e => setBrandColor1(e.target.value)}
                            />
                          </div>
                          <div className="color-picker-input-group">
                            <span>Primary Gradient End</span>
                            <input
                              type="color"
                              value={brandColor2}
                              onChange={e => setBrandColor2(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="settings-form-group">
                        <label>Default Font</label>
                        <select 
                          className="input" 
                          value={brandFont}
                          onChange={e => setBrandFont(e.target.value)}
                          style={{ background: 'var(--bg-input)' }}
                        >
                          <option value="Default Font">Default Font (Inter / Outfit)</option>
                          <option value="Roboto">Roboto</option>
                          <option value="Open Sans">Open Sans</option>
                          <option value="Montserrat">Montserrat</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
                        <button className="btn btn-primary" onClick={saveBranding}>Save Branding</button>
                        <button className="btn btn-ghost" onClick={() => {
                          setBrandLogo(activeProject.branding.logo || '')
                          setBrandColor1(activeProject.branding.colors?.[0] || '#a855f7')
                          setBrandColor2(activeProject.branding.colors?.[1] || '#7c3aed')
                          setBrandFont(activeProject.branding.font || 'Default Font')
                          setEditingBranding(false)
                        }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {effectiveRole !== 'Admin' && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '16px' }}>
                      🔒 Only project administrators can change branding themes.
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: MEMBERS SETTINGS */}
              {activeSubSection === 'members' && (
                <div>
                  <h2 className="panel-title">{activeProject.name} Team Members</h2>
                  
                  <div className="members-table-wrap glass">
                    <table className="members-table">
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Access Role</th>
                          {effectiveRole === 'Admin' && <th style={{ width: '80px' }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {projectMembers.map(m => {
                          const isSelf = m.username.toLowerCase() === user.username.toLowerCase()
                          const roleClass = m.role === 'Admin' ? 'role-admin' : m.role === 'Editor' ? 'role-editor' : 'role-viewer'
                          
                          return (
                            <tr key={m.username}>
                              <td style={{ fontWeight: 600 }}>{m.username} {isSelf && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(You)</span>}</td>
                              <td>
                                <span className={`member-role-badge ${roleClass}`}>{m.role}</span>
                              </td>
                              {effectiveRole === 'Admin' && (
                                <td>
                                  {!isSelf && m.username !== activeProject.admin_name && (
                                    <button 
                                      className="btn btn-danger btn-icon btn-sm" 
                                      title="Remove member"
                                      onClick={() => removeMember(m.username)}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {effectiveRole === 'Admin' && (
                    <div className="add-member-form glass">
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Invite/Configure Team Member</h3>
                      <div style={{ marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Enter email ID to invite...
                      </div>
                      <form onSubmit={addMember} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input
                          className="input"
                          style={{ maxWidth: 280 }}
                          placeholder="Enter email ID to invite…"
                          value={newMemberUsername}
                          onChange={e => setNewMemberUsername(e.target.value)}
                          required
                        />
                        <select
                          className="input"
                          style={{ maxWidth: 160, background: 'var(--bg-input)' }}
                          value={newMemberRole}
                          onChange={e => setNewMemberRole(e.target.value as any)}
                        >
                          <option value="Admin">Admin</option>
                          <option value="Editor">Editor</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                        <button type="submit" className="btn btn-primary">Add/Update Member</button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: DOCUMENTS (DEFAULT LISTING) */}
              {activeSubSection === 'documents' && (
                <div>
                  <div className="section-header">
                    <h2 className="section-title">Guides & Documents</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => loadSessions(activeProjectId)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                        Refresh
                      </button>
                      {effectiveRole !== 'Viewer' && (
                        <button id="new-guide-btn" className="btn btn-primary btn-sm" onClick={() => setCreatingSession(true)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                          New Guide
                        </button>
                      )}
                    </div>
                  </div>

                  {creatingSession && effectiveRole !== 'Viewer' && (
                    <div className="create-form glass animate-fade-in">
                      <div className="create-form-inner">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        <input
                          id="guide-name-input"
                          className="input"
                          placeholder="Enter a name for this guide (optional)…"
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') createSession(); if (e.key === 'Escape') setCreatingSession(false) }}
                          autoFocus
                        />
                        <button id="create-guide-btn" className="btn btn-primary" onClick={createSession}>Create & Record</button>
                        <button className="btn btn-ghost" onClick={() => setCreatingSession(false)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {loadingSessions ? (
                    <div className="sessions-grid">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="session-card-skeleton glass">
                          <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 12 }} />
                          <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 8 }} />
                          <div className="skeleton" style={{ height: 14, width: '30%' }} />
                        </div>
                      ))}
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="empty-sessions">
                      <div className="empty-sessions-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                      </div>
                      <p>No guides in this project yet. {effectiveRole !== 'Viewer' ? 'Click New Guide to start recording.' : ''}</p>
                    </div>
                  ) : (
                    <div className="sessions-grid">
                      {sessions.map(session => (
                        <div
                          key={session.id}
                          id={`session-${session.id.slice(0, 8)}`}
                          className="session-card glass animate-fade-in"
                          onClick={() => openEditorById(session.id)}
                        >
                          <div className="session-card-top">
                            <div className="session-thumb">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                              </svg>
                            </div>
                            {effectiveRole !== 'Viewer' && (
                              <button
                                className="btn btn-danger btn-icon btn-sm"
                                title="Delete guide"
                                onClick={e => deleteSession(session.id, e)}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                              </button>
                            )}
                          </div>
                          <div className="session-name">{session.name}</div>
                          <div className="session-meta">
                            <span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                              {session.steps.length} steps
                            </span>
                            <span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                              {fmtDate(session.updated_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-sessions">
              <p>Please select or expand a team project from the sidebar.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
