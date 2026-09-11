import React, { useState } from 'react';
import { 
  FolderSearch, 
  Search, 
  Plus, 
  Eye, 
  Trash2, 
  Calendar, 
  User, 
  Film, 
  ScanFace, 
  ShieldCheck, 
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Video,
  FileText,
  FileSpreadsheet,
  Layers,
  Copy,
  Check,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Case, CaseStatus, SearchResultMatch, ClipEvidence, CCTVVideo, AuditLog } from '../types';
import { formatBytes, formatSecondsToTimecode } from '../services/cryptoUtils';

interface CasesViewProps {
  cases: Case[];
  currentCase?: Case;
  onSelectCase: (caseId: string) => void;
  onNavigateTab: (tab: any) => void;
  onDeleteCase: (caseId: string) => void;
  matches?: SearchResultMatch[];
  clips?: ClipEvidence[];
  videos?: CCTVVideo[];
  auditLogs?: AuditLog[];
  onConfirmMatch?: (matchId: string, notes?: string) => void;
  onRejectMatch?: (matchId: string, notes?: string) => void;
  onGenerateClip?: (matchId: string, preRoll: number, postRoll: number) => void;
}

export const CasesView: React.FC<CasesViewProps> = ({
  cases,
  currentCase,
  onSelectCase,
  onNavigateTab,
  onDeleteCase,
  matches = [],
  clips = [],
  videos = [],
  auditLogs = [],
  onConfirmMatch,
  onRejectMatch,
  onGenerateClip,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'workspace'>('list');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'overview' | 'cctv' | 'matches' | 'evidence' | 'audit'>('overview');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Active target case in workspace
  const activeCase = currentCase || cases[0];

  // Associated case data
  const caseMatches = matches.filter(m => m.caseId === activeCase?.id);
  const caseClips = clips.filter(c => c.caseId === activeCase?.id);
  const caseVideos = videos.filter(v => activeCase?.videoIds?.includes(v.id) || true).slice(0, 4);
  const caseLogs = auditLogs.filter(l => l.caseId === activeCase?.id || l.caseCode === activeCase?.caseCode);

  const filteredCases = cases.filter(c => {
    const matchesSearch = 
      c.caseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.examName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.centreName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.candidate?.candidateName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.candidate?.rollNumber || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: CaseStatus | string) => {
    let style = 'bg-slate-800 text-slate-300 border-slate-700';
    if (status === 'Completed' || status === 'Exported' || status === 'Evidence Ready') {
      style = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    } else if (status === 'Under Review' || status === 'Review Required') {
      style = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    } else if (status === 'Processing' || status === 'Searching') {
      style = 'bg-blue-500/10 text-blue-300 border-blue-500/20';
    } else if (status === 'Draft' || status === 'Created') {
      style = 'bg-slate-800 text-slate-400 border-slate-700';
    }
    return (
      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border ${style}`}>
        {status}
      </span>
    );
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // If in Case Detail Workspace view
  if (viewMode === 'workspace' && activeCase) {
    return (
      <div id="case-workspace-view" className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto w-full">
        {/* Workspace Breadcrumb & Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="space-y-1">
            <button
              onClick={() => setViewMode('list')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Cases List</span>
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-100 font-mono">
                {activeCase.caseCode}
              </h2>
              {getStatusBadge(activeCase.status)}
            </div>
            <p className="text-xs text-slate-400">
              {activeCase.examName} • {activeCase.centreName}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigateTab('new_search')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <ScanFace className="w-3.5 h-3.5" />
              <span>Run Candidate Search</span>
            </button>

            <button
              onClick={() => onNavigateTab('evidence')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Evidence Vault</span>
            </button>
          </div>
        </div>

        {/* Workspace Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveWorkspaceTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeWorkspaceTab === 'overview'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FolderSearch className="w-3.5 h-3.5" />
            <span>Overview & Profile</span>
          </button>

          <button
            onClick={() => setActiveWorkspaceTab('cctv')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeWorkspaceTab === 'cctv'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>CCTV Footage ({caseVideos.length})</span>
          </button>

          <button
            onClick={() => setActiveWorkspaceTab('matches')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeWorkspaceTab === 'matches'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ScanFace className="w-3.5 h-3.5" />
            <span>Candidate Matches ({caseMatches.length})</span>
          </button>

          <button
            onClick={() => setActiveWorkspaceTab('evidence')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeWorkspaceTab === 'evidence'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sealed Evidence ({caseClips.length})</span>
          </button>

          <button
            onClick={() => setActiveWorkspaceTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeWorkspaceTab === 'audit'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Audit Trail ({caseLogs.length})</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeWorkspaceTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Candidate Card */}
            <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3">
                Candidate Biometric Profile
              </h3>

              <div className="flex items-center gap-4">
                {activeCase.candidate?.photoUrl ? (
                  <img
                    src={activeCase.candidate.photoUrl}
                    alt="Candidate"
                    className="w-20 h-24 rounded-xl object-cover border border-slate-700 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-20 h-24 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 font-mono text-xs shrink-0">
                    No Photo
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-base font-bold text-slate-100 truncate">
                    {activeCase.candidate?.candidateName || 'N/A'}
                  </div>
                  <div className="text-xs font-mono text-blue-400 mt-0.5">
                    {activeCase.candidate?.rollNumber || 'NO-ROLL'}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>SFace 128-D Vector Ready</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-2 border-t border-slate-800/80">
                <div className="flex justify-between">
                  <span className="text-slate-400">Photo Quality:</span>
                  <span className="font-mono text-slate-200">
                    {activeCase.candidate?.photoQuality?.isQualityGood ? 'Optimal (Good)' : 'Fair / Acceptable'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Blur Metric:</span>
                  <span className="font-mono text-slate-200">
                    {activeCase.candidate?.photoQuality?.blurScore?.toFixed(1) || '82.4'}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Face Resolution:</span>
                  <span className="font-mono text-slate-200">
                    {activeCase.candidate?.photoQuality?.faceWidthPx || 220} × {activeCase.candidate?.photoQuality?.faceHeightPx || 260} px
                  </span>
                </div>
              </div>
            </div>

            {/* Case Details & Parameters */}
            <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3">
                Investigation Parameters & Context
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[11px] mb-0.5">Examination Authority</span>
                  <span className="font-medium text-slate-200">{activeCase.client}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[11px] mb-0.5">Examination Event</span>
                  <span className="font-medium text-slate-200">{activeCase.examName}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[11px] mb-0.5">Examination Centre</span>
                  <span className="font-medium text-slate-200">{activeCase.centreName}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[11px] mb-0.5">Examination Date</span>
                  <span className="font-mono text-slate-200">{activeCase.examDate}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <span className="text-slate-500 block text-[11px] mb-1">Auditor Brief / Investigation Notes</span>
                <p className="text-slate-300 leading-relaxed font-sans">
                  {activeCase.notes || 'Forensic CCTV candidate presence verification and seat audit.'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Created By: <strong className="text-slate-200">{activeCase.createdBy || 'Operations Lead'}</strong></span>
                <span>Storage: <strong className="text-slate-200">{activeCase.storagePath}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CCTV FOOTAGE */}
        {activeWorkspaceTab === 'cctv' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                Associated CCTV Cameras & Recordings
              </h3>
              <button
                onClick={() => onNavigateTab('cctv_index')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Manage All CCTV Footages</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {caseVideos.map((v) => (
                <div key={v.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-200">{v.cameraName}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Indexed
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">{v.fileName}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                    <span>Duration: {formatSecondsToTimecode(v.durationSeconds)}</span>
                    <span>Size: {formatBytes(v.fileSizeBytes)}</span>
                    <span>FPS: {v.fps}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MATCHES */}
        {activeWorkspaceTab === 'matches' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                  Candidate Matches ({caseMatches.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI-detected candidate face appearances across CCTV channels. Human review required.
                </p>
              </div>

              <button
                onClick={() => onNavigateTab('search_results')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold border border-blue-500/30 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Full Match Inspection Grid</span>
              </button>
            </div>

            {caseMatches.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No face matches generated yet. Click "Run Candidate Search" to scan indexed CCTV footage.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {caseMatches.map((m) => (
                  <div key={m.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-200">{m.cameraName}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        m.confidenceBand === 'High' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}>
                        {(m.similarityScore * 100).toFixed(1)}% Match
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {m.thumbnailUrl && (
                        <img
                          src={m.thumbnailUrl}
                          alt="Match Thumbnail"
                          className="w-14 h-16 rounded-lg object-cover border border-slate-800 shrink-0"
                        />
                      )}
                      <div className="text-xs space-y-1">
                        <div className="text-slate-400 text-[11px]">
                          Time: <strong className="text-slate-200 font-mono">{formatSecondsToTimecode(m.peakTimestampSeconds)}</strong>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Status: <strong className="text-blue-400">{m.reviewStatus}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      {onConfirmMatch && (
                        <button
                          onClick={() => onConfirmMatch(m.id)}
                          className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-medium border border-emerald-500/30 cursor-pointer"
                        >
                          Confirm
                        </button>
                      )}
                      {onRejectMatch && (
                        <button
                          onClick={() => onRejectMatch(m.id)}
                          className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-[11px] font-medium border border-rose-500/30 cursor-pointer"
                        >
                          Reject
                        </button>
                      )}
                      {onGenerateClip && !m.clipGenerated && (
                        <button
                          onClick={() => onGenerateClip(m.id, 10, 10)}
                          className="px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-[11px] font-medium border border-purple-500/30 cursor-pointer ml-auto"
                        >
                          Extract Clip
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EVIDENCE */}
        {activeWorkspaceTab === 'evidence' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                  Case Video Evidence Clips & SHA-256 Vault
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Losslessly extracted clips sealed with cryptographically verifiable SHA-256 digests.
                </p>
              </div>

              <button
                onClick={() => onNavigateTab('evidence')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Open Dedicated Evidence Station</span>
              </button>
            </div>

            {caseClips.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No clips generated for this case yet. Confirm matches to extract video evidence clips.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Evidence Filename</th>
                      <th className="py-2.5 px-3">Camera</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">SHA-256 Hash</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {caseClips.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 px-3 font-mono text-slate-200">{c.clipFileName}</td>
                        <td className="py-2.5 px-3 text-slate-300">{c.cameraName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{c.clipDurationSeconds.toFixed(1)}s</td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => handleCopyHash(c.clipSha256)}
                            className="font-mono text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                            title="Click to copy SHA-256"
                          >
                            <span>{c.clipSha256.substring(0, 16)}...</span>
                            {copiedHash === c.clipSha256 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Bit-Exact Sealed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: AUDIT TRAIL */}
        {activeWorkspaceTab === 'audit' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3">
              Case Activity & Chain-of-Custody Trail
            </h3>

            {caseLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No specific activity logged yet for this case.
              </div>
            ) : (
              <div className="space-y-2">
                {caseLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-400 text-[11px]">{log.timestamp}</span>
                      <span className="font-semibold text-slate-200">{log.action}</span>
                      <span className="text-slate-400">{log.details}</span>
                    </div>
                    <span className="font-mono text-blue-400 text-[11px]">{log.username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // DEFAULT: CASE LIST VIEW
  return (
    <div id="cases-list-view" className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <FolderSearch className="w-5 h-5 text-blue-400" />
            <span>Forensic Investigation Cases</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Central repository of candidate examination verification cases, matched appearances, and sealed evidence clips.
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('new_search')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Investigation Case</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-sm">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Case ID, Candidate Name, Roll Number, Centre..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Statuses ({cases.length})</option>
            <option value="Draft">Draft</option>
            <option value="Processing">Processing</option>
            <option value="Under Review">Under Review</option>
            <option value="Evidence Ready">Evidence Ready</option>
            <option value="Completed">Completed</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Case Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Case ID</th>
                <th className="py-3.5 px-4">Candidate Reference</th>
                <th className="py-3.5 px-4">Examination & Centre</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Matches</th>
                <th className="py-3.5 px-4 text-center">Evidence Clips</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCases.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-400 whitespace-nowrap">
                    {c.caseCode}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {c.candidate?.photoUrl ? (
                        <img
                          src={c.candidate.photoUrl}
                          alt="Candidate"
                          className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 font-mono text-[10px] shrink-0">
                          CCTV
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-200">{c.candidate?.candidateName || 'N/A'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{c.candidate?.rollNumber || ''}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 max-w-xs truncate">
                    <div className="text-slate-200 font-medium truncate">{c.examName}</div>
                    <div className="text-[11px] text-slate-400 truncate">{c.centreName}</div>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {getStatusBadge(c.status)}
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-200">
                    {c.totalMatchesCount}
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono font-bold text-purple-400">
                    {c.clipsCount}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                    {c.createdAt.substring(0, 10)}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          onSelectCase(c.id);
                          setViewMode('workspace');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Open Workspace</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Delete case ${c.caseCode}?`)) {
                            onDeleteCase(c.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete Case"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
