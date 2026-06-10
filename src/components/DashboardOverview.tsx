import React from 'react';
import { 
  BarChart2, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Bell, 
  Flame,
  Globe2
} from 'lucide-react';
import { 
  getTrends,
  MOCK_ENVIRONMENTS
} from '../services/mockDataService';
import type { 
  Execution, 
  Defect,
  Environment
} from '../services/mockDataService';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardOverviewProps {
  executions: Execution[];
  defects: Defect[];
  onNavigateToView: (view: string) => void;
  onSelectExecution: (id: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ 
  executions, 
  defects, 
  onNavigateToView,
  onSelectExecution 
}) => {
  // Aggregate stats
  const latestExecution = executions[0];
  
  // Aggregate stats across ALL historical runs
  const totalTestsRun = executions.reduce((sum, e) => sum + e.totalTests, 0);
  const totalPassed = executions.reduce((sum, e) => sum + e.passedCount, 0);
  const totalFailed = executions.reduce((sum, e) => sum + e.failedCount, 0);
  
  const overallPassRate = totalTestsRun > 0 
    ? Math.round((totalPassed / totalTestsRun) * 100) 
    : 0;

  const openDefects = defects.filter(d => d.status === 'Open' || d.status === 'In Progress');
  const criticalDefects = openDefects.filter(d => d.priority === 'Critical' || d.priority === 'High');

  // Trend data
  const { historyTrend, environmentWiseHealth, moduleWiseHealth } = getTrends();

  // Notification feeds
  const notifications = [];
  if (latestExecution) {
    notifications.push({
      id: 1,
      type: latestExecution.status === 'Failed' ? 'alert' : 'info',
      title: `${latestExecution.status === 'Failed' ? 'Suite Execution Failed' : 'Suite Execution Passed'}`,
      desc: `Run ${latestExecution.id} on Build ${latestExecution.build} (${latestExecution.environment.name}) finished.`,
      time: 'Latest Run'
    });
  }
  
  criticalDefects.slice(0, 2).forEach((def, i) => {
    notifications.push({
      id: 2 + i,
      type: 'warning',
      title: `Critical Defect: ${def.id}`,
      desc: def.title,
      time: 'Unresolved'
    });
  });

  if (notifications.length === 0) {
    notifications.push({
      id: 99,
      type: 'info',
      title: 'System Health Nominal',
      desc: 'All automation runners idle. No failures reported in the last 24 hours.',
      time: 'Just now'
    });
  }

  // --- Chart.js Data Configuration ---
  
  // 1. History Trend (Line)
  const lineChartData = {
    labels: historyTrend.map(h => h.build),
    datasets: [
      {
        label: 'Pass Rate (%)',
        data: historyTrend.map(h => h.passRate),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#3b82f6',
        pointHoverRadius: 7
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'Fira Code' },
        bodyFont: { family: 'Fira Code' },
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        min: 50,
        max: 100,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', font: { family: 'Fira Code' } }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { family: 'Fira Code' } }
      }
    }
  };

  // 2. Module Health (Doughnut)
  const doughnutChartData = {
    labels: moduleWiseHealth.map(m => m.name),
    datasets: [
      {
        data: moduleWiseHealth.map(m => m.passRate),
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(6, 182, 212, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(236, 72, 153, 0.7)'
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
        position: 'right' as const,
        labels: {
          color: '#e2e8f0',
          font: { family: 'Fira Sans', size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => ` Pass Rate: ${context.raw}%`
        }
      }
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Title & Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-white">Dashboard Overview</h2>
          <p className="text-slate-400 text-xs mt-0.5">Real-time automation summary of health, runs, defects, and environments.</p>
        </div>
        
        {/* Environment Quick health check */}
        <div className="flex gap-2.5">
          {MOCK_ENVIRONMENTS.slice(0, 3).map((env: Environment, i: number) => {
            const h = environmentWiseHealth.find(eh => eh.name === env.name);
            const rate = h ? h.passRate : 100;
            const isHealthy = rate >= 90;
            return (
              <div key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
                <Globe2 size={13} className={isHealthy ? 'text-emerald-400' : 'text-rose-400'} />
                <span className="text-[10px] font-mono font-bold text-slate-300">{env.name}</span>
                <span className={`text-[10px] font-mono font-bold ${isHealthy ? 'text-emerald-400' : 'text-rose-400'}`}>{rate}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Pass rate Card */}
        <div className="glass-card flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <div className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Overall Pass Rate</div>
            <div className="text-2xl font-bold font-mono mt-1 text-white glow-blue">{overallPassRate}%</div>
            <div className="text-[10px] text-slate-500 mt-1 font-semibold">Across {totalTestsRun} total runs</div>
          </div>
          <div className="p-3.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <BarChart2 size={22} className="glow-blue" />
          </div>
        </div>

        {/* Passed tests Card */}
        <div className="glass-card flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <div className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Passed Tests</div>
            <div className="text-2xl font-bold font-mono mt-1 text-emerald-400 glow-green">{totalPassed}</div>
            <div className="text-[10px] text-slate-500 mt-1 font-semibold">Successful assertions</div>
          </div>
          <div className="p-3.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 size={22} className="glow-green" />
          </div>
        </div>

        {/* Failed tests Card */}
        <div className="glass-card flex items-center justify-between border-l-4 border-l-rose-500">
          <div>
            <div className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Failed Tests</div>
            <div className="text-2xl font-bold font-mono mt-1 text-rose-400 glow-red">{totalFailed}</div>
            <div className="text-[10px] text-slate-500 mt-1 font-semibold">Investigate issues</div>
          </div>
          <div className="p-3.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <XCircle size={22} className="glow-red" />
          </div>
        </div>

        {/* Active defects Card */}
        <div className="glass-card flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <div className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Critical Defects</div>
            <div className="text-2xl font-bold font-mono mt-1 text-amber-500 glow-amber">{criticalDefects.length}</div>
            <div className="text-[10px] text-slate-500 mt-1 font-semibold">{openDefects.length} total open defects</div>
          </div>
          <div className="p-3.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Flame size={22} className="glow-amber" />
          </div>
        </div>
      </div>

      {/* Main Charts & Feed Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Historical Trends (Line) */}
        <div className="glass-card lg:col-span-2 flex flex-col h-[280px]">
          <h3 className="text-xs font-bold font-mono text-slate-400 tracking-wider uppercase mb-4">
            Pass Rate Trend (Latest Builds)
          </h3>
          <div className="flex-1 relative">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Live Notification Center */}
        <div className="glass-card flex flex-col h-[280px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold font-mono text-slate-400 tracking-wider uppercase">
              Notifications & Alerts
            </h3>
            <Bell size={14} className="text-slate-500" />
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {notifications.map(n => (
              <div 
                key={n.id} 
                className={`flex gap-3 p-2.5 rounded-lg border text-xs ${
                  n.type === 'alert' 
                    ? 'bg-rose-500/5 border-rose-500/20 text-rose-300' 
                    : n.type === 'warning'
                    ? 'bg-amber-500/5 border-amber-500/20 text-amber-300'
                    : 'bg-blue-500/5 border-blue-500/20 text-blue-300'
                }`}
              >
                {n.type === 'alert' && <XCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />}
                {n.type === 'warning' && <Flame size={16} className="shrink-0 mt-0.5 text-amber-400" />}
                {n.type === 'info' && <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-blue-400" />}
                
                <div className="space-y-0.5">
                  <div className="font-bold">{n.title}</div>
                  <div className="text-[11px] text-slate-400">{n.desc}</div>
                  <span className="text-[9px] text-slate-500 font-mono font-bold">{n.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module wise Health & Recent Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Health Donut */}
        <div className="glass-card flex flex-col h-[260px]">
          <h3 className="text-xs font-bold font-mono text-slate-400 tracking-wider uppercase mb-3">
            Module Pass Rates
          </h3>
          <div className="flex-1 relative flex items-center justify-center">
            <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
          </div>
        </div>

        {/* Recent Executions summary list */}
        <div className="glass-card lg:col-span-2 flex flex-col h-[260px]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold font-mono text-slate-400 tracking-wider uppercase">
              Recent Executions
            </h3>
            <button 
              onClick={() => onNavigateToView('executions')} 
              className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 font-mono text-slate-500">
                  <th className="pb-2">EXECUTION ID</th>
                  <th className="pb-2">ENV</th>
                  <th className="pb-2">BUILD</th>
                  <th className="pb-2">PASSED / FAILED</th>
                  <th className="pb-2">STATUS</th>
                  <th className="pb-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {executions.slice(0, 4).map(exec => (
                  <tr key={exec.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 font-bold font-mono text-slate-300">{exec.id}</td>
                    <td className="py-2.5 font-semibold text-slate-400">{exec.environment.name}</td>
                    <td className="py-2.5 font-mono text-slate-400">{exec.build}</td>
                    <td className="py-2.5 font-mono font-bold text-slate-300">
                      <span className="text-emerald-400">{exec.passedCount}</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-rose-400">{exec.failedCount}</span>
                    </td>
                    <td className="py-2.5">
                      <span className={`badge ${
                        exec.status === 'Passed' ? 'badge-passed' : 'badge-failed'
                      }`}>
                        {exec.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button 
                        onClick={() => onSelectExecution(exec.id)}
                        className="px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 font-bold transition-all"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
