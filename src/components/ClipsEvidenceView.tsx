import React, { useState } from 'react';
import { 
  Film, 
  Copy, 
  Check, 
  FolderCheck, 
  Play, 
  ShieldCheck, 
  Download, 
  FileText, 
  Clock, 
  HardDrive,
  CheckCircle2,
  ExternalLink,
  Lock
} from 'lucide-react';
import { ClipEvidence, Case } from '../types';
import { formatSecondsToTimecode, formatBytes } from '../services/cryptoUtils';
import { generateHashManifest } from '../services/reportGenerator';

interface ClipsEvidenceViewProps {
  currentCase?: Case;
  clips: ClipEvidence[];
  onPlayClip?: (clip: ClipEvidence) => void;
}

export const ClipsEvidenceView: React.FC<ClipsEvidenceViewProps> = ({
  currentCase,
  clips,
  onPlayClip,
}) => {
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);
  const [activeClipModal, setActiveClipModal] = useState<ClipEvidence | null>(null);

  const handleCopyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2000);
  };

  const handleDownloadManifest = () => {
    if (!currentCase) return;
    generateHashManifest(currentCase, clips);
  };

  const caseClips = currentCase 
    ? clips.filter(c => c.caseId === currentCase.id) 
    : clips;

  return (
    <div id="clips-evidence-view" className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/20">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Film className="w-5 h-5 text-purple-400" />
            <span>Extracted CCTV Video Evidence Clips & SHA-256 Vault</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Forensically trimmed MP4 clips with pre-roll/post-roll time buffers and cryptographic hash verification logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {currentCase && caseClips.length > 0 && (
            <button
              onClick={handleDownloadManifest}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-all cursor-pointer backdrop-blur-xs"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Export Evidence_Hashes.txt</span>
            </button>
          )}

          <button
            onClick={() => alert(`Exporting all ${caseClips.length} clips into Evidence zip archive...`)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all cursor-pointer backdrop-blur-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export All Clips ({caseClips.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 flex items-center justify-between shadow-lg shadow-black/10">
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Evidence Clips</div>
            <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
              {caseClips.length} files
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 backdrop-blur-xs">
            <Film className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 flex items-center justify-between shadow-lg shadow-black/10">
          <div>
            <div className="text-xs text-slate-400 font-medium">Cryptographic Standard</div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
              SHA-256 Bit-Exact
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 backdrop-blur-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 flex items-center justify-between shadow-lg shadow-black/10">
          <div>
            <div className="text-xs text-slate-400 font-medium">Storage Directory</div>
            <div className="text-xs font-bold font-mono text-slate-200 mt-1 truncate max-w-[200px]">
              D:\CCTV_Ops\Cases\Clips\
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 backdrop-blur-xs">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Evidence Table */}
      {caseClips.length === 0 ? (
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center text-slate-400 text-xs shadow-lg shadow-black/10">
          No clips generated for this case yet. Go to Search Results and click "Extract Clip" on confirmed candidate appearances.
        </div>
      ) : (
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 font-mono text-[11px] border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4">Clip Preview</th>
                  <th className="py-3.5 px-4">Evidence Filename</th>
                  <th className="py-3.5 px-4">Camera & Time Range</th>
                  <th className="py-3.5 px-4 text-center">Duration</th>
                  <th className="py-3.5 px-4">SHA-256 Integrity Digest</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {caseClips.map((clip) => (
                  <tr key={clip.id} className="hover:bg-white/[0.03] transition-colors">
                    {/* Thumbnail */}
                    <td className="py-3.5 px-4">
                      <div 
                        onClick={() => setActiveClipModal(clip)}
                        className="relative w-16 h-12 rounded-xl overflow-hidden border border-white/15 bg-black cursor-pointer group shadow-sm"
                      >
                        <img
                          src={clip.thumbnailUrl}
                          alt="Clip Thumbnail"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-blue-600/40 transition-colors backdrop-blur-xs">
                          <Play className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </td>

                    {/* Clip Filename */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-semibold text-slate-200 text-xs">{clip.clipFileName}</div>
                      <div className="text-[10px] text-slate-400">
                        Size: {formatBytes(clip.fileSizeBytes)} • {clip.generatedAt.substring(0, 19)}
                      </div>
                    </td>

                    {/* Camera & Time Range */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{clip.cameraName}</div>
                      <div className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatSecondsToTimecode(clip.clipStartSeconds)} → {formatSecondsToTimecode(clip.clipEndSeconds)}</span>
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-200">
                      {clip.clipDurationSeconds} sec
                    </td>

                    {/* SHA-256 Digest */}
                    <td className="py-3.5 px-4 max-w-xs font-mono">
                      <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-white/10 backdrop-blur-xs">
                        <span className="text-[11px] text-emerald-400 truncate flex-1 select-all">
                          {clip.clipSha256}
                        </span>
                        <button
                          onClick={() => handleCopyHash(clip.clipSha256, clip.id)}
                          className="text-slate-400 hover:text-slate-200 shrink-0 cursor-pointer"
                          title="Copy SHA-256 Hash"
                        >
                          {copiedHashId === clip.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                        Source: {clip.sourceFileName} ({clip.sourceFileSha256.substring(0, 12)}...)
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActiveClipModal(clip)}
                          className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer backdrop-blur-xs"
                        >
                          <Play className="w-3 h-3" />
                          <span>Play</span>
                        </button>

                        <button
                          onClick={() => alert(`Opening explorer at: ${clip.clipPath}`)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/10 transition-all cursor-pointer backdrop-blur-xs"
                          title="Show in Windows Explorer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clip Preview Modal */}
      {activeClipModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900/90 border border-white/15 backdrop-blur-2xl rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-sm text-slate-100">{activeClipModal.clipFileName}</span>
              </div>
              <button
                onClick={() => setActiveClipModal(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="aspect-video bg-black rounded-xl overflow-hidden relative border border-white/10 flex items-center justify-center">
              {activeClipModal.clipUrl ? (
                <video
                  src={activeClipModal.clipUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={activeClipModal.thumbnailUrl}
                  alt="Clip Video"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs px-2.5 py-1 rounded-lg text-white font-mono text-xs border border-white/20">
                {activeClipModal.cameraName} • Evidence Clip ({activeClipModal.clipDurationSeconds}s)
              </div>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-white/10 font-mono text-xs space-y-1.5 backdrop-blur-xs">
              <div className="flex justify-between text-slate-400">
                <span>Extraction Pipeline:</span>
                <span className="text-purple-300 font-semibold">{activeClipModal.extractionMethod || 'FFmpeg StreamCopy + Re-encode'}</span>
              </div>
              <div className="text-slate-400">SHA-256 Bit-Exact Cryptographic Hash Digest:</div>
              <div className="text-emerald-400 break-all select-all bg-black/40 p-2 rounded border border-white/5">{activeClipModal.clipSha256}</div>
            </div>

            <div className="flex justify-between items-center gap-2 pt-2">
              {activeClipModal.clipUrl && (
                <a
                  href={activeClipModal.clipUrl}
                  download={activeClipModal.clipFileName}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP4 Evidence</span>
                </a>
              )}
              <button
                onClick={() => setActiveClipModal(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-all cursor-pointer backdrop-blur-xs ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
