import React, { useState } from 'react';
import { 
  ScanFace, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Film, 
  Eye, 
  SlidersHorizontal, 
  Download, 
  Clock, 
  Camera, 
  AlertCircle,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { Case, SearchResultMatch, Candidate, AppSettings } from '../types';
import { formatSecondsToTimecode, formatTimeOfDay } from '../services/cryptoUtils';
import { MatchInspectionModal } from './MatchInspectionModal';

interface SearchResultsViewProps {
  currentCase?: Case;
  matches: SearchResultMatch[];
  onConfirmMatch: (matchId: string, notes?: string) => void;
  onRejectMatch: (matchId: string, notes?: string) => void;
  onGenerateClip: (matchId: string, preRoll: number, postRoll: number) => void;
  onGenerateAllConfirmedClips: () => void;
  settings: AppSettings;
  onExportReport: () => void;
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  currentCase,
  matches,
  onConfirmMatch,
  onRejectMatch,
  onGenerateClip,
  onGenerateAllConfirmedClips,
  settings,
  onExportReport,
}) => {
  const [selectedCameraFilter, setSelectedCameraFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'confidence' | 'timestamp' | 'camera' | 'duration'>('confidence');
  const [inspectedMatch, setInspectedMatch] = useState<SearchResultMatch | null>(null);

  if (!currentCase) {
    return (
      <div className="p-8 text-center text-slate-400">
        No active case selected. Please select a case from the top bar or create a new search.
      </div>
    );
  }

  // Get distinct camera list
  const cameraNames = Array.from(new Set(matches.map(m => m.cameraName)));

  // Filter matches
  const filteredMatches = matches.filter(m => {
    if (selectedCameraFilter !== 'ALL' && m.cameraName !== selectedCameraFilter) return false;
    if (selectedStatusFilter !== 'ALL' && m.reviewStatus !== selectedStatusFilter) return false;
    return true;
  });

  // Sort matches
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    if (sortBy === 'confidence') return b.similarityScore - a.similarityScore;
    if (sortBy === 'timestamp') return a.eventStartSeconds - b.eventStartSeconds;
    if (sortBy === 'camera') return a.cameraName.localeCompare(b.cameraName);
    if (sortBy === 'duration') return (b.eventEndSeconds - b.eventStartSeconds) - (a.eventEndSeconds - a.eventStartSeconds);
    return 0;
  });

  const confirmedCount = matches.filter(m => m.reviewStatus === 'Confirmed').length;
  const pendingCount = matches.filter(m => m.reviewStatus === 'Pending').length;
  const clipsReadyCount = matches.filter(m => m.clipGenerated).length;

  return (
    <div id="search-results-view" className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto w-full">
      {/* Top Banner with Case Info & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/20">
        <div className="flex items-center gap-4">
          {currentCase.candidate?.photoUrl && (
            <img
              src={currentCase.candidate.photoUrl}
              alt="Candidate"
              className="w-14 h-16 object-cover rounded-xl border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)] shrink-0"
            />
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">
                {currentCase.caseCode} — {currentCase.candidate?.candidateName}
              </h2>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 backdrop-blur-xs">
                {currentCase.candidate?.rollNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {currentCase.examName} • {currentCase.centreName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onExportReport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-all backdrop-blur-xs cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Audit Report (PDF)</span>
          </button>

          {confirmedCount > 0 && (
            <button
              onClick={onGenerateAllConfirmedClips}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(168,85,247,0.35)] transition-all cursor-pointer backdrop-blur-xs"
            >
              <Film className="w-4 h-4" />
              <span>Extract All Confirmed Clips ({confirmedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Sorting Toolbar */}
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        {/* Left: Camera and Status Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Camera:</span>
            <select
              value={selectedCameraFilter}
              onChange={e => setSelectedCameraFilter(e.target.value)}
              className="bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 backdrop-blur-sm"
            >
              <option value="ALL">Search All Cameras ({matches.length})</option>
              {cameraNames.map(cam => (
                <option key={cam} value={cam}>{cam}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Review Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 backdrop-blur-sm"
            >
              <option value="ALL">All ({matches.length})</option>
              <option value="Pending">Pending Review ({pendingCount})</option>
              <option value="Confirmed">Confirmed ({confirmedCount})</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Right: Sort options */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-medium">Sort By:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-slate-200 font-medium focus:outline-none focus:border-blue-500 backdrop-blur-sm"
          >
            <option value="confidence">Similarity Confidence (Highest First)</option>
            <option value="timestamp">Timestamp (Chronological)</option>
            <option value="camera">Camera Name</option>
            <option value="duration">Event Duration</option>
          </select>
        </div>
      </div>

      {/* Results Table matching Specification Table */}
      {sortedMatches.length === 0 ? (
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <div className="text-sm font-bold text-slate-200">No sufficiently reliable candidate matches found.</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Checked against {matches.length} appearance observations using similarity threshold {(settings.similarityThresholdHigh * 100).toFixed(0)}%. Try adjusting the filter or search parameters.
          </p>
        </div>
      ) : (
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.03] text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-3.5">Preview</th>
                  <th className="py-3.5 px-3.5">Camera</th>
                  <th className="py-3.5 px-3.5">Time Range & OSD</th>
                  <th className="py-3.5 px-3.5 text-center">Duration</th>
                  <th className="py-3.5 px-3.5 text-center">Similarity</th>
                  <th className="py-3.5 px-3.5 text-center">Stage H Verification</th>
                  <th className="py-3.5 px-3.5 text-center">Audit Status</th>
                  <th className="py-3.5 px-3.5 text-right">Verification Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {sortedMatches.map((match) => {
                  const durationSec = match.eventEndSeconds - match.eventStartSeconds;
                  const vStatus = match.verificationStatus || 'VERIFIED';
                  return (
                    <tr key={match.id} className="hover:bg-white/[0.04] transition-colors">
                      {/* Thumbnail */}
                      <td className="py-3 px-3.5">
                        <div 
                          onClick={() => setInspectedMatch(match)}
                          className="relative w-14 h-12 rounded-lg overflow-hidden border border-white/10 bg-black cursor-pointer group shadow-sm"
                        >
                          <img
                            src={match.thumbnailUrl}
                            alt="Match Crop"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                          <div className="absolute inset-0 bg-blue-600/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </td>

                      {/* Camera */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-200">{match.cameraName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">1080p @ 25 FPS</div>
                      </td>

                      {/* Time Range */}
                      <td className="py-3 px-3.5 font-mono">
                        <div className="text-slate-200 font-semibold flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatSecondsToTimecode(match.eventStartSeconds)} – {formatSecondsToTimecode(match.eventEndSeconds)}</span>
                        </div>
                        <div className="text-[11px] text-emerald-400">
                          OSD: {formatTimeOfDay(9, 0, match.peakTimestampSeconds)}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-3.5 text-center font-mono font-semibold text-slate-300">
                        {durationSec} sec
                      </td>

                      {/* Similarity Score */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="font-mono font-bold text-sm text-slate-100">
                          {(match.similarityScore * 100).toFixed(1)}%
                        </div>
                        <span className={`inline-block text-[10px] font-mono font-semibold px-2 py-0.2 rounded-full border backdrop-blur-xs ${
                          match.confidenceBand === 'High'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : match.confidenceBand === 'Medium'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-white/5 text-slate-400 border-white/10'
                        }`}>
                          {match.confidenceBand} Conf.
                        </span>
                      </td>

                      {/* Stage H Verification Badge & Metrics */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border backdrop-blur-xs ${
                            vStatus === 'VERIFIED'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : vStatus === 'REJECTED'
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : vStatus === 'INCONCLUSIVE'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-white/5 text-slate-400 border-white/10'
                          }`}>
                            {vStatus === 'VERIFIED' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                            {vStatus === 'REJECTED' && <XCircle className="w-3 h-3 text-rose-400" />}
                            <span>{vStatus}</span>
                          </span>

                          {match.verification_match_count !== undefined && (
                            <span className="text-[10px] font-mono text-slate-400">
                              Pass 2: {match.verification_match_count} frames @ {match.verification_sampling_fps || 8} FPS
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Review Status */}
                      <td className="py-3 px-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide backdrop-blur-xs ${
                          match.reviewStatus === 'Confirmed'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : match.reviewStatus === 'Rejected'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse'
                        }`}>
                          {match.reviewStatus === 'Confirmed' && <CheckCircle2 className="w-3 h-3" />}
                          {match.reviewStatus === 'Rejected' && <XCircle className="w-3 h-3" />}
                          <span>{match.reviewStatus.toUpperCase()}</span>
                        </span>
                        {match.reviewer && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{match.reviewer}</div>
                        )}
                      </td>


                      {/* Action Controls */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setInspectedMatch(match)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium border border-white/10 transition-all flex items-center gap-1 backdrop-blur-xs cursor-pointer"
                            title="Dual View Player & Scrubber"
                          >
                            <Eye className="w-3 h-3 text-blue-400" />
                            <span>Preview</span>
                          </button>

                          {match.reviewStatus !== 'Confirmed' ? (
                            <button
                              onClick={() => onConfirmMatch(match.id, 'Auditor confirmed candidate identity')}
                              className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all flex items-center gap-1 backdrop-blur-xs cursor-pointer"
                              title="Confirm Match"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Confirm</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onRejectMatch(match.id, 'Revoked by auditor')}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-xs transition-colors cursor-pointer"
                              title="Reject Match"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => onGenerateClip(match.id, settings.preRollSeconds, settings.postRollSeconds)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 backdrop-blur-xs cursor-pointer ${
                              match.clipGenerated
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                            }`}
                            title="Extract Evidence Clip with Pre/Post Roll"
                          >
                            <Film className="w-3 h-3" />
                            <span>{match.clipGenerated ? 'Clip Ready' : 'Clip'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Match Inspection Modal (Dual View Video Player) */}
      {inspectedMatch && currentCase.candidate && (
        <MatchInspectionModal
          match={inspectedMatch}
          candidate={currentCase.candidate}
          settings={settings}
          onClose={() => setInspectedMatch(null)}
          onConfirmMatch={(id, notes) => {
            onConfirmMatch(id, notes);
            setInspectedMatch(null);
          }}
          onRejectMatch={(id, notes) => {
            onRejectMatch(id, notes);
            setInspectedMatch(null);
          }}
          onGenerateClip={(id, pre, post) => {
            onGenerateClip(id, pre, post);
            setInspectedMatch(null);
          }}
        />
      )}
    </div>
  );
};
