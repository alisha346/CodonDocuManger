import React, { useState } from 'react';
import { 
  Search, 
  Eye, 
  Play, 
  AlertTriangle, 
  Calendar,
  Layers,
  Cpu
} from 'lucide-react';
import type { 
  Execution 
} from '../services/mockDataService';

interface ScreenshotGalleryProps {
  executions: Execution[];
  onPreviewImage: (src: string, name: string) => void;
}

export const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({
  executions,
  onPreviewImage
}) => {
  // Filter states
  const [filterExecId, setFilterExecId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [failedOnly, setFailedOnly] = useState(false);

  // Flatten all test cases with execution metadata for easy gallery rendering
  const allScreenshots: {
    src: string;
    testCaseId: string;
    testName: string;
    module: string;
    status: string;
    executionId: string;
    build: string;
    envName: string;
    date: string;
    browser: string;
    errorMsg?: string;
  }[] = [];

  executions.forEach(exec => {
    exec.testCases.forEach(tc => {
      tc.screenshots.forEach(src => {
        allScreenshots.push({
          src,
          testCaseId: tc.id,
          testName: tc.name,
          module: tc.module,
          status: tc.status,
          executionId: exec.id,
          build: exec.build,
          envName: exec.environment.name,
          date: exec.date,
          browser: exec.environment.browser,
          errorMsg: tc.errorMessage
        });
      });
    });
  });

  // Filter gallery items
  const filteredItems = allScreenshots.filter(item => {
    const matchExec = filterExecId ? item.executionId === filterExecId : true;
    const matchSearch = item.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.module.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFailed = failedOnly ? item.status === 'Failed' : true;
    return matchExec && matchSearch && matchFailed;
  });

  return (
    <div className="space-y-6 fade-in">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold font-display tracking-tight text-white">Screenshot Gallery</h2>
        <p className="text-slate-400 text-xs mt-0.5">Browse through visual screenshots captured by automation drivers during runtime.</p>
      </div>

      {/* Gallery Filters Bar */}
      <div className="glass-card flex flex-col md:flex-row gap-4 items-center justify-between p-4.5">
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* Search by Test Name */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Search test case or module..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="text-input pl-9 text-xs py-2"
            />
          </div>

          {/* Filter by Execution ID */}
          <select
            value={filterExecId}
            onChange={e => setFilterExecId(e.target.value)}
            className="select-input text-xs py-2 w-full md:w-48"
          >
            <option value="">All Executions</option>
            {executions.map(exec => (
              <option key={exec.id} value={exec.id}>{exec.id} ({exec.build})</option>
            ))}
          </select>
        </div>

        {/* Failed tests Toggle */}
        <button
          onClick={() => setFailedOnly(!failedOnly)}
          className={`btn text-xs font-mono px-4 py-2 border ${
            failedOnly 
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 glow-red font-bold'
              : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle size={13} />
          {failedOnly ? 'FAILED RUNS ONLY (ACTIVE)' : 'SHOW ALL CAPTURES'}
        </button>
      </div>

      {/* Grid of Screenshots */}
      {filteredItems.length === 0 ? (
        <div className="glass-card text-center py-20 text-slate-500 font-semibold italic text-sm">
          No automation screenshots match the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => (
            <div 
              key={index} 
              className="glass-card flex flex-col p-3 hover:translate-y-[-4px] hover:border-slate-500/30 group"
            >
              {/* Image Preview Block */}
              <div className="relative aspect-video rounded-lg overflow-hidden border border-white/5 bg-slate-950/80 mb-3 flex items-center justify-center">
                <img 
                  src={item.src} 
                  alt={item.testName} 
                  className="object-contain w-full h-full"
                />
                
                {/* Status indicator pill on top right */}
                <div className="absolute top-2.5 right-2.5">
                  <span className={`badge scale-80 ${
                    item.status === 'Passed' ? 'badge-passed' : 'badge-failed'
                  }`}>
                    {item.status}
                  </span>
                </div>

                {/* Overlap Lightbox trigger */}
                <button 
                  onClick={() => onPreviewImage(item.src, item.testName)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity gap-1.5 font-bold font-mono text-xs"
                >
                  <Eye size={16} />
                  <span>ZOOM PREVIEW</span>
                </button>
              </div>

              {/* Text Meta Info */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-200 text-xs truncate" title={item.testName}>
                    {item.testName}
                  </h4>
                  <div className="text-[10px] font-mono text-slate-500">
                    ID: {item.testCaseId} | Module: {item.module}
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="border-t border-white/5 pt-2 mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                    <span className="flex items-center gap-0.5">
                      <Play size={8} /> Run: {item.executionId}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Layers size={8} /> Build: {item.build}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                    <span className="flex items-center gap-0.5">
                      <Cpu size={8} /> Browser: {item.browser.split(',')[0]}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Calendar size={8} /> Date: {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default ScreenshotGallery;
