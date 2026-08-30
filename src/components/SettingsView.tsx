import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  HardDrive, 
  Sliders, 
  Layers, 
  Cpu, 
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
}) => {
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
    <div id="settings-view" className="p-6 max-w-5xl mx-auto space-y-6 overflow-y-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/20">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-blue-400" />
            <span>Application & Forensic Detection Configuration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure local storage directories, AI biometric confidence bounds, clip extraction buffers, and GPU engine threads.
          </p>
        </div>

        {saveSuccess && (
          <span className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 animate-in fade-in backdrop-blur-xs">
            Settings Saved to Local SQLite Config!
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Storage Paths */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg shadow-black/10">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-white/10 pb-3">
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
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-slate-200 focus:outline-none focus:border-blue-500/50 backdrop-blur-xs"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">CCTV Vector Index Cache Folder</label>
              <input
                type="text"
                value={formData.indexDir}
                onChange={e => setFormData({ ...formData, indexDir: e.target.value })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-slate-200 focus:outline-none focus:border-blue-500/50 backdrop-blur-xs"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Extracted Evidence Clips Folder</label>
              <input
                type="text"
                value={formData.exportDir}
                onChange={e => setFormData({ ...formData, exportDir: e.target.value })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-slate-200 focus:outline-none focus:border-blue-500/50 backdrop-blur-xs"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Temporary Processing Scratch Folder</label>
              <input
                type="text"
                value={formData.tempDir}
                onChange={e => setFormData({ ...formData, tempDir: e.target.value })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-slate-200 focus:outline-none focus:border-blue-500/50 backdrop-blur-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Biometric Thresholds & Clip Extractions */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg shadow-black/10">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-white/10 pb-3">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Biometric Thresholds & Video Clip Buffers</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">High Confidence Threshold</label>
              <input
                type="number"
                step="0.01"
                min="0.4"
                max="0.95"
                value={formData.similarityThresholdHigh}
                onChange={e => setFormData({ ...formData, similarityThresholdHigh: parseFloat(e.target.value) })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-slate-200 focus:outline-none focus:border-emerald-500/50 backdrop-blur-xs"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">Recommended: 0.65 (65%)</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Medium Confidence Threshold</label>
              <input
                type="number"
                step="0.01"
                min="0.3"
                max="0.8"
                value={formData.similarityThresholdMedium}
                onChange={e => setFormData({ ...formData, similarityThresholdMedium: parseFloat(e.target.value) })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-slate-200 focus:outline-none focus:border-emerald-500/50 backdrop-blur-xs"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">Recommended: 0.50 (50%)</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Clip Pre-Roll Buffer (Sec)</label>
              <input
                type="number"
                min="0"
                max="60"
                value={formData.preRollSeconds}
                onChange={e => setFormData({ ...formData, preRollSeconds: parseInt(e.target.value) })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-slate-200 focus:outline-none focus:border-blue-500/50 backdrop-blur-xs"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">Default: 10s</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Clip Post-Roll Buffer (Sec)</label>
              <input
                type="number"
                min="0"
                max="60"
                value={formData.postRollSeconds}
                onChange={e => setFormData({ ...formData, postRollSeconds: parseInt(e.target.value) })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-slate-200 focus:outline-none focus:border-blue-500/50 backdrop-blur-xs"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">Default: 10s</span>
            </div>
          </div>
        </div>

        {/* Section 3: Hardware & Execution Provider */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg shadow-black/10">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-white/10 pb-3">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>Hardware & AI Execution Providers</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">GPU Hardware Acceleration</label>
              <select
                value={formData.gpuEnabled ? 'true' : 'false'}
                onChange={e => setFormData({ ...formData, gpuEnabled: e.target.value === 'true' })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-purple-500/50 backdrop-blur-xs cursor-pointer"
              >
                <option value="true">CUDA / NVIDIA TensorRT (Fast Inference Enabled)</option>
                <option value="false">CPU Multi-Threaded Only</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Max Worker Concurrency</label>
              <input
                type="number"
                min="1"
                max="32"
                value={formData.cpuWorkers}
                onChange={e => setFormData({ ...formData, cpuWorkers: parseInt(e.target.value) })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-slate-200 focus:outline-none focus:border-purple-500/50 backdrop-blur-xs"
              />
            </div>
          </div>
        </div>

        {/* Save & Reset Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition-all cursor-pointer backdrop-blur-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all cursor-pointer backdrop-blur-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
