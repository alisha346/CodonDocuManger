// src/App.tsx
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sidebar } from './components/Sidebar';
import { RoleSelector } from './components/RoleSelector';
import { DashboardOverview } from './components/DashboardOverview';
import { ExecutionsList } from './components/ExecutionsList';
import { TestCaseDetails } from './components/TestCaseDetails';
import { DefectTracker } from './components/DefectTracker';
import { ScreenshotGallery } from './components/ScreenshotGallery';
import { ReportsView } from './components/ReportsView';
import { 
  getExecutions, 
  getDefects, 
  initializeData 
} from './services/mockDataService';
import type { 
  Execution, 
  Defect, 
  UserRole 
} from './services/mockDataService';
import { 
  X, 
  Info
} from 'lucide-react';

function App() {
  // Initialize mock data on startup
  useEffect(() => {
    initializeData();
  }, []);

  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  
  // Data States
  const [executions, setExecutions] = useState<Execution[]>(() => getExecutions());
  const [defects, setDefects] = useState<Defect[]>(() => getDefects());
  
  // Role State (default to QA Lead)
  const [currentRole, setCurrentRole] = useState<UserRole>('QA Lead');

  // Simulation Running State
  const [activeRunningId, setActiveRunningId] = useState<string | null>(null);

  // Lightbox Preview Image State
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null);

  // Notification Banner State
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleUpdateExecutions = (updated: Execution[]) => {
    setExecutions(updated);
    
    // Check if the running simulation completed successfully or failed
    const runningItem = updated.find(e => e.id === activeRunningId);
    if (runningItem && runningItem.status !== 'Running') {
      if (runningItem.status === 'Passed' && runningItem.failedCount === 0) {
        // Confetti!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        setNotification({
          type: 'success',
          message: `Execution ${runningItem.id} completed successfully. 100% Pass Rate! 🎉`
        });
      } else {
        setNotification({
          type: 'error',
          message: `Execution ${runningItem.id} completed with ${runningItem.failedCount} failures. ❌`
        });
      }
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleUpdateDefects = (updated: Defect[]) => {
    setDefects(updated);
  };

  // Helper to trigger navigation
  const handleNavigateToView = (view: string) => {
    setActiveView(view);
    setSelectedExecutionId(null);
  };

  // Helper to open execution detail view
  const handleSelectExecution = (id: string) => {
    setActiveView('executions');
    setSelectedExecutionId(id);
  };

  // Get active run statistics
  const runningCount = executions.filter(e => e.status === 'Running').length;

  return (
    <div className="min-h-screen flex p-4 gap-4 relative overflow-hidden bg-[#030712]">
      {/* Liquid Moving Background blobs */}
      <div className="liquid-mesh">
        <div className="liquid-blob blob-1" />
        <div className="liquid-blob blob-2" />
        <div className="liquid-blob blob-3" />
      </div>

      {/* Sidebar Navigation */}
      <Sidebar 
        activeView={activeView} 
        setActiveView={handleNavigateToView}
        currentRole={currentRole}
        runningCount={runningCount}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col gap-4 overflow-x-hidden">
        {/* Top Header Navbar */}
        <header className="glass-panel flex justify-between items-center px-6 py-3.5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400">
            <span>Hyperion QA</span>
            <span>/</span>
            <span className="text-blue-400 capitalize">{activeView}</span>
            {selectedExecutionId && (
              <>
                <span>/</span>
                <span className="text-purple-400">{selectedExecutionId}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Live Runner Alert Badge */}
            {runningCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-[10px] font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Simulating Runs...</span>
              </div>
            )}

            {/* Float Role Selector Dropdown */}
            <RoleSelector currentRole={currentRole} setCurrentRole={setCurrentRole} />
          </div>
        </header>

        {/* Live Notification Banner */}
        {notification && (
          <div className={`glass-card flex justify-between items-center p-3 text-xs border-l-4 border-l-${notification.type === 'success' ? 'emerald' : 'rose'}-500 fade-in`}>
            <div className="flex items-center gap-2">
              <Info size={14} className={notification.type === 'success' ? 'text-emerald-400' : 'text-rose-400'} />
              <span className="font-semibold text-slate-200">{notification.message}</span>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* View Routing Layer */}
        <main className="flex-1 overflow-y-auto pr-1">
          {activeView === 'dashboard' && (
            <DashboardOverview 
              executions={executions} 
              defects={defects}
              onNavigateToView={handleNavigateToView}
              onSelectExecution={handleSelectExecution}
            />
          )}

          {activeView === 'executions' && (
            selectedExecutionId ? (
              <TestCaseDetails 
                execution={executions.find(e => e.id === selectedExecutionId)!}
                onBack={() => setSelectedExecutionId(null)}
                currentRole={currentRole}
                defects={defects}
                onUpdateDefects={handleUpdateDefects}
                onPreviewImage={(src, name) => setPreviewImage({ src, name })}
              />
            ) : (
              <ExecutionsList 
                executions={executions}
                currentRole={currentRole}
                onUpdateExecutions={handleUpdateExecutions}
                onSelectExecution={handleSelectExecution}
                activeRunningId={activeRunningId}
                setActiveRunningId={setActiveRunningId}
              />
            )
          )}

          {activeView === 'screenshots' && (
            <ScreenshotGallery 
              executions={executions}
              onPreviewImage={(src, name) => setPreviewImage({ src, name })}
            />
          )}

          {activeView === 'defects' && (
            <DefectTracker 
              defects={defects}
              currentRole={currentRole}
              onUpdateDefects={handleUpdateDefects}
            />
          )}

          {activeView === 'reports' && (
            <ReportsView 
              executions={executions}
              defects={defects}
            />
          )}
        </main>
      </div>

      {/* FULLSCREEN IMAGE LIGHTBOX MODAL */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6"
          onClick={() => setPreviewImage(null)}
        >
          {/* Top header bar */}
          <div className="w-full max-w-4xl flex justify-between items-center mb-4 text-xs font-mono font-bold text-slate-300">
            <span>PREVIEW: {previewImage.name}</span>
            <button 
              onClick={() => setPreviewImage(null)}
              className="p-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Large image wrapper */}
          <div className="w-full max-w-4xl flex-1 flex items-center justify-center overflow-hidden">
            <img 
              src={previewImage.src} 
              alt={previewImage.name} 
              className="object-contain max-w-full max-h-full rounded-lg border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Stop closing
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
