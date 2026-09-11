import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  HardDrive, 
  Sliders, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle, 
  Gauge, 
  Zap, 
  Database,
  Lock,
  ExternalLink,
  FolderOpen,
  Server
} from 'lucide-react';
import { AppSettings, SystemHardwareInfo } from '../types';
import { useAuth } from '../context/AuthContext';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  initialSection?: 'account' | 'system_health' | 'detection' | 'storage' | 'access';
  systemHardware?: SystemHardwareInfo;
  onOpenBenchmark?: () => void;
  onNavigateTab?: (tab: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  initialSection = 'system_health',
  systemHardware,
  onOpenBenchmark,
  onNavigateTab,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'system_health' | 'detection' | 'storage' | 'access'>(initialSection);
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleReset = () => {
    const defaultVals: AppSettings = {
      faceDetectorModel: 'face_detection_yunet_2023mar.onnx (OpenCV YuNet)',
      faceRecognizerModel: 'face_recognition_sface_2021dec.onnx (SFace Cosine)',
      similarityThresholdHigh: 0.65,
      similarityThresholdMedium: 0.50,
      frameSampleFps: 3.0,
      minFaceSizePx: 40,
      gpuEnabled: true,
      preRollSeconds: 10,
      postRollSeconds: 10,
      clipFormat: 'mp4',
      clipQuality: 'High (Lossless Remux)',
      casesDir: 'D:\\CCTV_Ops\\Cases',
      indexDir: 'D:\\CCTV_Ops\\Indexes',
      tempDir: 'C:\\AppData\\Local\\Temp\\CCTV_Scratch',
      exportDir: 'D:\\CCTV_Ops\\Evidence_Exports',
      cpuWorkers: 15,
      gpuBatchSize: 16,
      maxSimultaneousJobs: 2,
    };
    setFormData(defaultVals);
    onSaveSettings(defaultVals);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div id="settings-view" className="p-6 max-w-6xl mx-auto space-y-6 overflow-y-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-blue-400" />
            <span>Station Configuration & System Health</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage your forensic officer profile, system health diagnostics, biometric thresholds, and local storage.
          </p>
        </div>

        {saveSuccess && (
          <span className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Configuration Updated Successfully</span>
          </span>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('system_health')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'system_health'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>System Health & Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'account'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>Account & Credentials</span>
        </button>

        <button
          onClick={() => setActiveTab('detection')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'detection'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Detection & Extraction</span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'storage'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Storage Directories</span>
        </button>

        <button
          onClick={() => setActiveTab('access')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'access'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Security & Policy</span>
        </button>
      </div>

      {/* TAB 1: SYSTEM HEALTH & TELEMETRY */}
      {activeTab === 'system_health' && (
        <div className="space-y-6">
          {/* Health Service Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Backend Service</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Ready
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-200 font-mono">FastAPI :8000</div>
              <div className="text-[11px] text-slate-500">Local CCTV Biometric REST API</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Database Layer</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-200 font-mono">Supabase RLS</div>
              <div className="text-[11px] text-slate-500">Row-Level Security Active</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Biometric Models</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Loaded
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-200 font-mono">YuNet + SFace</div>
              <div className="text-[11px] text-slate-500">128-D Cosine Face Embeddings</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Transcoding / Stream</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Available
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-200 font-mono">FFmpeg Remux</div>
              <div className="text-[11px] text-slate-500">SHA-256 Bit-Exact Extraction</div>
            </div>
          </div>

          {/* Telemetry Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* GPU Telemetry */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <Zap className="w-4 h-4" />
                  <span>Hardware Acceleration (GPU)</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                  ONLINE
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Accelerator:</span>
                  <span className="font-mono font-medium text-slate-200">{systemHardware?.gpuName || 'NVIDIA GeForce RTX 4090'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">CUDA / TensorRT:</span>
                  <span className="font-mono text-emerald-400">{systemHardware?.cudaVersion || 'CUDA 12.4 / TensorRT 10.x'}</span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>GPU Core Compute Load:</span>
                    <span className="font-mono font-bold text-slate-200">{systemHardware?.gpuUsagePercent || 18}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${systemHardware?.gpuUsagePercent || 18}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>VRAM Allocated:</span>
                    <span className="font-mono font-bold text-slate-200">{(systemHardware?.vramUsedGb || 5.8).toFixed(1)} / {systemHardware?.vramTotalGb || 24} GB</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${((systemHardware?.vramUsedGb || 5.8) / (systemHardware?.vramTotalGb || 24)) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* CPU & Memory Telemetry */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
                  <Cpu className="w-4 h-4" />
                  <span>Processor & Host Memory</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-mono border border-blue-500/20">
                  OPTIMAL
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Processor:</span>
                  <span className="font-mono font-medium text-slate-200">{systemHardware?.cpuModel || 'Intel Core i9-14900K'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Concurrency:</span>
                  <span className="font-mono text-slate-300">{systemHardware?.cpuThreads || 32} Threads ({systemHardware?.cpuCores || 24} Cores)</span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>CPU Thread Usage:</span>
                    <span className="font-mono font-bold text-slate-200">{systemHardware?.cpuUsagePercent || 12}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${systemHardware?.cpuUsagePercent || 12}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>System RAM Usage:</span>
                    <span className="font-mono font-bold text-slate-200">{(systemHardware?.ramUsedGb || 19.4).toFixed(1)} / {systemHardware?.ramTotalGb || 64} GB</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${((systemHardware?.ramUsedGb || 19.4) / (systemHardware?.ramTotalGb || 64)) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Benchmark Action Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">Diagnostic Benchmark</div>
              <div className="text-[11px] text-slate-400">Run a simulated high-throughput CCTV face vector processing benchmark.</div>
            </div>
            {onOpenBenchmark && (
              <button
                onClick={onOpenBenchmark}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>Run Hardware Benchmark</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ACCOUNT & CREDENTIALS */}
      {activeTab === 'account' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-base font-mono">
              {currentUser?.fullName
                ? currentUser.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                : (currentUser?.username?.substring(0, 2).toUpperCase() || 'OF')}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">{currentUser?.fullName || currentUser?.username}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{currentUser?.email || 'officer@workstation.local'}</p>
            </div>
            <div className="ml-auto">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {currentUser?.status === 'APPROVED' ? 'Approved Forensic Officer' : currentUser?.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[11px] mb-1">Official Forensic User ID</span>
              <span className="font-mono text-slate-200 font-bold text-sm">{currentUser?.userId || 'N/A'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[11px] mb-1">Assigned Security Role</span>
              <span className="font-mono text-blue-400 font-bold text-sm">{currentUser?.role}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[11px] mb-1">Mobile Contact</span>
              <span className="font-mono text-slate-200">{currentUser?.mobileNumber || 'Not registered'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[11px] mb-1">Account Creation Date</span>
              <span className="font-mono text-slate-200">{currentUser?.createdAt ? currentUser.createdAt.substring(0, 10) : '2026-08-20'}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-slate-400 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-200">Cryptographic Accountability Standard</div>
              <p className="mt-1 leading-relaxed">
                All CCTV search jobs, candidate match verifications, evidence clip exports, and audit trails initiated under this profile are cryptographically signed and permanently logged in the immutable audit repository.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DETECTION & EXTRACTION */}
      {activeTab === 'detection' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Biometric Similarity Bounds & Video Buffers</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">High Confidence Threshold</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.4"
                  max="0.95"
                  value={formData.similarityThresholdHigh}
                  onChange={e => setFormData({ ...formData, similarityThresholdHigh: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Default: 0.65 (65% Cosine)</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Medium Confidence Threshold</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.3"
                  max="0.8"
                  value={formData.similarityThresholdMedium}
                  onChange={e => setFormData({ ...formData, similarityThresholdMedium: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Default: 0.50 (50% Cosine)</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Video Sample FPS Rate</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="15"
                  value={formData.frameSampleFps}
                  onChange={e => setFormData({ ...formData, frameSampleFps: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Frames/sec sampled from CCTV</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Min Face Bounding Box (px)</label>
                <input
                  type="number"
                  step="5"
                  min="20"
                  max="120"
                  value={formData.minFaceSizePx}
                  onChange={e => setFormData({ ...formData, minFaceSizePx: parseInt(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Discard distant tiny faces</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-800">
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Clip Pre-Roll Buffer (seconds)</label>
                <input
                  type="number"
                  min="2"
                  max="60"
                  value={formData.preRollSeconds}
                  onChange={e => setFormData({ ...formData, preRollSeconds: parseInt(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Lead time included before match event</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Clip Post-Roll Buffer (seconds)</label>
                <input
                  type="number"
                  min="2"
                  max="60"
                  value={formData.postRollSeconds}
                  onChange={e => setFormData({ ...formData, postRollSeconds: parseInt(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Trail time included after match event</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-xs font-medium border border-transparent transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: STORAGE DIRECTORIES */}
      {activeTab === 'storage' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>Local Storage Directories</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Cases & Metadata Root Folder</label>
                <input
                  type="text"
                  value={formData.casesDir}
                  onChange={e => setFormData({ ...formData, casesDir: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">CCTV Vector Index Cache Folder</label>
                <input
                  type="text"
                  value={formData.indexDir}
                  onChange={e => setFormData({ ...formData, indexDir: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Extracted Evidence Clips Folder</label>
                <input
                  type="text"
                  value={formData.exportDir}
                  onChange={e => setFormData({ ...formData, exportDir: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Temporary Processing Scratch Folder</label>
                <input
                  type="text"
                  value={formData.tempDir}
                  onChange={e => setFormData({ ...formData, tempDir: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Storage Paths</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: SECURITY & ACCESS POLICY */}
      {activeTab === 'access' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Role-Based Access Control (RBAC) Matrix</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Operation / Privilege</th>
                    <th className="py-2.5 px-3 text-center">Administrator</th>
                    <th className="py-2.5 px-3 text-center">Auditor</th>
                    <th className="py-2.5 px-3 text-center">Viewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr>
                    <td className="py-2.5 px-3 text-slate-200">View Cases & Match Results</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-200">Execute Candidate Searches</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                    <td className="py-2.5 px-3 text-center text-rose-400">✗</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-200">Verify / Confirm / Reject Matches</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                    <td className="py-2.5 px-3 text-center text-rose-400">✗</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-200">Extract & Seal Evidence Clips</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                    <td className="py-2.5 px-3 text-center text-rose-400">✗</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-200">User Approvals & Role Management</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                    <td className="py-2.5 px-3 text-center text-rose-400">✗</td>
                    <td className="py-2.5 px-3 text-center text-rose-400">✗</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-200">Delete Cases or Clear Vector Indexes</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                    <td className="py-2.5 px-3 text-center text-rose-400">✗</td>
                    <td className="py-2.5 px-3 text-center text-rose-400">✗</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {currentUser?.role === 'Admin' && onNavigateTab && (
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Need to approve pending registrations or modify staff roles?</span>
                <button
                  onClick={() => onNavigateTab('users')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open User Management Console</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
