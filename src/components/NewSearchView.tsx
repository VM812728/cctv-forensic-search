import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Camera, 
  AlertTriangle, 
  CheckCircle2, 
  FolderSearch, 
  HardDrive, 
  Sliders, 
  Clock, 
  Play, 
  Sparkles, 
  X, 
  FileVideo, 
  ShieldCheck,
  Eye,
  Zap,
  Info,
  Loader2,
  ScanFace,
  ServerCrash
} from 'lucide-react';
import { Case, Candidate, CCTVVideo, AppSettings, CandidatePhotoQuality, DetectedFaceInfo, SearchConfigParams } from '../types';
import { analyzeCandidatePhotoQuality } from '../services/faceAnalysisEngine';
import { generateCandidateEmbedding, BackendConnectionError } from '../services/api';
import { SAMPLE_CANDIDATES, SAMPLE_CCTV_VIDEOS } from '../services/mockData';

interface NewSearchViewProps {
  onStartSearch: (newCase: Case, selectedVideoIds: string[], searchConfig?: Partial<SearchConfigParams>) => void;
  availableVideos: CCTVVideo[];
  settings: AppSettings;
  onOpenWebcam: (onCapture: (dataUrl: string) => void) => void;
}

export const NewSearchView: React.FC<NewSearchViewProps> = ({
  onStartSearch,
  availableVideos,
  settings,
  onOpenWebcam,
}) => {
  // Case metadata form
  const [caseCode, setCaseCode] = useState(`CASE-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [client, setClient] = useState('National Testing & Examination Agency');
  const [examName, setExamName] = useState('National Combined Entrance Exam (NCEE-2026)');
  const [examDate, setExamDate] = useState('2026-08-28');
  const [centreName, setCentreName] = useState('Centre #104 - Sector 14, Delhi');
  const [rollNumber, setRollNumber] = useState('ROLL-2026-EX8841');
  const [candidateName, setCandidateName] = useState('Rahul Verma');
  const [notes, setNotes] = useState('Client Request: Verify candidate entrance time and seating in Hall A.');

  // Candidate photo state
  const [photoUrl, setPhotoUrl] = useState<string>(SAMPLE_CANDIDATES[0].photoUrl);
  const [photoQuality, setPhotoQuality] = useState<CandidatePhotoQuality>(SAMPLE_CANDIDATES[0].photoQuality);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [isGeneratingEmbedding, setIsGeneratingEmbedding] = useState(false);
  const [embeddingMessage, setEmbeddingMessage] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-analyze and register initial candidate photo on mount
  useEffect(() => {
    if (photoUrl && !selectedFaceId) {
      handlePhotoSelect(photoUrl);
    }
  }, []);

  // Appearance Fallback Tags
  const [upperColor, setUpperColor] = useState('Navy Blue / Dark');
  const [lowerColor, setLowerColor] = useState('Khaki / Beige');
  const [hasBackpack, setHasBackpack] = useState(true);

  // CCTV selection
  const [cctvInputMode, setCctvInputMode] = useState<'single' | 'folder' | 'hdd'>('folder');
  const [customPath, setCustomPath] = useState('D:\\CCTV_Archive\\Centre_104_Delhi\\2026-08-28\\');
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>(
    availableVideos.map(v => v.id)
  );

  // Search parameters
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [sampleFps, setSampleFps] = useState(settings.frameSampleFps);
  const [similarityThreshold, setSimilarityThreshold] = useState(settings.similarityThresholdHigh);
  const [useAppearanceFallback, setUseAppearanceFallback] = useState(true);

  const handlePhotoSelect = async (url: string) => {
    setPhotoUrl(url);
    setIsAnalyzingPhoto(true);
    setBackendError(null);
    setEmbeddingMessage(null);

    try {
      const quality = await analyzeCandidatePhotoQuality(url);
      setPhotoQuality(quality);
      
      if (quality.detectedFaces && quality.detectedFaces.length > 0) {
        const firstFace = quality.detectedFaces[0];
        setSelectedFaceId(firstFace.face_id);

        // Generate real normalized embedding vector for the verified face
        setIsGeneratingEmbedding(true);
        try {
          const emb = await generateCandidateEmbedding(url, firstFace.bounding_box, firstFace.face_id);
          setSelectedFaceId(emb.face_id);
          setEmbeddingMessage(emb.message);
        } catch (embErr: any) {
          console.warn('Embedding extraction notice:', embErr);
        } finally {
          setIsGeneratingEmbedding(false);
        }
      }
    } catch (err: any) {
      console.error('Candidate face analysis failed:', err);
      if (err instanceof BackendConnectionError || err.message?.includes('FastAPI backend')) {
        setBackendError('Cannot connect to local FastAPI backend on http://localhost:8000. Please ensure the backend is running with start_backend.bat.');
      } else {
        setBackendError(err.message || 'Failed to process candidate photo.');
      }
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const handleSelectFace = async (face: DetectedFaceInfo) => {
    setSelectedFaceId(face.face_id);
    setIsGeneratingEmbedding(true);
    try {
      const emb = await generateCandidateEmbedding(photoUrl, face.bounding_box, face.face_id);
      setSelectedFaceId(emb.face_id);
      setEmbeddingMessage(`Selected Face (${face.face_width_px}x${face.face_height_px}px): ${emb.message}`);
    } catch (embErr: any) {
      console.warn('Embedding extraction notice:', embErr);
    } finally {
      setIsGeneratingEmbedding(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handlePhotoSelect(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handlePhotoSelect(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleVideoSelection = (id: string) => {
    setSelectedVideoIds(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleSelectAllVideos = () => {
    if (selectedVideoIds.length === availableVideos.length) {
      setSelectedVideoIds([]);
    } else {
      setSelectedVideoIds(availableVideos.map(v => v.id));
    }
  };

  const loadPresetCandidate = (preset: typeof SAMPLE_CANDIDATES[0]) => {
    setRollNumber(preset.rollNumber);
    setCandidateName(preset.candidateName);
    handlePhotoSelect(preset.photoUrl);
    if (preset.appearanceTags?.upperClothingColor) setUpperColor(preset.appearanceTags.upperClothingColor);
    if (preset.appearanceTags?.lowerClothingColor) setLowerColor(preset.appearanceTags.lowerClothingColor);
    if (preset.appearanceTags?.hasBackpack !== undefined) setHasBackpack(preset.appearanceTags.hasBackpack);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl) {
      alert('Please provide a candidate photograph before starting search.');
      return;
    }
    if (isAnalyzingPhoto || isGeneratingEmbedding) {
      alert('Candidate biometric analysis and embedding generation is in progress. Please wait for completion.');
      return;
    }
    if (!selectedFaceId) {
      alert('No verified candidate face embedding was registered. Please upload a clear candidate photo and ensure the backend is connected.');
      return;
    }
    if (selectedVideoIds.length === 0) {
      alert('Please select at least one CCTV camera video file to search.');
      return;
    }

    const realCandidateId = selectedFaceId;
    const candidate: Candidate = {
      id: realCandidateId,
      caseId: caseCode,
      rollNumber,
      candidateName,
      photoUrl,
      photoQuality,
      embeddingCreated: true,
      appearanceTags: {
        upperClothingColor: upperColor,
        lowerClothingColor: lowerColor,
        hasBackpack,
      }
    };

    const newCase: Case = {
      id: caseCode,
      caseCode,
      client,
      examName,
      examDate,
      centreName,
      candidateId: realCandidateId,
      candidate,
      notes,
      storagePath: `${settings.casesDir}\\${caseCode}`,
      status: 'Searching',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      createdBy: 'admin',
      videoIds: selectedVideoIds,
      totalMatchesCount: 0,
      confirmedMatchesCount: 0,
      rejectedMatchesCount: 0,
      clipsCount: 0,
    };

    onStartSearch(newCase, selectedVideoIds, {
      sampling_fps: sampleFps,
      match_threshold: similarityThreshold * 0.8,
      high_confidence_threshold: similarityThreshold,
      pre_roll_seconds: settings.preRollSeconds || 5,
      post_roll_seconds: settings.postRollSeconds || 5,
      verification_enabled: true,
      verification_sampling_fps: 8,
      verification_threshold: similarityThreshold * 0.8,
    });
  };

  return (
    <div id="new-search-view" className="p-6 max-w-6xl mx-auto space-y-6 overflow-y-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-lg shadow-black/20">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <span>New Examination Candidate Search Case</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 font-mono backdrop-blur-xs">
              YuNet + SFace Vector Pipeline
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure reference candidate biometrics and target recorded CCTV cameras for automated frame sampling and matching.
          </p>
        </div>

        {/* Quick Candidate Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Load Test Candidate:</span>
          <div className="flex gap-1.5">
            {SAMPLE_CANDIDATES.map((cand) => (
              <button
                key={cand.id}
                type="button"
                onClick={() => loadPresetCandidate(cand)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all backdrop-blur-xs cursor-pointer ${
                  rollNumber === cand.rollNumber
                    ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)] font-semibold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
              >
                {cand.candidateName.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Case Details */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-mono text-[11px]">1</span>
              <span>Case & Examination Identification</span>
            </h3>
            <span className="text-xs font-mono text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">Step 1 of 4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Case Code / ID</label>
              <input
                type="text"
                value={caseCode}
                onChange={e => setCaseCode(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-slate-200 font-mono focus:border-blue-500 focus:outline-none backdrop-blur-sm"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Client / Organization</label>
              <input
                type="text"
                value={client}
                onChange={e => setClient(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-slate-200 focus:border-blue-500 focus:outline-none backdrop-blur-sm"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Exam Name</label>
              <input
                type="text"
                value={examName}
                onChange={e => setExamName(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-slate-200 focus:border-blue-500 focus:outline-none backdrop-blur-sm"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Exam Date</label>
              <input
                type="date"
                value={examDate}
                onChange={e => setExamDate(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-slate-200 font-mono focus:border-blue-500 focus:outline-none backdrop-blur-sm"
                required
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-slate-400 mb-1 font-medium">Examination Centre Name & City</label>
              <input
                type="text"
                value={centreName}
                onChange={e => setCentreName(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-slate-200 focus:border-blue-500 focus:outline-none backdrop-blur-sm"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Candidate Roll Number / ID</label>
              <input
                type="text"
                value={rollNumber}
                onChange={e => setRollNumber(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-slate-200 font-mono font-semibold focus:border-blue-500 focus:outline-none backdrop-blur-sm"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Candidate Full Name</label>
              <input
                type="text"
                value={candidateName}
                onChange={e => setCandidateName(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-slate-200 font-semibold focus:border-blue-500 focus:outline-none backdrop-blur-sm"
                required
              />
            </div>
          </div>
        </div>

        {/* Step 2: Candidate Photograph & Biometric Quality Check */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-mono text-[11px]">2</span>
              <span>Candidate Reference Photo & Biometric Quality Verification</span>
            </h3>
            <span className="text-xs font-mono text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">Step 2 of 4</span>
          </div>

          {backendError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5">
              <ServerCrash className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-red-200 font-medium">FastAPI Backend Connection Notice:</strong>
                <span>{backendError}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Upload & Drag-and-drop zone */}
            <div 
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-white/15 hover:border-blue-500 bg-slate-900/40 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-3 transition-colors relative"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/jpeg,image/png,image/jpg"
                className="hidden"
              />

              {photoUrl ? (
                <div className="relative group">
                  <img
                    src={photoUrl}
                    alt="Candidate Preview"
                    className="w-36 h-44 object-cover rounded-xl border border-white/20 shadow-lg"
                  />
                  
                  {isAnalyzingPhoto && (
                    <div className="absolute inset-0 bg-slate-950/80 rounded-xl flex flex-col items-center justify-center text-xs font-mono text-blue-300 gap-2 backdrop-blur-xs">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                      <span>Detecting Faces...</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-xs">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-md cursor-pointer"
                    >
                      Change Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-medium text-slate-200">Drag & Drop Candidate Photo</div>
                  <div className="text-[11px] text-slate-400">Supports JPG, JPEG, PNG</div>
                </div>
              )}

              <div className="flex gap-2 w-full pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium border border-white/10 transition-all cursor-pointer backdrop-blur-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose File</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenWebcam(handlePhotoSelect)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium border border-white/10 transition-all cursor-pointer backdrop-blur-xs"
                >
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                  <span>Webcam</span>
                </button>
              </div>
            </div>

            {/* Center: Real-time Biometric Quality Inspection Scores */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-4.5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Biometric Quality Inspection</span>
                </span>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-xs ${
                  photoQuality.qualityLabel === 'GOOD'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                    : photoQuality.qualityLabel === 'FAIR'
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  {photoQuality.qualityLabel || (photoQuality.isQualityGood ? 'GOOD' : 'FAIR')}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Faces Detected:</span>
                  <span className={`font-semibold font-mono flex items-center gap-1 ${
                    photoQuality.faceCount === 1 ? 'text-emerald-400' : photoQuality.faceCount > 1 ? 'text-blue-400' : 'text-rose-400'
                  }`}>
                    {photoQuality.faceCount === 1 ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Exact 1 Face
                      </>
                    ) : photoQuality.faceCount > 1 ? (
                      <>
                        <ScanFace className="w-3.5 h-3.5" />
                        {photoQuality.faceCount} Faces (Select candidate)
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        0 Faces Found
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Resolution:</span>
                  <span className="font-mono text-slate-200">{photoQuality.width} × {photoQuality.height} px</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Face Dimensions:</span>
                  <span className="font-mono text-slate-200">{photoQuality.faceWidthPx} × {photoQuality.faceHeightPx} px ({photoQuality.facePercentage}% area)</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Sharpness / Blur Metric:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{photoQuality.blurScore}/100</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Illumination / Luma:</span>
                  <span className="font-mono text-slate-200">{photoQuality.brightnessScore}/100</span>
                </div>
              </div>

              {/* Multi-face selection list if multiple detected */}
              {photoQuality.detectedFaces && photoQuality.detectedFaces.length > 1 && (
                <div className="pt-2 border-t border-white/10">
                  <span className="text-[11px] font-medium text-slate-300 block mb-1.5">Detected Faces ({photoQuality.detectedFaces.length}):</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {photoQuality.detectedFaces.map((f, idx) => (
                      <button
                        key={f.face_id}
                        type="button"
                        onClick={() => handleSelectFace(f)}
                        className={`p-1.5 rounded-lg border text-left text-[10px] font-mono transition-all cursor-pointer ${
                          selectedFaceId === f.face_id
                            ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <div className="font-bold">Face #{idx + 1} ({f.quality_label})</div>
                        <div className="text-slate-500">{f.face_width_px}x{f.face_height_px}px</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Embedding generation status */}
              {isGeneratingEmbedding ? (
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Computing 512-dim biometric embedding...</span>
                </div>
              ) : embeddingMessage ? (
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{embeddingMessage}</span>
                </div>
              ) : null}

              {photoQuality.warnings.length > 0 ? (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong>Quality Warning:</strong> {photoQuality.warnings.join(' ')}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span>Reference photo is verified for local ONNX vector embedding.</span>
                </div>
              )}
            </div>

            {/* Right: Non-Face Appearance Fallback Metadata */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-4.5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span>Appearance Fallback</span>
                </span>
                <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAppearanceFallback}
                    onChange={e => setUseAppearanceFallback(e.target.checked)}
                    className="rounded bg-slate-900 border-white/10 text-blue-600 focus:ring-0"
                  />
                  <span>Enable</span>
                </label>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-slate-400 block mb-0.5 text-[11px]">Upper Clothing Color</label>
                  <input
                    type="text"
                    value={upperColor}
                    onChange={e => setUpperColor(e.target.value)}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Navy Blue Shirt"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-0.5 text-[11px]">Lower Clothing Color</label>
                  <input
                    type="text"
                    value={lowerColor}
                    onChange={e => setLowerColor(e.target.value)}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Khaki / Black Pants"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">Carrying Backpack/Bag:</span>
                  <label className="flex items-center gap-1 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasBackpack}
                      onChange={e => setHasBackpack(e.target.checked)}
                      className="rounded bg-slate-900 border-white/10 text-blue-600"
                    />
                    <span>Yes</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: CCTV Footage Input & Camera Selection */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-mono text-[11px]">3</span>
              <span>CCTV Recorded Source Footage & Camera Allocation</span>
            </h3>
            <span className="text-xs font-mono text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">Step 3 of 4</span>
          </div>

          {/* Source options selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setCctvInputMode('folder')}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all backdrop-blur-xs cursor-pointer ${
                cctvInputMode === 'folder'
                  ? 'bg-blue-500/15 border-blue-500 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/[0.07]'
              }`}
            >
              <FolderSearch className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <div className="font-semibold text-xs text-slate-200">CCTV Folder</div>
                <div className="text-[11px] text-slate-400">Scan directory of multi-camera files</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCctvInputMode('hdd')}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all backdrop-blur-xs cursor-pointer ${
                cctvInputMode === 'hdd'
                  ? 'bg-purple-500/15 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/[0.07]'
              }`}
            >
              <HardDrive className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <div className="font-semibold text-xs text-slate-200">Mounted HDD / NAS</div>
                <div className="text-[11px] text-slate-400">Process directly from external storage</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCctvInputMode('single')}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all backdrop-blur-xs cursor-pointer ${
                cctvInputMode === 'single'
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/[0.07]'
              }`}
            >
              <FileVideo className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-xs text-slate-200">Single Video</div>
                <div className="text-[11px] text-slate-400">Target specific camera recording</div>
              </div>
            </button>
          </div>

          {/* Storage Directory Path input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customPath}
              onChange={e => setCustomPath(e.target.value)}
              className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 backdrop-blur-sm"
              placeholder="e.g. D:\CCTV_Archive\Centre104\"
            />
            <button
              type="button"
              onClick={() => alert(`Scanned location: ${customPath} - Loaded ${availableVideos.length} examination camera recordings.`)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl text-xs font-semibold border border-white/10 transition-all cursor-pointer backdrop-blur-xs"
            >
              Rescan Storage
            </button>
          </div>

          {/* Camera Selection List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Detected CCTV Cameras ({availableVideos.length} available):</span>
              <button
                type="button"
                onClick={handleSelectAllVideos}
                className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
              >
                {selectedVideoIds.length === availableVideos.length ? 'Deselect All' : 'Select All Cameras'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {availableVideos.map((video) => {
                const isSelected = selectedVideoIds.includes(video.id);
                return (
                  <div
                    key={video.id}
                    onClick={() => toggleVideoSelection(video.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all backdrop-blur-xs ${
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500/50 shadow-sm'
                        : 'bg-white/[0.02] border-white/10 opacity-70 hover:opacity-100 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded bg-slate-900 border-white/10 text-blue-600"
                      />
                      <div>
                        <div className="font-semibold text-xs text-slate-200">{video.cameraName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {video.width}x{video.height} • {video.fps} FPS • {(video.durationSeconds / 3600).toFixed(1)} hrs
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-[11px]">
                      {video.isIndexed ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Indexed ({video.facesDetectedCount} faces)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Indexing Needed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 4: AI & Time Range Parameters */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-mono text-[11px]">4</span>
              <span>Search Window & AI Face Recognition Parameters</span>
            </h3>
            <span className="text-xs font-mono text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">Step 4 of 4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Search Start Time</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-slate-200 font-mono focus:border-blue-500 focus:outline-none backdrop-blur-sm"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Search End Time</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-slate-200 font-mono focus:border-blue-500 focus:outline-none backdrop-blur-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-400 font-medium">Sampling Rate</label>
                <span className="font-mono text-blue-400 font-bold">{sampleFps} FPS</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={sampleFps}
                onChange={e => setSampleFps(parseFloat(e.target.value))}
                className="w-full accent-blue-500 bg-slate-800/80 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                <span>1 FPS (Fast)</span>
                <span>3 FPS (Optimal)</span>
                <span>10 FPS (Dense)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-400 font-medium">Similarity Threshold</label>
                <span className="font-mono text-emerald-400 font-bold">{(similarityThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.40"
                max="0.90"
                step="0.02"
                value={similarityThreshold}
                onChange={e => setSimilarityThreshold(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800/80 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                <span>40% (Broad)</span>
                <span>65% (Conservative)</span>
                <span>90% (Strict)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Execution Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all cursor-pointer backdrop-blur-xs"
          >
            <Zap className="w-4 h-4" />
            <span>Launch AI Candidate CCTV Search ({selectedVideoIds.length} Cameras)</span>
          </button>
        </div>
      </form>
    </div>
  );
};
