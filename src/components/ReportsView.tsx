import React, { useState } from 'react';
import { 
  FileText, 
  Settings, 
  Flame, 
  BarChart, 
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
import type { 
  Execution, 
  Defect 
} from '../services/mockDataService';

interface ReportsViewProps {
  executions: Execution[];
  defects: Defect[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ executions, defects }) => {
  const [reportEnv, setReportEnv] = useState('');
  const [reportBuild, setReportBuild] = useState('');
  const [reportType, setReportType] = useState<'summary' | 'failures' | 'defects'>('summary');
  
  // Custom query filtering
  const queriedExecs = executions.filter(exec => {
    const matchEnv = reportEnv ? exec.environment.name === reportEnv : true;
    const matchBuild = reportBuild ? exec.build === reportBuild : true;
    return matchEnv && matchBuild;
  });

  const uniqueEnvs = Array.from(new Set(executions.map(e => e.environment.name)));
  const uniqueBuilds = Array.from(new Set(executions.map(e => e.build)));

  // Core metrics for queried executions
  const totalRuns = queriedExecs.length;
  const totalTests = queriedExecs.reduce((sum, e) => sum + e.totalTests, 0);
  const passedCount = queriedExecs.reduce((sum, e) => sum + e.passedCount, 0);
  const failedCount = queriedExecs.reduce((sum, e) => sum + e.failedCount, 0);
  
  const passRate = totalTests > 0 ? Math.round((passedCount / totalTests) * 100) : 0;
  const avgDuration = totalRuns > 0 
    ? Math.round(queriedExecs.reduce((sum, e) => sum + e.duration, 0) / totalRuns)
    : 0;

  // Failure Analysis: Find top failing tests
  const getFailingTestsAnalysis = () => {
    const failureCounts: Record<string, { name: string; count: number; module: string; lastError?: string }> = {};
    queriedExecs.forEach(exec => {
      exec.testCases.forEach(tc => {
        if (tc.status === 'Failed') {
          if (!failureCounts[tc.id]) {
            failureCounts[tc.id] = { name: tc.name, count: 0, module: tc.module, lastError: tc.errorMessage };
          }
          failureCounts[tc.id].count++;
          failureCounts[tc.id].lastError = tc.errorMessage;
        }
      });
    });

    return Object.entries(failureCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count);
  };

  const failingTests = getFailingTestsAnalysis();

  // Export JSON helper
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(executions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `automation_executions_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export CSV helper
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Execution ID,Build,Environment,Date,Total Tests,Passed,Failed,Skipped,Duration(s),Status,Triggered By\r\n";
    
    executions.forEach(exec => {
      csvContent += `${exec.id},${exec.build},${exec.environment.name},${exec.date},${exec.totalTests},${exec.passedCount},${exec.failedCount},${exec.skippedCount},${exec.duration},${exec.status},${exec.triggeredBy}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `automation_summary_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold font-display tracking-tight text-white">Reports & Export</h2>
        <p className="text-slate-400 text-xs mt-0.5">Generate QA compliance reports, perform frequency failure analysis, and download raw datasets.</p>
      </div>

      {/* Main Grid: Builder options & Export card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report config builder (Left) */}
        <div className="glass-card flex flex-col space-y-4">
          <h3 className="text-xs font-bold font-mono text-slate-400 tracking-wider uppercase flex items-center gap-1.5 mb-2">
            <Settings size={14} className="text-blue-400 glow-blue" />
            Report Builder Setup
          </h3>

          {/* Environment Filter */}
          <div>
            <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Select Target Environment
            </label>
            <select 
              value={reportEnv}
              onChange={e => setReportEnv(e.target.value)}
              className="select-input text-xs"
            >
              <option value="">All Environments</option>
              {uniqueEnvs.map(env => (
                <option key={env} value={env}>{env}</option>
              ))}
            </select>
          </div>

          {/* Build Version select */}
          <div>
            <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Select Build Target
            </label>
            <select 
              value={reportBuild}
              onChange={e => setReportBuild(e.target.value)}
              className="select-input text-xs"
            >
              <option value="">All Builds</option>
              {uniqueBuilds.map(build => (
                <option key={build} value={build}>{build}</option>
              ))}
            </select>
          </div>

          {/* Report Display Category */}
          <div>
            <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-2">
              Select Report Type
            </label>
            <div className="space-y-2">
              {[
                { id: 'summary', label: 'Suite Execution Summary', icon: BarChart },
                { id: 'failures', label: 'Failure Analysis & Flakiness', icon: Flame },
                { id: 'defects', label: 'Linked Defect Summary', icon: FileText }
              ].map(item => {
                const Icon = item.icon;
                const isSelected = reportType === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setReportType(item.id as any)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2.5 transition-all ${
                      isSelected 
                        ? 'bg-blue-500/10 border-blue-500/35 text-blue-400' 
                        : 'border-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={14} className={isSelected ? 'glow-blue' : ''} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Report Preview panel (Right) */}
        <div className="glass-card lg:col-span-2 flex flex-col min-h-[350px]">
          {/* Summary Sheet */}
          {reportType === 'summary' && (
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <h3 className="text-xs font-bold font-mono text-slate-400 tracking-wider uppercase">
                  EXECUTION SUMMARY REPORT
                </h3>
                <span className="text-[9px] font-mono text-slate-500 font-bold">Query results: {totalRuns} Runs</span>
              </div>

              {/* Stats aggregates grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                  <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Pass Rate</div>
                  <div className="text-lg font-bold font-mono text-emerald-400 glow-green mt-1">{passRate}%</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                  <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Total Tests Run</div>
                  <div className="text-lg font-bold font-mono text-white mt-1">{totalTests}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                  <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Avg Duration</div>
                  <div className="text-lg font-bold font-mono text-slate-300 mt-1">{avgDuration}s</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                  <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Failing Count</div>
                  <div className="text-lg font-bold font-mono text-rose-400 glow-red mt-1">{failedCount}</div>
                </div>
              </div>

              {/* Printable sheet table layout */}
              <div className="flex-1 overflow-y-auto max-h-[200px] border border-white/10 rounded-lg">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-white/5 font-mono text-slate-500">
                      <th className="p-2.5">RUN ID</th>
                      <th className="p-2.5">ENVIRONMENT</th>
                      <th className="p-2.5">BUILD</th>
                      <th className="p-2.5">PASS RATE</th>
                      <th className="p-2.5">FAILURES</th>
                      <th className="p-2.5">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queriedExecs.map(exec => {
                      const rate = exec.totalTests > 0 
                        ? Math.round((exec.passedCount / exec.totalTests) * 100)
                        : 0;
                      return (
                        <tr key={exec.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-2.5 font-mono font-bold text-slate-300">{exec.id}</td>
                          <td className="p-2.5 text-slate-400 font-semibold">{exec.environment.name}</td>
                          <td className="p-2.5 font-mono text-slate-400">{exec.build}</td>
                          <td className="p-2.5 font-mono font-bold text-slate-300">{rate}%</td>
                          <td className="p-2.5 font-mono text-rose-400 font-bold">{exec.failedCount}</td>
                          <td className="p-2.5">
                            <span className={`badge scale-75 ${
                              exec.status === 'Passed' ? 'badge-passed' : 'badge-failed'
                            }`}>
                              {exec.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Failure analysis sheet */}
          {reportType === 'failures' && (
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <h3 className="text-xs font-bold font-mono text-slate-400 tracking-wider uppercase">
                  FAILURE FREQUENCY ANALYSIS (REGRESSION RANKING)
                </h3>
                <span className="text-[9px] font-mono text-slate-500 font-bold">Failed items: {failingTests.length}</span>
              </div>

              {/* List of failing tests ranked by frequency */}
              <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2">
                {failingTests.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 italic font-semibold text-xs">
                    No test failures recorded under the current query filters.
                  </div>
                ) : (
                  failingTests.map(tc => (
                    <div 
                      key={tc.id} 
                      className="p-3 rounded-lg border border-rose-500/10 bg-rose-950/5 flex justify-between items-start gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/5 px-2 py-0.5 border border-rose-500/20 rounded">
                            {tc.id}
                          </span>
                          <h4 className="font-bold text-slate-200 text-xs truncate">{tc.name}</h4>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold truncate">
                          Module: {tc.module} | Last Failure Summary: <span className="font-mono text-rose-300">{tc.lastError}</span>
                        </p>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-mono text-rose-400 glow-red">{tc.count} Fails</div>
                        <span className="text-[9px] text-slate-500 font-mono font-bold uppercase">Across queried runs</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Defect summary report */}
          {reportType === 'defects' && (
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <h3 className="text-xs font-bold font-mono text-slate-400 tracking-wider uppercase">
                  LINKED DEFECT SUMMARY
                </h3>
                <span className="text-[9px] font-mono text-slate-500 font-bold">Total defects: {defects.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[300px] border border-white/10 rounded-lg">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-white/5 font-mono text-slate-500">
                      <th className="p-2.5">DEFECT ID</th>
                      <th className="p-2.5">SUMMARY TITLE</th>
                      <th className="p-2.5">PRIORITY</th>
                      <th className="p-2.5">STATUS</th>
                      <th className="p-2.5">ASSIGNED OWNER</th>
                      <th className="p-2.5">LINKED TESTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defects.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500 font-semibold italic">
                          No defects filed in the database yet.
                        </td>
                      </tr>
                    ) : (
                      defects.map(def => (
                        <tr key={def.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-2.5 font-mono font-bold text-amber-500">{def.id}</td>
                          <td className="p-2.5 text-slate-300 font-semibold">{def.title}</td>
                          <td className="p-2.5 font-mono font-bold text-slate-400">{def.priority}</td>
                          <td className="p-2.5">
                            <span className={`badge scale-75 ${
                              def.status === 'Closed' ? 'badge-passed' : def.status === 'Open' ? 'badge-failed' : 'badge-running'
                            }`}>
                              {def.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-400 font-medium">{def.owner}</td>
                          <td className="p-2.5 font-mono font-bold text-slate-400 text-center">{def.linkedTestCases.length}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EXPORT OPTIONS CARD */}
      <div className="glass-card flex flex-col md:flex-row gap-6 items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <FileText size={24} className="glow-blue" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200 text-sm">Download Raw Data Repository</h3>
            <p className="text-slate-500 text-xs font-semibold mt-0.5">Export the entire local execution database for external Excel imports or BI tools.</p>
          </div>
        </div>

        <div className="flex gap-3.5 w-full md:w-auto shrink-0">
          <button
            onClick={handleExportCSV}
            className="btn btn-secondary text-xs flex-1 md:flex-initial font-mono border-white/10 hover:border-blue-500/30 text-slate-300"
          >
            <FileSpreadsheet size={14} className="text-emerald-400" />
            EXPORT TO CSV
          </button>
          
          <button
            onClick={handleExportJSON}
            className="btn bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 text-blue-400 text-xs flex-1 md:flex-initial font-mono glow-blue font-bold"
          >
            <FileCode size={14} className="text-blue-400" />
            EXPORT TO JSON
          </button>
        </div>
      </div>
    </div>
  );
};
