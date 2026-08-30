import React from 'react';
import { 
  FolderKanban, 
  Clock, 
  CheckCircle2, 
  ScanFace, 
  Film, 
  Play, 
  Pause, 
  RotateCw, 
  X, 
  ArrowRight, 
  Sparkles, 
  ShieldAlert, 
  DatabaseZap, 
  Cpu, 
  Layers,
  Plus
} from 'lucide-react';
import { Case, SearchJob, SystemHardwareInfo } from '../types';

interface DashboardViewProps {
  cases: Case[];
  activeJobs: SearchJob[];
  onSelectCase: (caseId: string) => void;
  onNavigateTab: (tab: any) => void;
  onOpenQuickDemo: () => void;
  onOpenBenchmark: () => void;
  systemHardware: SystemHardwareInfo;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  cases,
  activeJobs,
  onSelectCase,
  onNavigateTab,
  onOpenQuickDemo,
  onOpenBenchmark,
  systemHardware,
}) => {
  const totalCases = cases.length;
  const processingCount = cases.filter(c => c.status === 'Searching' || c.status === 'Indexing').length;
  const completedCount = cases.filter(c => c.status === 'Completed' || c.status === 'Exported').length;
  const totalMatches = cases.reduce((acc, c) => acc + c.totalMatchesCount, 0);
  const totalClips = cases.reduce((acc, c) => acc + c.clipsCount, 0);

  return (
    <div id="dashboard-view" className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto w-full">
      {/* Top Banner with Quick Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/20">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <span>CCTV Operations & Candidate Identification Hub</span>
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 backdrop-blur-xs">
              Exam Hall CCTV Security
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1.5 max-w-3xl">
            Automated visual search across multi-camera recorded CCTV footage with biometric face matching and verified clip extraction.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            id="btn-quick-demo-dash"
            onClick={onOpenQuickDemo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/80 to-orange-600/80 hover:from-amber-500 hover:to-orange-600 text-white text-xs font-semibold shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all cursor-pointer backdrop-blur-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>Load 1-Click Test Scenario</span>
          </button>

          <button
            id="btn-new-search-dash"
            onClick={() => onNavigateTab('new_search')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all cursor-pointer backdrop-blur-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Candidate Search</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Cases */}
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-xl p-4.5 flex flex-col justify-between hover:border-white/20 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Cases</span>
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-100 font-mono tracking-tight">{totalCases}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Across active examination centres</div>
          </div>
        </div>

        {/* In Processing */}
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-xl p-4.5 flex flex-col justify-between hover:border-white/20 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Processing / Indexing</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-400 font-mono tracking-tight">{processingCount}</div>
            <div className="text-[11px] text-amber-400/80 mt-0.5">Active AI search & indexing</div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-xl p-4.5 flex flex-col justify-between hover:border-white/20 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Completed & Audited</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">{completedCount}</div>
            <div className="text-[11px] text-emerald-400/80 mt-0.5">Human verification verified</div>
          </div>
        </div>

        {/* Matches Found */}
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-xl p-4.5 flex flex-col justify-between hover:border-white/20 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Matches Identified</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ScanFace className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-blue-400 font-mono tracking-tight">{totalMatches}</div>
            <div className="text-[11px] text-blue-400/80 mt-0.5">Ranked candidate appearances</div>
          </div>
        </div>

        {/* Clips Generated */}
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-xl p-4.5 flex flex-col justify-between hover:border-white/20 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Clips Extracted</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-400 font-mono tracking-tight">{totalClips}</div>
            <div className="text-[11px] text-purple-400/80 mt-0.5">SHA-256 integrity hashed</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Queue & Hardware Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Processing Queue */}
        <div className="lg:col-span-2 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">Live CCTV Processing Job Queue</h3>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
              {activeJobs.length} active background task{activeJobs.length === 1 ? '' : 's'}
            </span>
          </div>

          {activeJobs.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-slate-400 text-xs bg-white/[0.01]">
              No processing jobs currently running. Start a search or index CCTV footage.
            </div>
          ) : (
            <div className="space-y-3">
              {activeJobs.map((job) => (
                <div key={job.id} className="p-3.5 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-400">{job.id}</span>
                      <span className="text-slate-200 font-medium">{job.cameraName}</span>
                      <span className="text-slate-400 font-mono text-[11px]">({job.timeRange})</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
                      job.status === 'Processing' 
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse' 
                        : 'bg-white/5 text-slate-300 border border-white/10'
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>File: {job.currentFile}</span>
                      <span className="text-slate-200 font-semibold">{job.progressPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        style={{ width: `${job.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <div className="flex items-center gap-3">
                      <span>Rate: <strong className="text-slate-300">{job.processingFps} FPS</strong></span>
                      <span>Faces: <strong className="text-slate-300">{job.facesAnalyzed}</strong></span>
                      <span>Matches: <strong className="text-emerald-400">{job.matchesFound}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-white/10" title="Pause">
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-white/10" title="Cancel">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Hardware & Index Status */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-lg shadow-black/10">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Workstation Status</h3>
              </div>
              <button
                onClick={onOpenBenchmark}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium cursor-pointer"
              >
                Run Benchmark
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-900/60 backdrop-blur-md rounded-xl border border-white/10 space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">GPU Acceleration</div>
                <div className="font-semibold text-slate-200 text-xs">{systemHardware.gpuName}</div>
                <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {systemHardware.cudaVersion} | ONNX TensorRT
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 backdrop-blur-md rounded-xl border border-white/10 space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Local Biometric Models</div>
                <div className="font-semibold text-slate-200 text-xs">OpenCV YuNet (Detect) + SFace (Embed)</div>
                <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Offline On-Premise Engine Loaded
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10">
            <button
              onClick={() => onNavigateTab('cctv_index')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-all cursor-pointer backdrop-blur-xs"
            >
              <DatabaseZap className="w-3.5 h-3.5 text-blue-400" />
              <span>Manage CCTV Vector Indexes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Cases Table */}
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg shadow-black/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-slate-100">Recent Candidate Search Cases</h3>
          </div>
          <button
            onClick={() => onNavigateTab('cases')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium cursor-pointer"
          >
            <span>View All Cases</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-3.5">Case Code</th>
                <th className="py-3 px-3.5">Candidate</th>
                <th className="py-3 px-3.5">Examination & Centre</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-center">Matches</th>
                <th className="py-3 px-3.5 text-center">Clips</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.04] transition-colors">
                  <td className="py-3 px-3.5 font-mono font-bold text-blue-400">{c.caseCode}</td>
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2.5">
                      {c.candidate?.photoUrl ? (
                        <img 
                          src={c.candidate.photoUrl} 
                          alt="Candidate" 
                          className="w-7 h-7 rounded object-cover border border-white/15" 
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center text-slate-400 font-mono text-[10px] border border-white/10">
                          N/A
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-200">{c.candidate?.candidateName || 'N/A'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{c.candidate?.rollNumber || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 max-w-xs truncate">
                    <div className="text-slate-200 font-medium truncate">{c.examName}</div>
                    <div className="text-[11px] text-slate-400 truncate">{c.centreName}</div>
                  </td>
                  <td className="py-3 px-3.5 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-medium backdrop-blur-xs ${
                      c.status === 'Completed' || c.status === 'Exported'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : c.status === 'Review Required'
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 animate-pulse'
                        : c.status === 'Searching' || c.status === 'Indexing'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-white/5 text-slate-300 border border-white/10'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-center font-mono font-semibold text-slate-200">
                    {c.totalMatchesCount}
                  </td>
                  <td className="py-3 px-3.5 text-center font-mono font-semibold text-purple-300">
                    {c.clipsCount}
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    <button
                      onClick={() => {
                        onSelectCase(c.id);
                        onNavigateTab('search_results');
                      }}
                      className="px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all backdrop-blur-xs cursor-pointer"
                    >
                      Open Case
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
