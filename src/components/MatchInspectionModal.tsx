import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Film, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Sliders, 
  Camera, 
  Maximize2,
  Clock,
  Sparkles
} from 'lucide-react';
import { SearchResultMatch, Candidate, AppSettings } from '../types';
import { formatSecondsToTimecode, formatTimeOfDay } from '../services/cryptoUtils';

interface MatchInspectionModalProps {
  match: SearchResultMatch;
  candidate: Candidate;
  settings: AppSettings;
  onClose: () => void;
  onConfirmMatch: (matchId: string, notes?: string) => void;
  onRejectMatch: (matchId: string, notes?: string) => void;
  onGenerateClip: (matchId: string, preRoll: number, postRoll: number) => void;
}

export const MatchInspectionModal: React.FC<MatchInspectionModalProps> = ({
  match,
  candidate,
  settings,
  onClose,
  onConfirmMatch,
  onRejectMatch,
  onGenerateClip,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(match.peakTimestampSeconds);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [preRoll, setPreRoll] = useState(settings.preRollSeconds);
  const [postRoll, setPostRoll] = useState(settings.postRollSeconds);
  const [auditorNotes, setAuditorNotes] = useState(match.reviewNotes || '');

  const startSec = Math.max(0, match.eventStartSeconds - 15);
  const endSec = match.eventEndSeconds + 15;
  const durationWindow = endSec - startSec;

  const animationFrameRef = useRef<number | null>(null);

  // Playback timer simulation
  useEffect(() => {
    let lastTime = performance.now();
    const loop = (now: number) => {
      if (isPlaying) {
        const deltaSec = ((now - lastTime) / 1000) * playbackSpeed;
        setCurrentTimeSec((prev) => {
          const next = prev + deltaSec;
          if (next >= endSec) {
            setIsPlaying(false);
            return endSec;
          }
          return next;
        });
      }
      lastTime = now;
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, endSec]);

  const handleSeek = (val: number) => {
    setCurrentTimeSec(val);
  };

  const handleStepFrame = (frames: number) => {
    const fps = 25;
    const delta = frames / fps;
    setCurrentTimeSec(prev => Math.max(startSec, Math.min(endSec, prev + delta)));
  };

  return (
    <div 
      id="match-inspection-modal" 
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="bg-[#0f172a]/90 backdrop-blur-2xl border border-white/15 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="h-12 bg-white/[0.03] px-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-400" />
              <span>Match Inspection & Dual-View Biometric Audit</span>
            </span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
              {match.cameraName}
            </span>
            <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-xs ${
              match.confidenceBand === 'High' 
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}>
              {(match.similarityScore * 100).toFixed(1)}% Match ({match.confidenceBand})
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Split Screen */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left Col: Candidate Reference Photo & Biometric Card */}
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-slate-200 border-b border-white/10 pb-2 flex items-center justify-between">
                <span>Reference Profile</span>
                <span className="font-mono text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{candidate.rollNumber}</span>
              </div>

              <div className="flex justify-center">
                <div className="relative group">
                  <img
                    src={candidate.photoUrl}
                    alt="Candidate Reference"
                    className="w-44 h-52 object-cover rounded-xl border border-white/15 shadow-md"
                  />
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-md text-[10px] text-center font-mono py-0.5 rounded-md text-emerald-400 border border-emerald-500/30">
                    SFace Vector Master
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Candidate Name</span>
                  <span className="font-semibold text-slate-200">{candidate.candidateName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Expected Appearance</span>
                  <span className="text-slate-300 text-[11px]">
                    {candidate.appearanceTags?.upperClothingColor || 'Standard'} • {candidate.appearanceTags?.hasBackpack ? 'With Bag' : 'No Bag'}
                  </span>
                </div>
              </div>
            </div>

            {/* Center & Right (2 cols): CCTV Video Player & Bounding Box Overlay */}
            <div className="md:col-span-2 space-y-3">
              <div className="relative aspect-video bg-black/90 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center group shadow-md">
                <img
                  src={match.cctvFrameUrl}
                  alt="CCTV Frame"
                  className="w-full h-full object-cover"
                />

                {/* CCTV OSD Timecode HUD Overlay */}
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg text-white font-mono text-xs tracking-wider flex items-center gap-2 border border-white/20 shadow">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>{match.cameraName}</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-emerald-400">{formatTimeOfDay(9, 0, Math.round(currentTimeSec))}</span>
                </div>

                {/* Simulated Bounding Box HUD around candidate */}
                <div 
                  className="absolute border-2 border-emerald-400 bg-emerald-500/20 backdrop-blur-[1px] rounded pointer-events-none transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  style={{
                    left: `${(match.boundingBox.x / 1920) * 100}%`,
                    top: `${(match.boundingBox.y / 1080) * 100}%`,
                    width: `${(match.boundingBox.w / 1920) * 100}%`,
                    height: `${(match.boundingBox.h / 1080) * 100}%`,
                  }}
                >
                  <div className="absolute -top-5 left-0 bg-emerald-500 text-white font-mono text-[9px] px-1.5 py-0.2 rounded font-bold whitespace-nowrap shadow">
                    {(match.similarityScore * 100).toFixed(1)}% {match.searchType.split(' ')[0]}
                  </div>
                </div>

                {/* Center Big Play overlay if paused */}
                {!isPlaying && (
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="absolute w-12 h-12 rounded-full bg-blue-600/90 hover:bg-blue-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Play className="w-5 h-5 ml-0.5" />
                  </button>
                )}
              </div>

              {/* Scrubber & Controls */}
              <div className="bg-white/[0.04] backdrop-blur-xl p-3.5 rounded-xl border border-white/10 space-y-2.5">
                {/* Timeline Scrubber */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {formatSecondsToTimecode(currentTimeSec)}
                  </span>
                  <input
                    type="range"
                    min={startSec}
                    max={endSec}
                    step={0.1}
                    value={currentTimeSec}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="flex-1 accent-blue-500 bg-slate-800/80 rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {formatSecondsToTimecode(endSec)}
                  </span>
                </div>

                {/* Player Buttons Row */}
                <div className="flex items-center justify-between pt-1">
                  {/* Left: Play/Pause, Step Frame, Speeds */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-[0_0_10px_rgba(37,99,235,0.3)] cursor-pointer"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleStepFrame(-1)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/10 cursor-pointer"
                      title="Step -1 Frame"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleStepFrame(1)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/10 cursor-pointer"
                      title="Step +1 Frame"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-px bg-white/10 mx-1" />

                    {/* Speed Selector */}
                    <div className="flex items-center gap-1 text-[11px] font-mono">
                      {[0.25, 0.5, 1.0, 2.0, 4.0].map(speed => (
                        <button
                          key={speed}
                          onClick={() => setPlaybackSpeed(speed)}
                          className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                            playbackSpeed === speed
                              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 font-bold'
                              : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right: Clip Extraction Configuration */}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">
                      Pre: <strong>{preRoll}s</strong> | Post: <strong>{postRoll}s</strong>
                    </span>
                    <button
                      onClick={() => onGenerateClip(match.id, preRoll, postRoll)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all cursor-pointer"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>{match.clipGenerated ? 'Regenerate Clip' : 'Extract Clip'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Auditor Decision & Verification Notes (Mandatory Human Review) */}
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-slate-100">Mandatory Human Verification Sign-Off</h4>
              </div>
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-xs ${
                match.reviewStatus === 'Confirmed'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : match.reviewStatus === 'Rejected'
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}>
                Current Verdict: {match.reviewStatus.toUpperCase()}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={auditorNotes}
                onChange={e => setAuditorNotes(e.target.value)}
                placeholder="Auditor observation notes (e.g. Identity verified via admit card & facial landmarks)..."
                className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 backdrop-blur-sm"
              />

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onConfirmMatch(match.id, auditorNotes)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 text-xs font-bold shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all cursor-pointer backdrop-blur-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>CONFIRM MATCH</span>
                </button>

                <button
                  onClick={() => onRejectMatch(match.id, auditorNotes)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-xs font-medium transition-all cursor-pointer backdrop-blur-xs"
                >
                  <XCircle className="w-4 h-4" />
                  <span>REJECT MATCH</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
