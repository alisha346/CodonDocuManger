import type { Session, Project, ProjectMember, User, DriveConfig, DriveFileNode } from './types'

const BASE = '/api'

function getHeaders(): HeadersInit {
  const userJson = localStorage.getItem('user')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (userJson) {
    try {
      const u = JSON.parse(userJson)
      headers['X-User-Username'] = u.username
    } catch (_) {}
  }
  return headers
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ ok: boolean; user: User }> {
    const r = await fetch(`${BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    if (!r.ok) {
      throw new Error('Invalid credentials')
    }
    return r.json()
  },

  async signup(username: string, password: string, email: string): Promise<{ ok: boolean; user: User }> {
    const r = await fetch(`${BASE}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email })
    })
    if (!r.ok) {
      const errData = await r.json().catch(() => ({}))
      throw new Error(errData.detail || 'Registration failed')
    }
    return r.json()
  },

  // Projects
  async listProjects(username: string): Promise<Project[]> {
    const r = await fetch(`${BASE}/projects?username=${encodeURIComponent(username)}`, {
      headers: getHeaders()
    })
    return r.json()
  },

  async createProject(name: string, creator: string): Promise<Project> {
    const r = await fetch(`${BASE}/projects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, creator })
    })
    return r.json()
  },

  async deleteProject(id: string): Promise<void> {
    await fetch(`${BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
  },

  async updateProjectSettings(id: string, name: string, teamUrl: string, adminName: string): Promise<Project> {
    const r = await fetch(`${BASE}/projects/${id}/settings`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ name, team_url: teamUrl, admin_name: adminName })
    })
    return r.json()
  },

  async updateProjectBranding(id: string, logo: string, colors: string[], font: string): Promise<Project> {
    const r = await fetch(`${BASE}/projects/${id}/branding`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ logo, colors, font })
    })
    return r.json()
  },

  // Members
  async getMembers(projectId: string): Promise<ProjectMember[]> {
    const r = await fetch(`${BASE}/projects/${projectId}/members`, {
      headers: getHeaders()
    })
    return r.json()
  },

  async addMember(projectId: string, username: string, role: string): Promise<Project> {
    const r = await fetch(`${BASE}/projects/${projectId}/members`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, role })
    })
    return r.json()
  },

  async removeMember(projectId: string, username: string): Promise<Project> {
    const r = await fetch(`${BASE}/projects/${projectId}/members/${username}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    return r.json()
  },

  // Sessions
  async listSessions(projectId?: string): Promise<Session[]> {
    const url = projectId ? `${BASE}/sessions?project_id=${projectId}` : `${BASE}/sessions`
    const r = await fetch(url, {
      headers: getHeaders()
    })
    return r.json()
  },

  async getSession(id: string): Promise<Session> {
    const r = await fetch(`${BASE}/sessions/${id}`, {
      headers: getHeaders()
    })
    return r.json()
  },

  async createSession(name: string, projectId: string): Promise<Session> {
    const r = await fetch(`${BASE}/sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, project_id: projectId }),
    })
    return r.json()
  },

  async renameSession(id: string, name: string): Promise<Session> {
    const r = await fetch(`${BASE}/sessions/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ name }),
    })
    return r.json()
  },

  async deleteSession(id: string): Promise<void> {
    await fetch(`${BASE}/sessions/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
  },

  // Recording
  async startRecording(id: string, mode: 'screen' | 'browser' = 'screen'): Promise<void> {
    await fetch(`${BASE}/sessions/${id}/start?mode=${mode}`, {
      method: 'POST',
      headers: getHeaders()
    })
  },

  async stopRecording(id: string): Promise<void> {
    await fetch(`${BASE}/sessions/${id}/stop`, {
      method: 'POST',
      headers: getHeaders()
    })
  },

  async recordingStatus(): Promise<{ active: boolean }> {
    const r = await fetch(`${BASE}/recording/status`, {
      headers: getHeaders()
    })
    return r.json()
  },

  // Steps
  async updateStep(sessionId: string, stepId: string, description: string): Promise<void> {
    await fetch(`${BASE}/sessions/${sessionId}/steps/${stepId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ description }),
    })
  },

  async deleteStep(sessionId: string, stepId: string): Promise<void> {
    await fetch(`${BASE}/sessions/${sessionId}/steps/${stepId}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
  },

  async reorderSteps(sessionId: string, stepIds: string[]): Promise<void> {
    await fetch(`${BASE}/sessions/${sessionId}/steps/reorder`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ step_ids: stepIds }),
    })
  },

  // Export
  exportHtmlUrl(id: string): string {
    return `${BASE}/sessions/${id}/export/html`
  },

  exportMarkdownUrl(id: string): string {
    return `${BASE}/sessions/${id}/export/markdown`
  },

  // Screenshot
  screenshotUrl(sessionId: string, filename: string): string {
    return `${BASE}/screenshots/${sessionId}/${filename}`
  },

  // Google Drive
  async getDriveConfig(): Promise<DriveConfig> {
    const r = await fetch(`${BASE}/drive/config`, { headers: getHeaders() })
    return r.json()
  },
  async saveDriveConfig(client_id: string, client_secret: string, simulation: boolean): Promise<void> {
    await fetch(`${BASE}/drive/config`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ client_id, client_secret, simulation })
    })
  },
  async getDriveAuthUrl(client_id: string): Promise<string> {
    const r = await fetch(`${BASE}/drive/auth?client_id=${encodeURIComponent(client_id)}`, { headers: getHeaders() })
    const data = await r.json()
    return data.url
  },
  async getDriveFiles(): Promise<DriveFileNode[]> {
    const r = await fetch(`${BASE}/drive/files`, { headers: getHeaders() })
    return r.json()
  },
  async syncDrive(): Promise<{ success: boolean; error?: string }> {
    const r = await fetch(`${BASE}/drive/sync`, { method: 'POST', headers: getHeaders() })
    return r.json()
  },
  async disconnectDrive(): Promise<void> {
    await fetch(`${BASE}/drive/disconnect`, { method: 'POST', headers: getHeaders() })
  }
}
