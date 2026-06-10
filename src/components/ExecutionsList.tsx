import React, { useState } from 'react';
import { 
  Play, 
  RotateCw, 
  Trash2, 
  Plus, 
  Sparkles,
  Calendar
} from 'lucide-react';
import { 
  simulateRerun, 
  triggerNewExecution,
  MOCK_ENVIRONMENTS
} from '../services/mockDataService';
import type { 
  Execution, 
  UserRole,
  Environment
} from '../services/mockDataService';
import { checkPermission } from './RoleSelector';

interface ExecutionsListProps {
  executions: Execution[];
  currentRole: UserRole;
  onUpdateExecutions: (execs: Execution[]) => void;
  onSelectExecution: (id: string) => void;
  activeRunningId: string | null;
  setActiveRunningId: (id: string | null) => void;
}

export const ExecutionsList: React.FC<ExecutionsListProps> = ({
  executions,
  currentRole,
  onUpdateExecutions,
  onSelectExecution,
  activeRunningId,
  setActiveRunningId
}) => {
  // Filter states
  const [filterEnv, setFilterEnv] = useState('');
  const [filterBuild, setFilterBuild] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTrigger, setSearchTrigger] = useState('');
  
  // Rerun simulator state
  const [currentRunningExec, setCurrentRunningExec] = useState<Execution | null>(null);

  // New Execution Form states
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [newRunEnv, setNewRunEnv] = useState('QA-Internal');
  const [newRunBuild, setNewRunBuild] = useState('v2.5.0-beta5');
  const [newRunTriggerer, setNewRunTriggerer] = useState('Aaditya H. (Manual)');

  // Compare runs states
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Delete run action
  const handleDeleteExecution = (id: string) => {
    if (!checkPermission(currentRole, 'delete_execution')) {
      alert(`Permission Denied: ${currentRole} role cannot delete executions.`);
      return;
    }
    const updated = executions.filter(e => e.id !== id);
    onUpdateExecutions(updated);
    localStorage.setItem('qa_dashboard_executions', JSON.stringify(updated));
  };

  // Trigger rerun simulation
  const handleRerun = (id: string) => {
    if (!checkPermission(currentRole, 'trigger_run')) {
      alert(`Permission Denied: ${currentRole} role cannot trigger test runs.`);
      return;
    }
    if (activeRunningId) {
      alert("A test execution is already running. Please wait for it to complete.");
      return;
    }
    
    setActiveRunningId(id);
    simulateRerun(
      id,
      (updatedExec) => {
        setCurrentRunningExec(updatedExec);
        // Live update in main list
        const listCopy = executions.map(e => e.id === id ? updatedExec : e);
        onUpdateExecutions(listCopy);
      },
      () => {
        setActiveRunningId(null);
        setCurrentRunningExec(null);
      }
    );
  };

  // Trigger new run simulation
  const handleStartNewRun = () => {
    if (!checkPermission(currentRole, 'trigger_run')) {
      alert(`Permission Denied: ${currentRole} role cannot trigger test runs.`);
      return;
    }
    setShowNewRunModal(false);
    
    // Create temp execution container
    const tempId = `EXEC-${1000 + executions.length}`;
    setActiveRunningId(tempId);
    
    triggerNewExecution(
      newRunEnv,
      newRunBuild,
      newRunTriggerer,
      (updatedExec) => {
        setCurrentRunningExec(updatedExec);
        // If it is already in executions list, replace, else append
        const exists = executions.some(e => e.id === updatedExec.id);
        const listCopy = exists 
          ? executions.map(e => e.id === updatedExec.id ? updatedExec : e)
          : [updatedExec, ...executions];
        onUpdateExecutions(listCopy);
      },
      () => {
        setActiveRunningId(null);
        setCurrentRunningExec(null);
      }
    );
  };

  // Handle comparison selection
  const handleToggleCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter(x => x !== id));
    } else {
      if (selectedForCompare.length >= 2) {
        alert("You can only compare a maximum of 2 executions.");
        return;
      }
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  // Filter logic
  const filteredExecutions = executions.filter(exec => {
    const matchEnv = filterEnv ? exec.environment.name === filterEnv : true;
    const matchBuild = filterBuild ? exec.build.includes(filterBuild) : true;
    const matchStatus = filterStatus ? exec.status === filterStatus : true;
    const matchTrigger = searchTrigger ? exec.triggeredBy.toLowerCase().includes(searchTrigger.toLowerCase()) : true;
    return matchEnv && matchBuild && matchStatus && matchTrigger;
  });

  // Unique lists for dropdown filters
  const uniqueEnvs = Array.from(new Set(executions.map(e => e.environment.name)));
  const uniqueBuilds = Array.from(new Set(executions.map(e => e.build)));

  // Prep Comparison Data
  const getCompareDetails = () => {
    if (selectedForCompare.length < 2) return null;
    const runA = executions.find(e => e.id === selectedForCompare[0])!;
    const runB = executions.find(e => e.id === selectedForCompare[1])!;
    
    // Group comparisons of all test cases by ID
    const allTestCaseIds = Array.from(
      new Set([
        ...runA.testCases.map(t => t.id),
        ...runB.testCases.map(t => t.id)
      ])
    );

    const testComparisons = allTestCaseIds.map(tcId => {
      const tcA = runA.testCases.find(t => t.id === tcId);
      const tcB = runB.testCases.find(t => t.id === tcId);
      return {
        id: tcId,
        name: tcA?.name || tcB?.name || 'Unknown test',
        statusA: tcA?.status || 'N/A',
        statusB: tcB?.status || 'N/A',
        durationA: tcA?.duration || 0,
        durationB: tcB?.duration || 0
      };
    });

    return { runA, runB, testComparisons };
  };

  const compareData = getCompareDetails();

  return (
    <div className="space-y-6 fade-in">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-white">Execution History</h2>
          <p className="text-slate-400 text-xs mt-0.5">Filter, inspect, rerun, and compare historical test automation suites.</p>
        </div>
        
        <div className="flex gap-2.5">
          {selectedForCompare.length === 2 && (
            <button
              onClick={() => setShowCompareModal(true)}
              className="btn bg-blue-500/20 border-blue-500/30 text-blue-400 text-xs px-3.5 py-2 hover:bg-blue-500/30 glow-blue font-bold font-mono"
            >
              <Sparkles size={13} />
              COMPARE SELECTED (2)
            </button>
          )}
          
          <button
            onClick={() => setShowNewRunModal(true)}
            className="btn btn-primary text-xs px-3.5 py-2 font-mono"
          >
            <Plus size={14} />
            TRIGGER NEW RUN
          </button>
        </div>
      </div>

      {/* Live Simulation Card (Only displays when running a test run) */}
      {activeRunningId && currentRunningExec && (
        <div className="glass-card border-l-4 border-l-blue-500 animate-pulse bg-blue-950/10 mb-4 p-4.5">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <RotateCw size={16} className="text-blue-400 animate-spin" />
              <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-widest">
                Test Runner Simulating: {currentRunningExec.id}
              </span>
            </div>
            <span className="badge badge-running">
              Running
            </span>
          </div>

          {/* Progress Counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 text-center">
              <div className="text-[10px] font-mono text-slate-500">Passed</div>
              <div className="text-sm font-bold font-mono text-emerald-400">{currentRunningExec.passedCount}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 text-center">
              <div className="text-[10px] font-mono text-slate-500">Failed</div>
              <div className="text-sm font-bold font-mono text-rose-400">{currentRunningExec.failedCount}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 text-center">
              <div className="text-[10px] font-mono text-slate-500">Skipped</div>
              <div className="text-sm font-bold font-mono text-amber-500">{currentRunningExec.skippedCount}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 text-center">
              <div className="text-[10px] font-mono text-slate-500">Total Run</div>
              <div className="text-sm font-bold font-mono text-white">
                {currentRunningExec.passedCount + currentRunningExec.failedCount + currentRunningExec.skippedCount} / {currentRunningExec.totalTests}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300"
              style={{ 
                width: `${((currentRunningExec.passedCount + currentRunningExec.failedCount + currentRunningExec.skippedCount) / currentRunningExec.totalTests) * 100}%` 
              }}
            />
          </div>

          {/* Last run log */}
          <div className="text-[10px] text-slate-400 font-mono italic">
            Latest action: {currentRunningExec.testCases.find(t => t.status === 'Running')?.name || 'Finishing suite assertions...'}
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      <div className="glass-card grid grid-cols-1 md:grid-cols-4 gap-4 p-4.5">
        {/* Environment Filter */}
        <div>
          <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1.5">Environment</label>
          <select 
            value={filterEnv}
            onChange={e => setFilterEnv(e.target.value)}
            className="select-input text-xs"
          >
            <option value="">All Environments</option>
            {uniqueEnvs.map(env => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>
        </div>

        {/* Build Version Filter */}
        <div>
          <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1.5">Build Version</label>
          <select 
            value={filterBuild}
            onChange={e => setFilterBuild(e.target.value)}
            className="select-input text-xs"
          >
            <option value="">All Builds</option>
            {uniqueBuilds.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1.5">Execution Status</label>
          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="select-input text-xs"
          >
            <option value="">All Statuses</option>
            <option value="Passed">Passed</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        {/* Triggerer Filter */}
        <div>
          <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1.5">Triggered By / Owner</label>
          <input 
            type="text" 
            placeholder="Search owners (e.g. Jenkins)" 
            value={searchTrigger}
            onChange={e => setSearchTrigger(e.target.value)}
            className="text-input text-xs"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="table-wrapper">
        <table className="custom-table text-xs">
          <thead>
            <tr className="font-mono text-slate-500">
              <th className="w-12 text-center">COMP</th>
              <th>EXECUTION ID</th>
              <th>DATE / TIME</th>
              <th>ENVIRONMENT</th>
              <th>BUILD</th>
              <th>TRIGGERED BY</th>
              <th>METRICS (P/F/S)</th>
              <th>DURATION</th>
              <th>STATUS</th>
              <th className="text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredExecutions.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-slate-500 font-semibold italic">
                  No execution runs match the active filter criteria.
                </td>
              </tr>
            ) : (
              filteredExecutions.map(exec => (
                <tr key={exec.id} className={activeRunningId === exec.id ? 'opacity-80 bg-blue-900/5' : ''}>
                  <td className="text-center py-3">
                    <input 
                      type="checkbox" 
                      checked={selectedForCompare.includes(exec.id)}
                      onChange={() => handleToggleCompare(exec.id)}
                      className="rounded border-white/10 bg-slate-900 text-blue-500 cursor-pointer w-3.5 h-3.5"
                      disabled={activeRunningId === exec.id}
                    />
                  </td>
                  <td className="py-3 font-mono font-bold text-slate-200">
                    <button 
                      onClick={() => onSelectExecution(exec.id)}
                      className="hover:underline text-left text-blue-400 glow-blue"
                    >
                      {exec.id}
                    </button>
                  </td>
                  <td className="py-3 text-slate-400 font-semibold">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-500" />
                      <span>{new Date(exec.date).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-3 text-slate-300 font-bold">{exec.environment.name}</td>
                  <td className="py-3 font-mono text-slate-400">{exec.build}</td>
                  <td className="py-3 font-medium text-slate-400">{exec.triggeredBy}</td>
                  <td className="py-3 font-mono font-bold">
                    <div className="flex items-center gap-1 text-slate-300">
                      <span className="text-emerald-400">{exec.passedCount}</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-rose-400">{exec.failedCount}</span>
                      {exec.skippedCount > 0 && (
                        <>
                          <span className="text-slate-500">/</span>
                          <span className="text-amber-500">{exec.skippedCount}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 font-mono text-slate-400">{exec.duration}s</td>
                  <td className="py-3">
                    <span className={`badge ${
                      exec.status === 'Passed' ? 'badge-passed' : 'badge-failed'
                    }`}>
                      {exec.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleRerun(exec.id)}
                        disabled={!!activeRunningId}
                        className="p-1.5 rounded bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 transition-colors tooltip-trigger"
                      >
                        <RotateCw size={12} />
                        <span className="tooltip">Rerun Test Suite</span>
                      </button>
                      <button
                        onClick={() => handleDeleteExecution(exec.id)}
                        disabled={!!activeRunningId}
                        className="p-1.5 rounded bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 transition-colors tooltip-trigger"
                      >
                        <Trash2 size={12} />
                        <span className="tooltip">Delete Run</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* TRIGGER NEW RUN MODAL */}
      {showNewRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-modal p-6 fade-in border border-white/10">
            <h3 className="text-sm font-bold font-mono tracking-widest text-slate-400 mb-4 uppercase border-b border-white/5 pb-2">
              TRIGGER TEST AUTOMATION SUITE
            </h3>
            
            <div className="space-y-4 mb-6">
              {/* Select Target Env */}
              <div>
                <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Target Environment
                </label>
                <select 
                  value={newRunEnv}
                  onChange={e => setNewRunEnv(e.target.value)}
                  className="select-input text-xs"
                >
                  {MOCK_ENVIRONMENTS.map((env: Environment) => (
                    <option key={env.name} value={env.name}>{env.name} ({env.appVersion})</option>
                  ))}
                </select>
              </div>

              {/* Input Build */}
              <div>
                <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Build Version Tag
                </label>
                <input 
                  type="text" 
                  value={newRunBuild}
                  onChange={e => setNewRunBuild(e.target.value)}
                  className="text-input text-xs"
                  placeholder="e.g. v2.5.0-rc3"
                />
              </div>

              {/* Triggerer name */}
              <div>
                <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Triggered By (Owner Name)
                </label>
                <input 
                  type="text" 
                  value={newRunTriggerer}
                  onChange={e => setNewRunTriggerer(e.target.value)}
                  className="text-input text-xs"
                  placeholder="e.g. Jenkins Runner"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3.5 border-t border-white/5 pt-4">
              <button 
                onClick={() => setShowNewRunModal(false)}
                className="btn btn-secondary text-xs px-3.5 py-2 font-mono"
              >
                CANCEL
              </button>
              <button 
                onClick={handleStartNewRun}
                className="btn btn-success text-xs px-3.5 py-2 font-mono"
              >
                <Play size={12} />
                LAUNCH RUN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPARE EXECUTIONS MODAL */}
      {showCompareModal && compareData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl glass-modal p-6 max-h-[85vh] flex flex-col border border-white/10">
            <h3 className="text-sm font-bold font-mono tracking-widest text-slate-400 mb-4 uppercase border-b border-white/5 pb-2">
              TEST SUITE COMPARISON ANALYSIS
            </h3>

            {/* Comparison Overview stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* RUN A */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-[10px] font-mono text-slate-500 font-bold">RUN A ID</div>
                <div className="text-sm font-bold font-mono text-blue-400 glow-blue">{compareData.runA.id}</div>
                <div className="text-[11px] text-slate-400 font-semibold mt-1">
                  Env: {compareData.runA.environment.name} | Build: {compareData.runA.build}
                </div>
                <div className="text-[11px] text-slate-400 font-semibold font-mono mt-0.5">
                  Metrics: <span className="text-emerald-400">{compareData.runA.passedCount}P</span> / <span className="text-rose-400">{compareData.runA.failedCount}F</span> / <span className="text-amber-500">{compareData.runA.skippedCount}S</span>
                </div>
              </div>

              {/* RUN B */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-[10px] font-mono text-slate-500 font-bold">RUN B ID</div>
                <div className="text-sm font-bold font-mono text-purple-400 glow-blue">{compareData.runB.id}</div>
                <div className="text-[11px] text-slate-400 font-semibold mt-1">
                  Env: {compareData.runB.environment.name} | Build: {compareData.runB.build}
                </div>
                <div className="text-[11px] text-slate-400 font-semibold font-mono mt-0.5">
                  Metrics: <span className="text-emerald-400">{compareData.runB.passedCount}P</span> / <span className="text-rose-400">{compareData.runB.failedCount}F</span> / <span className="text-amber-500">{compareData.runB.skippedCount}S</span>
                </div>
              </div>
            </div>

            {/* Detailed test compare table */}
            <div className="flex-1 overflow-y-auto mb-4 border border-white/10 rounded-lg">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-white/5 font-mono text-slate-500">
                    <th className="p-3 w-16">TC ID</th>
                    <th className="p-3">TEST CASE NAME</th>
                    <th className="p-3 text-center">RUN A STATUS</th>
                    <th className="p-3 text-center">RUN B STATUS</th>
                    <th className="p-3 text-center">VARIANCE</th>
                  </tr>
                </thead>
                <tbody>
                  {compareData.testComparisons.map(tc => {
                    const statusDiff = tc.statusA !== tc.statusB;
                    
                    let varianceColor = 'text-slate-400';
                    let varianceText = 'Stable';
                    
                    if (statusDiff) {
                      if (tc.statusA === 'Passed' && tc.statusB === 'Failed') {
                        varianceColor = 'text-rose-400 font-bold glow-red';
                        varianceText = 'Regression ❌';
                      } else if (tc.statusA === 'Failed' && tc.statusB === 'Passed') {
                        varianceColor = 'text-emerald-400 font-bold glow-green';
                        varianceText = 'Recovered ✓';
                      } else {
                        varianceColor = 'text-amber-400';
                        varianceText = 'Modified ⚠';
                      }
                    }

                    return (
                      <tr key={tc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-400">{tc.id}</td>
                        <td className="p-3 text-slate-300 font-semibold">{tc.name}</td>
                        <td className="p-3 text-center">
                          <span className={`badge ${
                            tc.statusA === 'Passed' ? 'badge-passed' : tc.statusA === 'Failed' ? 'badge-failed' : 'badge-skipped'
                          }`}>
                            {tc.statusA}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`badge ${
                            tc.statusB === 'Passed' ? 'badge-passed' : tc.statusB === 'Failed' ? 'badge-failed' : 'badge-skipped'
                          }`}>
                            {tc.statusB}
                          </span>
                        </td>
                        <td className={`p-3 text-center font-mono ${varianceColor}`}>
                          {varianceText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-t border-white/5 pt-4">
              <button 
                onClick={() => setShowCompareModal(false)}
                className="btn btn-secondary text-xs px-4 py-2 font-mono"
              >
                CLOSE COMPARISON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
