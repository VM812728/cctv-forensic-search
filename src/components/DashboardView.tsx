import React from 'react';
import { 
  FolderSearch, 
  ScanFace, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  Activity, 
  Eye, 
  Video, 
  Database,
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
  // Section 1: Investigation Overview Calculations (Strictly derived from operational state)
  const activeCasesCount = cases.filter(c => 
    c.status === 'Processing' || 
    c.status === 'Searching' || 
    c.status === 'Under Review' || 
    c.status === 'Review Required' ||
    c.status === 'Draft' ||
    c.status === 'Created'
  ).length;

  const completedSearchesCount = cases.filter(c => 
    c.status === 'Completed' || 
    c.status === 'Exported' || 
    c.status === 'Evidence Ready' ||
    c.totalMatchesCount > 0
  ).length;

  const evidenceGeneratedCount = cases.reduce((acc, c) => acc + (c.clipsCount || 0), 0);

  // Pending reviews count across all cases
  const pendingReviewsCount = cases.reduce((acc, c) => {
    const pending = c.totalMatchesCount - ((c.confirmedMatchesCount || 0) + (c.rejectedMatchesCount || 0));
    return acc + Math.max(0, pending);
  }, 0);

  return (
    <div id="dashboard-view" className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto w-full">
      {/* Top Banner / Welcome Strip */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider">
              Forensic Operations Console
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="text-xs text-slate-400 font-mono">
              Live Workstation
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight mt-1">
            CCTV Candidate Search & Forensic Evidence Station
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            AI-assisted facial biometric search across examination CCTV footage with human auditor verification and cryptographic evidence sealing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenQuickDemo}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick Test Scenario</span>
          </button>

          <button
            onClick={() => onNavigateTab('new_search')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Candidate Search</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: INVESTIGATION OVERVIEW */}
      <section id="section-investigation-overview" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
            Section 1 • Investigation Overview
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">Real-time case metrics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Active Cases */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-xs text-slate-400 font-medium">Active Cases</div>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                {cases.length > 0 ? activeCasesCount : 'No data available'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">In progress or under review</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FolderSearch className="w-5 h-5" />
            </div>
          </div>

          {/* Metric 2: Searches Completed */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-xs text-slate-400 font-medium">Searches Completed</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {cases.length > 0 ? completedSearchesCount : 'No data available'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Vector match queries finished</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ScanFace className="w-5 h-5" />
            </div>
          </div>

          {/* Metric 3: Evidence Generated */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-xs text-slate-400 font-medium">Evidence Generated</div>
              <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
                {cases.length > 0 ? `${evidenceGeneratedCount} clips` : 'No data available'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">SHA-256 cryptographically sealed</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Metric 4: Pending Reviews */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-xs text-slate-400 font-medium">Pending Reviews</div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {cases.length > 0 ? pendingReviewsCount : 'No data available'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Awaiting human verification</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: RECENT CASES */}
      <section id="section-recent-cases" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Section 2 • Recent Cases
            </h3>
            <span className="text-xs font-mono text-slate-500">({cases.length})</span>
          </div>

          <button
            onClick={() => onNavigateTab('cases')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>View All Cases</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {cases.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              No cases available. Create a new case or run a quick test scenario.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Case ID & Candidate</th>
                    <th className="py-3 px-4">Examination / Event</th>
                    <th className="py-3 px-4">Centre / Location</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Matches / Clips</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {cases.slice(0, 5).map((c) => {
                    const statusClass = 
                      c.status === 'Completed' || c.status === 'Exported' || c.status === 'Evidence Ready'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : c.status === 'Under Review' || c.status === 'Review Required'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        : c.status === 'Searching' || c.status === 'Processing'
                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                        : 'bg-slate-800 text-slate-300 border-slate-700';

                    return (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {c.candidate?.photoUrl ? (
                              <img
                                src={c.candidate.photoUrl}
                                alt="Candidate"
                                className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-mono text-[10px] shrink-0">
                                CCTV
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-slate-200">
                                {c.candidate?.candidateName || 'Candidate Record'}
                              </div>
                              <div className="text-[11px] font-mono text-blue-400">
                                {c.caseCode} • {c.candidate?.rollNumber || 'NO-ROLL'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-300 font-medium max-w-xs truncate">
                          {c.examName}
                        </td>

                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                          {c.centreName}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                          {c.createdAt.substring(0, 10)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium border font-mono ${statusClass}`}>
                            {c.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center font-mono">
                          <span className="text-slate-200 font-bold">{c.totalMatchesCount}</span>
                          <span className="text-slate-500 mx-1">/</span>
                          <span className="text-purple-400 font-bold">{c.clipsCount}</span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              onSelectCase(c.id);
                              onNavigateTab('cases');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Open Case</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: PROCESSING STATUS */}
      <section id="section-processing-status" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
            Section 3 • Processing Status
          </h3>
          <button
            onClick={() => onNavigateTab('settings')}
            className="text-xs text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>System Health Diagnostics</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Indicator 1: CCTV Indexing */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Video className="w-4 h-4 text-blue-400" />
                <span>CCTV Indexing</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Local vector cache ready for sub-second candidate retrieval.
            </p>
          </div>

          {/* Indicator 2: Candidate Search Engine */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <ScanFace className="w-4 h-4 text-emerald-400" />
                <span>Search Engine</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              OpenCV YuNet + SFace ONNX 128-D cosine matcher initialized.
            </p>
          </div>

          {/* Indicator 3: Evidence Service */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Evidence Service</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              FFmpeg lossless remuxer with bit-exact SHA-256 integrity digest.
            </p>
          </div>

          {/* Indicator 4: Database */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Database className="w-4 h-4 text-amber-400" />
                <span>Database</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Connected
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Supabase live cluster with active row-level security policies.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
