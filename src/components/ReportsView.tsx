import React from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  ShieldCheck, 
  FileCheck, 
  Layers, 
  HardDrive,
  FolderArchive,
  Terminal,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Case, Candidate, SearchResultMatch, ClipEvidence } from '../types';
import { generatePdfReport, generateCsvReport, generateHashManifest } from '../services/reportGenerator';
import { downloadStandaloneFile, WINDOWS_STANDALONE_FILES } from '../services/standaloneWindowsFiles';

interface ReportsViewProps {
  currentCase?: Case;
  matches: SearchResultMatch[];
  clips: ClipEvidence[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentCase,
  matches,
  clips,
}) => {
  if (!currentCase) {
    return (
      <div className="p-8 text-center text-slate-400">
        No active case selected for report generation.
      </div>
    );
  }

  const candidate = currentCase.candidate || {
    id: 'CAND-TEMP',
    caseId: currentCase.id,
    rollNumber: 'N/A',
    candidateName: 'Candidate',
    photoUrl: '',
    photoQuality: {
      faceDetected: true,
      faceCount: 1,
      width: 400,
      height: 500,
      faceWidthPx: 120,
      faceHeightPx: 140,
      facePercentage: 25,
      blurScore: 85,
      brightnessScore: 70,
      isQualityGood: true,
      warnings: [],
    },
    embeddingCreated: true,
  };

  const confirmedMatches = matches.filter(m => m.reviewStatus === 'Confirmed');

  return (
    <div id="reports-view" className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto w-full">
      {/* Header */}
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/20">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
          <FileSpreadsheet className="w-5 h-5 text-blue-400" />
          <span>Forensic Examination Reports & Standalone Desktop Exporter</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Export tamper-evident audit documents, CSV datasets, and standalone offline Windows desktop package scripts.
        </p>
      </div>

      {/* Grid: 3 Main Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* PDF Report Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-lg shadow-black/10">
          <div className="space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 backdrop-blur-xs">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-100">Official Forensic Audit PDF</h3>
            <p className="text-xs text-slate-400">
              Includes candidate metadata, biometric review logs, camera timeline, SHA-256 evidence table, and legal human verification sign-off blocks.
            </p>
          </div>

          <button
            onClick={() => generatePdfReport(currentCase, candidate, matches, clips)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all cursor-pointer backdrop-blur-xs"
          >
            <Download className="w-4 h-4" />
            <span>Generate & Download PDF</span>
          </button>
        </div>

        {/* CSV / Excel Dataset Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-lg shadow-black/10">
          <div className="space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 backdrop-blur-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-100">Structured Excel / CSV Log</h3>
            <p className="text-xs text-slate-400">
              Complete tabular export containing 22 required columns: Case Code, Camera, Start/End timestamps, Similarity %, Reviewer, Clip SHA-256, and Source Hash.
            </p>
          </div>

          <button
            onClick={() => generateCsvReport(currentCase, candidate, matches, clips)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all cursor-pointer backdrop-blur-xs"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV Dataset</span>
          </button>
        </div>

        {/* Hash Manifest Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-lg shadow-black/10">
          <div className="space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 backdrop-blur-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-100">SHA-256 Integrity Manifest</h3>
            <p className="text-xs text-slate-400">
              Exports raw `Evidence_Hashes.txt` cryptographic manifest for courtroom and examination board verification via Windows PowerShell.
            </p>
          </div>

          <button
            onClick={() => generateHashManifest(currentCase, clips)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all cursor-pointer backdrop-blur-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Evidence_Hashes.txt</span>
          </button>
        </div>
      </div>

      {/* Standalone Windows Desktop Deployment Package Section */}
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg shadow-black/10">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                Offline Windows Desktop Application Exporter (Python + PySide6 + OpenCV)
              </h3>
              <p className="text-xs text-slate-400">
                Export one-click batch scripts and specifications to run or compile as a standalone offline `.EXE` without cloud dependencies.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col justify-between backdrop-blur-xs">
            <div>
              <span className="font-mono font-bold text-xs text-amber-400 block">setup.bat</span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Automates Python venv, pip dependencies, and ONNX model downloads.
              </span>
            </div>
            <button
              onClick={() => downloadStandaloneFile('setup.bat')}
              className="mt-3 py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-mono font-medium flex items-center justify-center gap-1.5 border border-white/10 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download setup.bat</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col justify-between backdrop-blur-xs">
            <div>
              <span className="font-mono font-bold text-xs text-blue-400 block">run.bat</span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                One-click direct desktop launcher for local examination workstations.
              </span>
            </div>
            <button
              onClick={() => downloadStandaloneFile('run.bat')}
              className="mt-3 py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-mono font-medium flex items-center justify-center gap-1.5 border border-white/10 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download run.bat</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col justify-between backdrop-blur-xs">
            <div>
              <span className="font-mono font-bold text-xs text-purple-400 block">build.bat</span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Compiles standalone `CCTV-Candidate-Search.exe` using PyInstaller.
              </span>
            </div>
            <button
              onClick={() => downloadStandaloneFile('build.bat')}
              className="mt-3 py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-mono font-medium flex items-center justify-center gap-1.5 border border-white/10 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download build.bat</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col justify-between backdrop-blur-xs">
            <div>
              <span className="font-mono font-bold text-xs text-emerald-400 block">requirements.txt</span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                PySide6, OpenCV, ONNX Runtime, FAISS, ReportLab dependencies.
              </span>
            </div>
            <button
              onClick={() => downloadStandaloneFile('requirements.txt')}
              className="mt-3 py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-mono font-medium flex items-center justify-center gap-1.5 border border-white/10 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download requirements.txt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
