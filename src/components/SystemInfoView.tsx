import React from 'react';
import { 
  Cpu, 
  HardDrive, 
  Gauge, 
  ShieldCheck, 
  Layers, 
  CheckCircle2, 
  Zap, 
  Activity,
  FolderOpen
} from 'lucide-react';
import { SystemHardwareInfo } from '../types';

interface SystemInfoViewProps {
  hardware: SystemHardwareInfo;
  onOpenBenchmark: () => void;
}

export const SystemInfoView: React.FC<SystemInfoViewProps> = ({
  hardware,
  onOpenBenchmark,
}) => {
  return (
    <div id="system-info-view" className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/20">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <span>Workstation System Diagnostics & Hardware Acceleration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry of CPU multithreading, NVIDIA GPU inference acceleration, and local storage read/write metrics.
          </p>
        </div>

        <button
          onClick={onOpenBenchmark}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all cursor-pointer backdrop-blur-xs"
        >
          <Gauge className="w-4 h-4" />
          <span>Run Hardware Benchmark</span>
        </button>
      </div>

      {/* Hardware Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* GPU Acceleration Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <Zap className="w-4 h-4" />
              <span>GPU Inference Accelerator</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-semibold">
              ONLINE
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[11px] block">Model:</span>
              <span className="text-slate-100 font-bold">{hardware.gpuName}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block">Runtime Engine:</span>
              <span className="text-emerald-400">{hardware.cudaVersion} / TensorRT 10.x</span>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-slate-400 text-[11px] mb-1.5 font-sans">
                <span>GPU Core Load:</span>
                <span className="text-slate-200 font-mono font-bold">{hardware.gpuUsagePercent}%</span>
              </div>
              <div className="h-2 w-full bg-slate-900/80 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-emerald-400 rounded-full transition-all shadow-[0_0_10px_rgba(52,211,153,0.5)]" style={{ width: `${hardware.gpuUsagePercent}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px] mb-1.5 font-sans">
                <span>VRAM Usage:</span>
                <span className="text-slate-200 font-mono font-bold">{(hardware.vramUsedGb ?? hardware.gpuVramUsedGb ?? 6).toFixed(1)} / {hardware.vramTotalGb ?? hardware.gpuVramTotalGb ?? 24} GB</span>
              </div>
              <div className="h-2 w-full bg-slate-900/80 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-blue-400 rounded-full transition-all shadow-[0_0_10px_rgba(96,165,250,0.5)]" style={{ width: `${(((hardware.vramUsedGb ?? hardware.gpuVramUsedGb ?? 6)) / (hardware.vramTotalGb ?? hardware.gpuVramTotalGb ?? 24)) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* CPU & RAM Telemetry Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
              <Cpu className="w-4 h-4" />
              <span>Processor & Memory</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-semibold">
              ACTIVE
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[11px] block">Processor:</span>
              <span className="text-slate-100 font-bold">{hardware.cpuModel}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block">Concurrency:</span>
              <span className="text-slate-300">{hardware.cpuThreads || hardware.cpuCores * 2} Threads ({hardware.cpuCores} Cores)</span>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-slate-400 text-[11px] mb-1.5 font-sans">
                <span>CPU Usage:</span>
                <span className="text-slate-200 font-mono font-bold">{hardware.cpuUsagePercent}%</span>
              </div>
              <div className="h-2 w-full bg-slate-900/80 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-blue-500 rounded-full transition-all shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${hardware.cpuUsagePercent}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px] mb-1.5 font-sans">
                <span>System RAM:</span>
                <span className="text-slate-200 font-mono font-bold">{hardware.ramUsedGb.toFixed(1)} / {hardware.ramTotalGb} GB</span>
              </div>
              <div className="h-2 w-full bg-slate-900/80 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-purple-400 rounded-full transition-all shadow-[0_0_10px_rgba(192,132,252,0.5)]" style={{ width: `${(hardware.ramUsedGb / hardware.ramTotalGb) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Local AI Biometric Models Info */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
              <Layers className="w-4 h-4" />
              <span>Local ONNX Model Zoo</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-semibold">
              OFFLINE READY
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-1 backdrop-blur-xs">
              <div className="flex items-center justify-between font-semibold text-slate-200">
                <span>1. Face Detection: YuNet</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">ONNX 3.4 MB</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ultra-lightweight CNN. Detects faces from 20px upwards across arbitrary poses.
              </p>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-1 backdrop-blur-xs">
              <div className="flex items-center justify-between font-semibold text-slate-200">
                <span>2. Face Recognition: SFace</span>
                <span className="text-[10px] font-mono text-blue-400 font-bold">ONNX 37.8 MB</span>
              </div>
              <p className="text-[11px] text-slate-400">
                SphereFace2 128-dimensional embedding model with cosine similarity matching.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
