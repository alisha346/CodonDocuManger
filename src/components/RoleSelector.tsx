import React, { useState } from 'react';
import { ShieldAlert, ChevronDown, Check, X } from 'lucide-react';
import type { UserRole } from '../services/mockDataService';

interface RoleSelectorProps {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
}

export const checkPermission = (role: UserRole, action: 'trigger_run' | 'manage_defect' | 'delete_execution' | 'edit_env'): boolean => {
  switch (role) {
    case 'Admin':
      return true; // Full access
    case 'QA Lead':
      // QA Lead can trigger runs, manage defects, but cannot delete executions or edit system configurations
      return action !== 'delete_execution' && action !== 'edit_env';
    case 'Automation Engineer':
      // Engineer can trigger runs, link/file defects, but cannot delete runs, edit system configurations, or close critical defects
      return action === 'trigger_run' || action === 'manage_defect';
    case 'Viewer':
      // Viewer has read-only access
      return false;
  }
};

export const RoleSelector: React.FC<RoleSelectorProps> = ({ currentRole, setCurrentRole }) => {
  const [isOpen, setIsOpen] = useState(false);

  const roles: { name: UserRole; desc: string; permissions: { name: string; allowed: boolean }[] }[] = [
    {
      name: 'Admin',
      desc: 'Full administrative access',
      permissions: [
        { name: 'Trigger & Rerun Tests', allowed: true },
        { name: 'Manage & Resolve Defects', allowed: true },
        { name: 'Delete Executions', allowed: true },
        { name: 'Configure Environments', allowed: true }
      ]
    },
    {
      name: 'QA Lead',
      desc: 'Team manager profile',
      permissions: [
        { name: 'Trigger & Rerun Tests', allowed: true },
        { name: 'Manage & Resolve Defects', allowed: true },
        { name: 'Delete Executions', allowed: false },
        { name: 'Configure Environments', allowed: false }
      ]
    },
    {
      name: 'Automation Engineer',
      desc: 'Technical SDET profile',
      permissions: [
        { name: 'Trigger & Rerun Tests', allowed: true },
        { name: 'Manage & Resolve Defects', allowed: true },
        { name: 'Delete Executions', allowed: false },
        { name: 'Configure Environments', allowed: false }
      ]
    },
    {
      name: 'Viewer',
      desc: 'Read-only business user',
      permissions: [
        { name: 'Trigger & Rerun Tests', allowed: false },
        { name: 'Manage & Resolve Defects', allowed: false },
        { name: 'Delete Executions', allowed: false },
        { name: 'Configure Environments', allowed: false }
      ]
    }
  ];

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-mono font-semibold"
      >
        <ShieldAlert size={14} className="text-blue-400 glow-blue" />
        <span>Switch Role ({currentRole})</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-185' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 glass-modal p-4 border border-white/10 shadow-2xl fade-in">
          <h3 className="text-xs font-bold font-mono tracking-widest text-slate-400 mb-3 uppercase border-b border-white/5 pb-2">
            SELECT USER ROLE
          </h3>
          
          <div className="space-y-2 mb-3">
            {roles.map(r => (
              <button
                key={r.name}
                onClick={() => {
                  setCurrentRole(r.name);
                  setIsOpen(false);
                }}
                className={`w-full text-left p-2.5 rounded-lg transition-all border ${
                  currentRole === r.name
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                    : 'border-transparent hover:bg-white/5 text-slate-300'
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider">{r.name}</span>
                  {currentRole === r.name && <Check size={12} className="text-blue-400" />}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold">{r.desc}</div>
              </button>
            ))}
          </div>

          <div className="border-t border-white/5 pt-3 mt-1">
            <h4 className="text-[10px] font-bold font-mono text-slate-400 mb-2 uppercase">
              Current Role Permissions
            </h4>
            <div className="space-y-1">
              {roles
                .find(r => r.name === currentRole)
                ?.permissions.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-slate-400">{p.name}</span>
                    {p.allowed ? (
                      <span className="flex items-center gap-0.5 text-emerald-400 font-bold uppercase font-mono">
                        <Check size={10} /> Allow
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-rose-400 font-bold uppercase font-mono">
                        <X size={10} /> Deny
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
