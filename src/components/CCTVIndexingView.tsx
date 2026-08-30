import React, { useState } from 'react';
import { 
  DatabaseZap, 
  RotateCw, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  HardDrive, 
  Clock, 
  Cpu, 
  Layers, 
  FileCheck,
  Plus
} from 'lucide-react';
import { CCTVVideo } from '../types';
import { formatBytes, formatSecondsToTimecode } from '../services/cryptoUtils';

interface CCTVIndexingViewProps {
  videos: CCTVVideo[];
  onIndexVideo: (videoId: string) => void;
  onBulkIndex: () => void;
  onDeleteIndex: (videoId: string) => void;
}

export const CCTVIndexingView: React.FC<CCTVIndexingViewProps> = ({
  videos,
  onIndexVideo,
  onBulkIndex,
  onDeleteIndex,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<CCTVVideo | null>(videos[0] || null);

  const filteredVideos = videos.filter(v => 
    v.cameraName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexedCount = videos.filter(v => v.isIndexed).length;
  const unindexedCount = videos.length - indexedCount;
  const totalFaces = videos.reduce((acc, v) => acc + (v.facesDetectedCount || 0), 0);

  return (
    <div id="cctv-indexing-view" className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto w-full">
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/20">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <DatabaseZap className="w-5 h-5 text-blue-400" />
            <span>CCTV Local Vector Indexing Hub (FAISS / Local Engine)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pre-index recorded CCTV footage so candidate searches complete in seconds rather than repeatedly decoding gigabytes of raw video.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {unindexedCount > 0 && (
            <button
              onClick={onBulkIndex}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all cursor-pointer backdrop-blur-xs"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Index All ({unindexedCount} Pending)</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 flex items-center justify-between shadow-lg shadow-black/10">
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Indexed CCTV Files</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {indexedCount} / {videos.length}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 backdrop-blur-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 flex items-center justify-between shadow-lg shadow-black/10">
          <div>
            <div className="text-xs text-slate-400 font-medium">Vector Embeddings Cached</div>
            <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
              {totalFaces.toLocaleString()} faces
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 backdrop-blur-xs">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 flex items-center justify-between shadow-lg shadow-black/10">
          <div>
            <div className="text-xs text-slate-400 font-medium">Storage Location</div>
            <div className="text-xs font-bold font-mono text-slate-200 mt-1 truncate max-w-[200px]">
              D:\CCTV_Ops\Indexes\
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 backdrop-blur-xs">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Video List & Metadata Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Video List */}
        <div className="lg:col-span-2 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">CCTV Video Repository</h3>
            <input
              type="text"
              placeholder="Search camera or file..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 w-56 focus:outline-none focus:border-blue-500 backdrop-blur-sm"
            />
          </div>

          <div className="space-y-2">
            {filteredVideos.map((video) => {
              const isSelected = selectedVideo?.id === video.id;
              return (
                <div
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all backdrop-blur-xs ${
                    isSelected
                      ? 'bg-blue-500/10 border-blue-500/60 shadow-sm'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      video.isIndexed ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {video.isIndexed ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-slate-200">{video.cameraName}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate max-w-sm">
                        {video.fileName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-slate-400">{formatSecondsToTimecode(video.durationSeconds)}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border backdrop-blur-xs ${
                      video.isIndexed 
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}>
                      {video.isIndexed ? 'Indexed' : 'Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Detailed Video & Index Metadata */}
        {selectedVideo ? (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-lg shadow-black/10">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h3 className="text-xs font-bold text-slate-200">Video & Vector Specs</h3>
                <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">{selectedVideo.cameraName}</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">File Name:</span>
                  <span className="font-mono text-slate-200 break-all">{selectedVideo.fileName}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">File Path:</span>
                  <span className="font-mono text-slate-300 text-[11px] break-all">{selectedVideo.filePath}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-xs">
                    <span className="text-slate-500 block text-[10px]">Resolution</span>
                    <span className="text-slate-200 font-semibold">{selectedVideo.width} × {selectedVideo.height}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-xs">
                    <span className="text-slate-500 block text-[10px]">FPS</span>
                    <span className="text-slate-200 font-semibold">{selectedVideo.fps} FPS</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-xs">
                    <span className="text-slate-500 block text-[10px]">Duration</span>
                    <span className="text-slate-200 font-semibold">{formatSecondsToTimecode(selectedVideo.durationSeconds)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-xs">
                    <span className="text-slate-500 block text-[10px]">File Size</span>
                    <span className="text-slate-200 font-semibold">{formatBytes(selectedVideo.fileSizeBytes)}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-xs">
                  <span className="text-slate-500 text-[10px] block font-mono">SHA-256 Content Hash:</span>
                  <span className="text-slate-300 font-mono text-[10px] break-all">{selectedVideo.fileHash}</span>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs backdrop-blur-xs">
                  <div className="text-blue-300 font-semibold mb-1 flex items-center gap-1.5">
                    <DatabaseZap className="w-3.5 h-3.5" />
                    <span>Vector Index Details</span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-0.5">
                    <div>Status: <strong className="text-slate-100">{selectedVideo.isIndexed ? 'Indexed (Cached)' : 'Not Indexed'}</strong></div>
                    {selectedVideo.isIndexed && (
                      <>
                        <div>Detected Faces: <strong className="text-emerald-400">{selectedVideo.facesDetectedCount}</strong></div>
                        <div>Indexed At: <span className="font-mono text-slate-400">{selectedVideo.indexedAt}</span></div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex gap-2">
              <button
                onClick={() => onIndexVideo(selectedVideo.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all cursor-pointer backdrop-blur-xs"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{selectedVideo.isIndexed ? 'Rebuild Index' : 'Build Index Now'}</span>
              </button>

              {selectedVideo.isIndexed && (
                <button
                  onClick={() => onDeleteIndex(selectedVideo.id)}
                  className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 text-slate-400 text-xs transition-all border border-white/10 cursor-pointer backdrop-blur-xs"
                  title="Delete Vector Index"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
