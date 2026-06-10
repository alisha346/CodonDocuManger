import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Terminal, 
  AlertCircle, 
  Eye, 
  Link, 
  Bug, 
  Clock, 
  Layers, 
  HardDrive,
  Cpu,
  Plus
} from 'lucide-react';
import { 
  getDefects, 
  saveDefect 
} from '../services/mockDataService';
import type { 
  Execution, 
  UserRole, 
  Defect 
} from '../services/mockDataService';
import { checkPermission } from './RoleSelector';

interface TestCaseDetailsProps {
  execution: Execution;
  onBack: () => void;
  currentRole: UserRole;
  defects: Defect[];
  onUpdateDefects: (defects: Defect[]) => void;
  onPreviewImage: (src: string, name: string) => void;
}

export const TestCaseDetails: React.FC<TestCaseDetailsProps> = ({
  execution,
  onBack,
  currentRole,
  defects,
  onUpdateDefects,
  onPreviewImage
}) => {
  const [selectedTCId, setSelectedTCId] = useState<string | null>(
    execution.testCases.length > 0 ? execution.testCases[0].id : null
  );
  
  // Left side filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Defect link form states
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkDefectId, setLinkDefectId] = useState('');
  
  // Defect file form states
  const [showFileForm, setShowFileForm] = useState(false);
  const [newDefectTitle, setNewDefectTitle] = useState('');
  const [newDefectPriority, setNewDefectPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [newDefectSeverity, setNewDefectSeverity] = useState<'Blocker' | 'Major' | 'Minor' | 'Trivial'>('Major');

  // Filtered test cases
  const filteredTCs = execution.testCases.filter(tc => {
    const matchSearch = tc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        tc.module.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter ? tc.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const selectedTC = execution.testCases.find(t => t.id === selectedTCId);

  // Link existing defect to test
  const handleLinkDefect = () => {
    if (!linkDefectId) return;
    if (!selectedTC) return;
    
    if (!checkPermission(currentRole, 'manage_defect')) {
      alert(`Permission Denied: ${currentRole} cannot modify defects.`);
      return;
    }

    const currentDefects = getDefects();
    const defect = currentDefects.find(d => d.id === linkDefectId);
    
    if (defect) {
      // Check if already linked
      const alreadyLinked = defect.linkedTestCases.some(
        lnk => lnk.testCaseId === selectedTC.id && lnk.executionId === execution.id
      );
      
      if (!alreadyLinked) {
        defect.linkedTestCases.push({
          testCaseId: selectedTC.id,
          executionId: execution.id,
          testCaseName: selectedTC.name
        });
        if (!defect.linkedExecutions.includes(execution.id)) {
          defect.linkedExecutions.push(execution.id);
        }
        
        const updated = saveDefect(defect);
        onUpdateDefects(updated);
      }
      setShowLinkForm(false);
      setLinkDefectId('');
    } else {
      alert(`Defect with ID ${linkDefectId} was not found.`);
    }
  };

  // Create new defect and link
  const handleFileDefect = () => {
    if (!newDefectTitle) return;
    if (!selectedTC) return;

    if (!checkPermission(currentRole, 'manage_defect')) {
      alert(`Permission Denied: ${currentRole} cannot file defects.`);
      return;
    }

    const nextDefectId = `DEF-${100 + defects.length + 1}`;
    
    const newDefect: Defect = {
      id: nextDefectId,
      title: newDefectTitle,
      priority: newDefectPriority,
      severity: newDefectSeverity,
      status: 'Open',
      linkedTestCases: [{
        testCaseId: selectedTC.id,
        executionId: execution.id,
        testCaseName: selectedTC.name
      }],
      linkedExecutions: [execution.id],
      owner: 'Unassigned',
      creationDate: new Date().toISOString()
    };

    const updated = saveDefect(newDefect);
    onUpdateDefects(updated);
    
    setShowFileForm(false);
    setNewDefectTitle('');
  };

  // Find linked defects for selected test case
  const getLinkedDefects = () => {
    if (!selectedTC) return [];
    return defects.filter(d => 
      d.linkedTestCases.some(
        lnk => lnk.testCaseId === selectedTC.id && lnk.executionId === execution.id
      )
    );
  };

  const linkedDefects = getLinkedDefects();

  return (
    <div className="space-y-4 fade-in">
      {/* Top action navbar */}
      <div className="glass-panel flex flex-col md:flex-row justify-between items-start md:items-center p-4 gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span>Execution Inspector: {execution.id}</span>
              <span className={`badge ${execution.status === 'Passed' ? 'badge-passed' : 'badge-failed'}`}>
                {execution.status}
              </span>
            </h3>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Build: {execution.build} | Date: {new Date(execution.date).toLocaleString()} | Triggerer: {execution.triggeredBy}
            </div>
          </div>
        </div>

        {/* Environment summary tags */}
        <div className="flex flex-wrap gap-2 text-[10px] font-mono font-bold text-slate-400">
          <div className="px-2.5 py-1.5 rounded bg-white/5 border border-white/8 flex items-center gap-1.5">
            <Layers size={11} className="text-blue-400" />
            <span>Env: {execution.environment.name}</span>
          </div>
          <div className="px-2.5 py-1.5 rounded bg-white/5 border border-white/8 flex items-center gap-1.5">
            <HardDrive size={11} className="text-indigo-400" />
            <span>OS: {execution.environment.os.split(',')[0]}</span>
          </div>
          <div className="px-2.5 py-1.5 rounded bg-white/5 border border-white/8 flex items-center gap-1.5">
            <Cpu size={11} className="text-cyan-400" />
            <span>Browser: {execution.environment.browser.split(',')[0]}</span>
          </div>
        </div>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-10rem)]">
        {/* Left Side: Test Cases List */}
        <div className="glass-card flex flex-col h-full p-4.5">
          {/* Header search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Search test or module..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="text-input pl-9 text-xs py-2"
            />
          </div>

          {/* Status selector */}
          <div className="flex gap-1.5 mb-3 border-b border-white/5 pb-3">
            {['', 'Passed', 'Failed', 'Skipped'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono uppercase transition-colors ${
                  statusFilter === status 
                    ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400' 
                    : 'bg-white/5 border border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {status || 'All'}
              </button>
            ))}
          </div>

          {/* Test cases list scrollable */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredTCs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-semibold italic text-xs">
                No tests match search criteria.
              </div>
            ) : (
              filteredTCs.map(tc => {
                const isSelected = tc.id === selectedTCId;
                return (
                  <button
                    key={tc.id}
                    onClick={() => setSelectedTCId(tc.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex justify-between items-center ${
                      isSelected 
                        ? 'bg-blue-500/10 border-blue-500/35 text-blue-400' 
                        : 'border-transparent hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="font-bold truncate">{tc.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {tc.id} | Module: {tc.module}
                      </div>
                    </div>
                    
                    <span className={`badge shrink-0 scale-90 ${
                      tc.status === 'Passed' ? 'badge-passed' : tc.status === 'Failed' ? 'badge-failed' : 'badge-skipped'
                    }`}>
                      {tc.status.charAt(0)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Selected Test Case Details */}
        <div className="glass-card lg:col-span-2 flex flex-col h-full overflow-hidden p-4.5">
          {selectedTC ? (
            <div className="flex flex-col h-full overflow-y-auto pr-1 space-y-4">
              {/* Header Title details */}
              <div className="border-b border-white/5 pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-bold text-white text-base">{selectedTC.name}</h4>
                    <span className="text-[10px] font-bold font-mono text-slate-500">
                      ID: {selectedTC.id} | Module: {selectedTC.module}
                    </span>
                  </div>
                  <span className={`badge ${
                    selectedTC.status === 'Passed' ? 'badge-passed' : selectedTC.status === 'Failed' ? 'badge-failed' : 'badge-skipped'
                  }`}>
                    {selectedTC.status}
                  </span>
                </div>
                
                <p className="text-slate-400 text-xs mt-2 font-medium">
                  {selectedTC.description}
                </p>
              </div>

              {/* Grid with metadata (Duration, screenshots thumb, Linked defects) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Meta details */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col justify-center">
                  <div className="text-[10px] font-mono text-slate-500 font-bold mb-1">Execution Metrics</div>
                  <div className="flex items-center gap-2 text-slate-300 font-mono text-xs font-semibold">
                    <Clock size={13} className="text-slate-500" />
                    <span>Duration: {selectedTC.duration}ms</span>
                  </div>
                </div>

                {/* Screenshot preview */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="text-[10px] font-mono text-slate-500 font-bold mb-1.5">Screenshots</div>
                  {selectedTC.screenshots && selectedTC.screenshots.length > 0 ? (
                    <div className="relative group overflow-hidden rounded border border-white/10 h-10 w-20 cursor-pointer">
                      <img 
                        src={selectedTC.screenshots[0]} 
                        alt="Test Screenshot" 
                        className="object-cover w-full h-full"
                      />
                      <button 
                        onClick={() => onPreviewImage(selectedTC.screenshots[0], selectedTC.name)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                      >
                        <Eye size={12} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-600 font-semibold italic">No captures</span>
                  )}
                </div>

                {/* Linked defects list */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono text-slate-500 font-bold">Linked Defects</span>
                    <Bug size={11} className="text-amber-500" />
                  </div>
                  
                  <div className="space-y-1 max-h-16 overflow-y-auto mb-1">
                    {linkedDefects.length === 0 ? (
                      <span className="text-[10px] text-slate-600 font-semibold italic">None linked</span>
                    ) : (
                      linkedDefects.map(def => (
                        <div key={def.id} className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1.5">
                          <AlertCircle size={10} />
                          <span>{def.id} ({def.status})</span>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedTC.status === 'Failed' && (
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => { setShowLinkForm(true); setShowFileForm(false); }}
                        className="text-[9px] font-bold font-mono text-blue-400 hover:underline flex items-center gap-0.5"
                      >
                        <Link size={8} /> Link Defect
                      </button>
                      <button 
                        onClick={() => { setShowFileForm(true); setShowLinkForm(false); }}
                        className="text-[9px] font-bold font-mono text-rose-400 hover:underline flex items-center gap-0.5"
                      >
                        <Plus size={8} /> File Defect
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline Link/File forms */}
              {showLinkForm && (
                <div className="bg-blue-950/10 border border-blue-500/20 rounded-lg p-3 text-xs">
                  <div className="font-bold text-blue-300 mb-2">Link Existing Defect</div>
                  <div className="flex gap-2">
                    <select
                      value={linkDefectId}
                      onChange={e => setLinkDefectId(e.target.value)}
                      className="select-input text-xs py-1 px-2.5 flex-1"
                    >
                      <option value="">Select Defect ID</option>
                      {defects
                        .filter(d => d.status !== 'Closed')
                        .map(d => (
                          <option key={d.id} value={d.id}>{d.id}: {d.title.slice(0, 35)}...</option>
                        ))}
                    </select>
                    <button 
                      onClick={handleLinkDefect}
                      className="btn btn-primary py-1 px-3.5 text-xs font-mono"
                    >
                      LINK
                    </button>
                    <button 
                      onClick={() => setShowLinkForm(false)}
                      className="btn btn-secondary py-1 px-3.5 text-xs font-mono"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {showFileForm && (
                <div className="bg-rose-950/10 border border-rose-500/20 rounded-lg p-3 text-xs space-y-3">
                  <div className="font-bold text-rose-300">File New Automation Defect</div>
                  
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono font-bold block mb-1">Defect Title</label>
                    <input 
                      type="text" 
                      value={newDefectTitle}
                      onChange={e => setNewDefectTitle(e.target.value)}
                      className="text-input text-xs py-1.5"
                      placeholder="e.g. Stripe checkout throws 500 error"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono font-bold block mb-1">Priority</label>
                      <select 
                        value={newDefectPriority}
                        onChange={e => setNewDefectPriority(e.target.value as any)}
                        className="select-input text-xs py-1.5"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono font-bold block mb-1">Severity</label>
                      <select 
                        value={newDefectSeverity}
                        onChange={e => setNewDefectSeverity(e.target.value as any)}
                        className="select-input text-xs py-1.5"
                      >
                        <option value="Blocker">Blocker</option>
                        <option value="Major">Major</option>
                        <option value="Minor">Minor</option>
                        <option value="Trivial">Trivial</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-1.5">
                    <button 
                      onClick={() => setShowFileForm(false)}
                      className="btn btn-secondary py-1 px-3 text-xs font-mono"
                    >
                      CANCEL
                    </button>
                    <button 
                      onClick={handleFileDefect}
                      className="btn btn-danger py-1 px-3 text-xs font-mono"
                    >
                      CREATE & LINK
                    </button>
                  </div>
                </div>
              )}

              {/* Error Summary Block (If failed) */}
              {selectedTC.status === 'Failed' && selectedTC.errorMessage && (
                <div className="border border-rose-500/20 bg-rose-950/10 rounded-lg p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-400 font-mono text-xs font-bold uppercase">
                    <AlertCircle size={14} className="glow-red" />
                    <span>Assertion Exception Summary</span>
                  </div>
                  <pre className="text-xs font-mono text-rose-300 whitespace-pre-wrap break-all select-all font-semibold">
                    {selectedTC.errorMessage}
                  </pre>
                </div>
              )}

              {/* Stack Trace (If failed) */}
              {selectedTC.status === 'Failed' && selectedTC.stackTrace && (
                <div className="flex-1 flex flex-col min-h-[140px]">
                  <div className="text-[10px] font-mono text-slate-500 font-bold mb-1">Stack Trace</div>
                  <pre className="flex-1 bg-slate-950/60 border border-white/5 rounded-lg p-3 text-[11px] font-mono text-slate-300 overflow-auto whitespace-pre select-all leading-relaxed">
                    {selectedTC.stackTrace}
                  </pre>
                </div>
              )}

              {/* Execution Logs */}
              <div className="flex-1 flex flex-col min-h-[160px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-slate-500 font-bold">Execution Logs</span>
                  <Terminal size={12} className="text-slate-500" />
                </div>
                
                <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-lg p-3.5 text-[11px] font-mono text-slate-300 space-y-1.5 overflow-y-auto leading-relaxed max-h-[220px]">
                  {selectedTC.logs.map((log, index) => {
                    const isError = log.includes('[ERROR]');
                    const isWarn = log.includes('[WARN]');
                    const isDebug = log.includes('[DEBUG]');
                    let color = 'text-slate-300';
                    if (isError) color = 'text-rose-400 font-semibold';
                    else if (isWarn) color = 'text-amber-400';
                    else if (isDebug) color = 'text-cyan-500';

                    return (
                      <div key={index} className={color}>
                        {log}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 italic text-xs">
              Select a test case from the left list to view execution details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
