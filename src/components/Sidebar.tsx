import React from 'react';
import { 
  LayoutDashboard, 
  PlayCircle, 
  Image, 
  Bug, 
  FileText, 
  Terminal,
  Shield
} from 'lucide-react';
import type { UserRole } from '../services/mockDataService';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  currentRole: UserRole;
  runningCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  setActiveView, 
  currentRole,
  runningCount 
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'executions', label: 'Executions', icon: PlayCircle, badge: runningCount > 0 ? 'running' : undefined },
    { id: 'screenshots', label: 'Screenshot Gallery', icon: Image },
    { id: 'defects', label: 'Defect Tracker', icon: Bug },
    { id: 'reports', label: 'Reports & Export', icon: FileText }
  ];

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'Admin': return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
      case 'QA Lead': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      case 'Automation Engineer': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'Viewer': return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    }
  };

  return (
    <aside className="w-64 flex flex-col h-[calc(100vh-2rem)] glass-panel p-4 sticky top-4">
      {/* Logo Area */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-white/5 mb-6">
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
          <Terminal size={20} className="glow-blue" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide">HYPERION QA</h1>
          <span className="text-[10px] text-slate-500 font-mono font-bold tracking-widest uppercase">AUTOMATION HUB</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 space-y-1.5">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={isActive ? 'glow-blue' : 'text-slate-400 group-hover:text-slate-200'} />
                <span>{item.label}</span>
              </div>
              
              {item.badge === 'running' && (
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping absolute right-4" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User / Role Profile panel */}
      <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-3">
        <div className="flex items-center gap-3 px-2">
          <div className="p-2 rounded-full bg-white/5 border border-white/10 text-slate-300">
            <Shield size={16} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold">Current Profile</div>
            <div className="text-xs text-slate-500 font-semibold font-mono">Aaditya H.</div>
          </div>
        </div>
        
        {/* Role Badge */}
        <div className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold text-center font-mono uppercase tracking-wider ${getRoleColor(currentRole)}`}>
          {currentRole}
        </div>
      </div>
    </aside>
  );
};
