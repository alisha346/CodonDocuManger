export interface Step {
  id: string
  order: number
  type: 'click' | 'type' | 'scroll'
  description: string
  app_name: string
  window_title: string
  x: number
  y: number
  typed_text?: string
  screenshot?: string | null
  timestamp: number
}

export interface Session {
  id: string
  name: string
  project_id?: string
  created_at: number
  updated_at: number
  steps: Step[]
}

export interface User {
  username: string
  email: string
  global_role: 'Admin' | 'User'
  verified?: boolean
}

export interface ProjectMember {
  username: string
  role: 'Admin' | 'Editor' | 'Viewer'
}

export interface ProjectBranding {
  logo: string
  colors: string[]
  font: string
}

export interface Project {
  id: string
  name: string
  team_url: string
  admin_name: string
  branding: ProjectBranding
  members: ProjectMember[]
}

export interface DriveConfig {
  client_id: string
  client_secret: string
  connected: boolean
  simulation: boolean
  user_email: string
}

export interface DriveFileNode {
  name: string
  type: 'file' | 'folder'
  mimeType?: string
  size?: string
  modifiedTime?: string
  children?: DriveFileNode[]
}
