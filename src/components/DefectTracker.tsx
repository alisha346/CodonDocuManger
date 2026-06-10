import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  User, 
  Calendar, 
  Link2,
  PieChart as ChartIcon,
  Activity
} from 'lucide-react';
import { 
  saveDefect, 
  deleteDefect 
} from '../services/mockDataService';
import type { 
  Defect, 
  UserRole 
} from '../services/mockDataService';
import { checkPermission } from './RoleSelector';
import { Doughnut, Bar } from 'react-chartjs-2';

interface DefectTrackerProps {
  defects: Defect[];
  currentRole: UserRole;
  onUpdateDefects: (defects: Defect[]) => void;
}

export const DefectTracker: React.FC<DefectTrackerProps> = ({
  defects,
  currentRole,
  onUpdateDefects
}) => {
  // Filters
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form states (Create/Edit Modal)
  const [showModal, setShowModal] = useState(false);
  const [editingDefect, setEditingDefect] = useState<Defect | null>(null);
  
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [severity, setSeverity] = useState<'Blocker' | 'Major' | 'Minor' | 'Trivial'>('Major');
  const [status, setStatus] = useState<'Open' | 'In Progress' | 'Resolved' | 'Closed'>('Open');
  const [owner, setOwner] = useState('Unassigned');

  // Open modal for new defect
  const handleOpenCreate = () => {
    if (!checkPermission(currentRole, 'manage_defect')) {
      alert(`Permission Denied: ${currentRole} cannot file defects.`);
      return;
    }
    setEditingDefect(null);
    setTitle('');
    setPriority('High');
    setSeverity('Major');
    setStatus('Open');
    setOwner('Aaditya H. (QA)');
    setShowModal(true);
  };

  // Open modal for editing
  const handleOpenEdit = (defect: Defect) => {
    if (!checkPermission(currentRole, 'manage_defect')) {
      alert(`Permission Denied: ${currentRole} cannot edit defects.`);
      return;
    }
    setEditingDefect(defect);
    setTitle(defect.title);
    setPriority(defect.priority);
    setSeverity(defect.severity);
    setStatus(defect.status);
    setOwner(defect.owner);
    setShowModal(true);
  };

  // Save defect
  const handleSaveDefect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const defectToSave: Defect = editingDefect 
      ? {
          ...editingDefect,
          title,
          priority,
          severity,
          status,
          owner,
          resolutionDate: status === 'Closed' || status === 'Resolved' 
            ? new Date().toISOString() 
            : undefined
        }
      : {
          id: `DEF-${100 + defects.length + 1}`,
          title,
          priority,
          severity,
          status,
          owner,
          linkedTestCases: [],
          linkedExecutions: [],
          creationDate: new Date().toISOString()
        };

    const updated = saveDefect(defectToSave);
    onUpdateDefects(updated);
    setShowModal(false);
  };

  // Delete defect
  const handleDeleteDefect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop edit modal from firing
    
    if (!checkPermission(currentRole, 'manage_defect')) {
      alert(`Permission Denied: ${currentRole} cannot delete defects.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete defect ${id}?`)) {
      const updated = deleteDefect(id);
      onUpdateDefects(updated);
    }
  };

  // Filter defects
  const filteredDefects = defects.filter(def => {
    const matchPriority = filterPriority ? def.priority === filterPriority : true;
    const matchStatus = filterStatus ? def.status === filterStatus : true;
    return matchPriority && matchStatus;
  });

  // Calculate metrics
  const openCount = defects.filter(d => d.status === 'Open' || d.status === 'In Progress').length;
  const closedCount = defects.filter(d => d.status === 'Closed').length;
  const resolvedCount = defects.filter(d => d.status === 'Resolved').length;

  // --- Charts configurations ---
  
  // 1. Priority stats (Bar)
  const priorityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  defects.forEach(d => {
    priorityCounts[d.priority]++;
  });

  const barChartData = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [
      {
        label: 'Defects Count',
        data: [priorityCounts.Critical, priorityCounts.High, priorityCounts.Medium, priorityCounts.Low],
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)', // Critical -> red
          'rgba(249, 115, 22, 0.7)', // High -> orange
          'rgba(245, 158, 11, 0.7)', // Medium -> yellow
          'rgba(16, 185, 129, 0.7)'  // Low -> green
        ],
        borderWidth: 0,
        borderRadius: 4
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, color: '#64748b', font: { family: 'Fira Code' } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      x: {
        ticks: { color: '#64748b', font: { family: 'Fira Code' } },
        grid: { display: false }
      }
    }
  };

  // 2. Status stats (Doughnut)
  const statusCounts = { Open: 0, 'In Progress': 0, Resolved: 0, Closed: 0 };
  defects.forEach(d => {
    statusCounts[d.status]++;
  });

  const doughnutChartData = {
    labels: ['Open', 'In Progress', 'Resolved', 'Closed'],
    datasets: [
      {
        data: [statusCounts.Open, statusCounts['In Progress'], statusCounts.Resolved, statusCounts.Closed],
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(6, 182, 212, 0.7)',
          'rgba(16, 185, 129, 0.7)'
        ],
        borderColor: 'rgba(15, 23, 42, 0.8)',
        borderWidth: 2
      }
    ]
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#e2e8f0',
          font: { family: 'Fira Sans', size: 10 }
        }
      }
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-white">Defect Tracker</h2>
          <p className="text-slate-400 text-xs mt-0.5">Manage, categorize, and track active bugs linked directly to failing automated tests.</p>
        </div>
        
        <button
          onClick={handleOpenCreate}
          className="btn btn-primary text-xs px-3.5 py-2 font-mono"
        >
          <Plus size={14} />
          FILE NEW DEFECT
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card text-center p-3.5 border-l-4 border-l-rose-500">
          <div className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Active Open</div>
          <div className="text-xl font-bold font-mono mt-1 text-rose-400 glow-red">{openCount}</div>
        </div>
        <div className="glass-card text-center p-3.5 border-l-4 border-l-blue-500">
          <div className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">In Progress</div>
          <div className="text-xl font-bold font-mono mt-1 text-blue-400 glow-blue">{statusCounts['In Progress']}</div>
        </div>
        <div className="glass-card text-center p-3.5 border-l-4 border-l-cyan-500">
          <div className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Resolved</div>
          <div className="text-xl font-bold font-mono mt-1 text-cyan-400 glow-blue">{resolvedCount}</div>
        </div>
        <div className="glass-card text-center p-3.5 border-l-4 border-l-emerald-500">
          <div className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Closed</div>
          <div className="text-xl font-bold font-mono mt-1 text-emerald-400 glow-green">{closedCount}</div>
        </div>
      </div>

      {/* Split Charts & List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts panel (Left) */}
        <div className="space-y-4">
          {/* Priority graph */}
          <div className="glass-card flex flex-col h-[210px] p-4.5">
            <h3 className="text-[10px] font-bold font-mono text-slate-400 tracking-wider uppercase mb-2 flex items-center gap-1.5">
              <ChartIcon size={12} />
              Defects by Priority
            </h3>
            <div className="flex-1 relative">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>

          {/* Status Donut */}
          <div className="glass-card flex flex-col h-[210px] p-4.5">
            <h3 className="text-[10px] font-bold font-mono text-slate-400 tracking-wider uppercase mb-2 flex items-center gap-1.5">
              <Activity size={12} />
              Defects by Status
            </h3>
            <div className="flex-1 relative flex items-center justify-center">
              <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
            </div>
          </div>
        </div>

        {/* Database List (Right) */}
        <div className="glass-card lg:col-span-2 flex flex-col h-[436px]">
          {/* Filter options */}
          <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
            <h3 className="text-xs font-bold font-mono text-slate-400 tracking-wider uppercase">
              Defects Inventory ({filteredDefects.length})
            </h3>
            
            <div className="flex gap-2.5">
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="select-input text-[10px] py-1 px-2 w-28"
              >
                <option value="">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="select-input text-[10px] py-1 px-2 w-28"
              >
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Defects list scrollable */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredDefects.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-semibold italic text-xs">
                No filed defects match the filters.
              </div>
            ) : (
              filteredDefects.map(def => {
                const getPriorityBadge = (p: string) => {
                  switch (p) {
                    case 'Critical': return 'badge-failed font-bold glow-red';
                    case 'High': return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
                    case 'Medium': return 'badge-skipped font-bold';
                    default: return 'badge-passed font-bold';
                  }
                };

                const getStatusBadge = (s: string) => {
                  switch (s) {
                    case 'Open': return 'badge-failed';
                    case 'In Progress': return 'badge-running';
                    case 'Resolved': return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400';
                    default: return 'badge-passed';
                  }
                };

                return (
                  <div
                    key={def.id}
                    onClick={() => handleOpenEdit(def)}
                    className="p-3 rounded-lg border border-white/5 bg-white/2 hover:bg-white/5 transition-all cursor-pointer flex justify-between items-start gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/5 px-2 py-0.5 border border-amber-500/20 rounded">
                          {def.id}
                        </span>
                        <h4 className="font-bold text-slate-200 text-xs truncate">{def.title}</h4>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 font-semibold font-mono">
                        <div className="flex items-center gap-1">
                          <User size={11} className="text-slate-500" />
                          <span>Owner: {def.owner}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={11} className="text-slate-500" />
                          <span>Filed: {new Date(def.creationDate).toLocaleDateString()}</span>
                        </div>
                        {def.linkedTestCases.length > 0 && (
                          <div className="flex items-center gap-1 text-slate-400">
                            <Link2 size={11} className="text-slate-500" />
                            <span>Linked: {def.linkedTestCases.length} Tests</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`badge scale-80 ${getPriorityBadge(def.priority)}`}>
                        {def.priority}
                      </span>
                      <span className={`badge scale-80 ${getStatusBadge(def.status)}`}>
                        {def.status}
                      </span>
                      <button
                        onClick={(e) => handleDeleteDefect(def.id, e)}
                        className="text-slate-500 hover:text-rose-400 p-1 hover:bg-white/5 rounded transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* CREATE/EDIT DEFECT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form 
            onSubmit={handleSaveDefect}
            className="w-full max-w-md glass-modal p-6 fade-in border border-white/10"
          >
            <h3 className="text-sm font-bold font-mono tracking-widest text-slate-400 mb-4 uppercase border-b border-white/5 pb-2">
              {editingDefect ? `EDIT DEFECT: ${editingDefect.id}` : 'FILE NEW AUTOMATION DEFECT'}
            </h3>

            <div className="space-y-4 mb-6">
              {/* Title Input */}
              <div>
                <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Defect Title / Summary
                </label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="text-input text-xs"
                  placeholder="e.g. Broken navigation link on login panel"
                  required
                />
              </div>

              {/* Priority & Severity Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1">
                    Priority
                  </label>
                  <select 
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="select-input text-xs"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1">
                    Severity
                  </label>
                  <select 
                    value={severity}
                    onChange={e => setSeverity(e.target.value as any)}
                    className="select-input text-xs"
                  >
                    <option value="Blocker">Blocker</option>
                    <option value="Major">Major</option>
                    <option value="Minor">Minor</option>
                    <option value="Trivial">Trivial</option>
                  </select>
                </div>
              </div>

              {/* Status & Owner Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1">
                    Status
                  </label>
                  <select 
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="select-input text-xs"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1">
                    Assigned Owner
                  </label>
                  <input 
                    type="text" 
                    value={owner}
                    onChange={e => setOwner(e.target.value)}
                    className="text-input text-xs"
                    placeholder="e.g. John Doe (Dev)"
                  />
                </div>
              </div>

              {/* Linked Test Info (Read-only if editing) */}
              {editingDefect && editingDefect.linkedTestCases.length > 0 && (
                <div className="border border-white/5 bg-white/2 rounded-lg p-2.5">
                  <div className="text-[9px] font-mono font-bold text-slate-500 mb-1">LINKED FAILURE TEST CASE</div>
                  <div className="space-y-1">
                    {editingDefect.linkedTestCases.map((lnk, i) => (
                      <div key={i} className="text-[9px] font-mono text-slate-400 font-bold truncate">
                        • {lnk.executionId} / {lnk.testCaseId}: {lnk.testCaseName}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3.5 border-t border-white/5 pt-4">
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="btn btn-secondary text-xs px-3.5 py-2 font-mono"
              >
                CANCEL
              </button>
              <button 
                type="submit"
                className="btn btn-primary text-xs px-3.5 py-2 font-mono"
              >
                SAVE CHANGES
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
