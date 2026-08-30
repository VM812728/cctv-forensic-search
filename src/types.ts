export type UserRole = 'Admin' | 'Auditor' | 'Viewer';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  avatar?: string;
  lastLogin?: string;
}

export type CaseStatus = 
  | 'Created'
  | 'Indexing'
  | 'Searching'
  | 'Review Required'
  | 'Completed'
  | 'Exported'
  | 'Archived';

export interface CandidatePhotoQuality {
  faceDetected: boolean;
  faceCount: number;
  width: number;
  height: number;
  faceWidthPx: number;
  faceHeightPx: number;
  facePercentage: number;
  blurScore: number; // 0-100 (higher = sharper)
  brightnessScore: number; // 0-100
  isQualityGood: boolean;
  warnings: string[];
}

export interface Candidate {
  id: string;
  caseId: string;
  rollNumber: string;
  candidateName: string;
  photoUrl: string;
  photoQuality: CandidatePhotoQuality;
  embeddingCreated: boolean;
  appearanceTags?: {
    upperClothingColor?: string;
    lowerClothingColor?: string;
    hasBackpack?: boolean;
    genderPresentation?: string;
    approxHeight?: string;
  };
}

export interface CCTVVideo {
  id: string;
  caseId?: string;
  fileName: string;
  filePath: string;
  cameraName: string;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  fileSizeBytes: number;
  fileHash: string; // SHA-256
  isIndexed: boolean;
  indexedAt?: string;
  facesDetectedCount?: number;
  framesProcessedCount?: number;
  videoUrl?: string; // sample playback or user upload blob url
}

export type ConfidenceBand = 'High' | 'Medium' | 'Low';
export type ReviewStatus = 'Pending' | 'Confirmed' | 'Rejected' | 'Flagged';
export type SearchType = 'Face Recognition (SFace)' | 'Appearance Search (Fallback)';

export interface SearchResultMatch {
  id: string;
  caseId: string;
  candidateId: string;
  videoId: string;
  cameraName: string;
  eventStartSeconds: number;
  eventEndSeconds: number;
  peakTimestampSeconds: number;
  similarityScore: number; // 0.0 - 1.0 (e.g. 0.942 = 94.2%)
  confidenceBand: ConfidenceBand;
  thumbnailUrl: string;
  cctvFrameUrl: string;
  searchType: SearchType;
  reviewStatus: ReviewStatus;
  reviewer?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  clipGenerated: boolean;
  clipId?: string;
  boundingBox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  appearanceMatchDetails?: {
    upperColorMatch: boolean;
    lowerColorMatch: boolean;
    backpackMatch: boolean;
  };
}

export interface ClipEvidence {
  id: string;
  caseId: string;
  searchResultId: string;
  cameraName: string;
  clipFileName: string;
  clipUrl: string;
  preRollSeconds: number;
  postRollSeconds: number;
  clipStartSeconds: number;
  clipEndSeconds: number;
  clipDurationSeconds: number;
  clipSha256: string;
  sourceFileName: string;
  sourceFileSha256: string;
  appVersion: string;
  generatedAt: string;
  generatedBy: string;
  caseCode: string;
  candidateRoll: string;
}

export interface Case {
  id: string;
  caseCode: string;
  client: string;
  examName: string;
  examDate: string;
  centreName: string;
  candidateId?: string;
  candidate?: Candidate;
  notes?: string;
  storagePath: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  videoIds: string[];
  totalMatchesCount: number;
  confirmedMatchesCount: number;
  rejectedMatchesCount: number;
  clipsCount: number;
}

export interface SearchJob {
  id: string;
  caseId: string;
  cameraName: string;
  timeRange: string;
  status: 'Queued' | 'Processing' | 'Completed' | 'Failed' | 'Paused';
  progressPercent: number;
  currentFile: string;
  currentTimestamp: string;
  processingFps: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  facesAnalyzed: number;
  matchesFound: number;
}

export interface AuditLog {
  id: string;
  username: string;
  action: string;
  details: string;
  caseId?: string;
  caseCode?: string;
  timestamp: string;
  severity?: 'info' | 'warning' | 'security';
}

export interface AppSettings {
  // AI Config
  faceDetectorModel: string;
  faceRecognizerModel: string;
  similarityThresholdHigh: number; // e.g. 0.65
  similarityThresholdMedium: number; // e.g. 0.50
  frameSampleFps: number; // 2 - 5 fps
  minFaceSizePx: number; // 40px
  gpuEnabled: boolean;
  
  // Clip Config
  preRollSeconds: number; // 10
  postRollSeconds: number; // 10
  clipFormat: 'mp4' | 'mkv' | 'avi';
  clipQuality: 'High (Lossless Remux)' | 'Standard (H.264 Fast)';
  
  // Storage Config
  casesDir: string;
  indexDir: string;
  tempDir: string;
  exportDir: string;
  
  // Performance
  cpuWorkers: number;
  gpuBatchSize: number;
  maxSimultaneousJobs: number;
}

export interface SystemHardwareInfo {
  cpuModel: string;
  cpuCores: number;
  cpuUsagePercent: number;
  ramTotalGb: number;
  ramUsedGb: number;
  ramUsagePercent: number;
  gpuName: string;
  gpuVramTotalGb: number;
  gpuVramUsedGb: number;
  gpuUsagePercent: number;
  cudaAvailable: boolean;
  cudaVersion: string;
  onnxBackend: 'CUDA Execution Provider' | 'CPU Execution Provider';
  aiEngineStatus: 'Online (YuNet + SFace Ready)' | 'Fallback Mode';
  osVersion: string;
}

export interface BenchmarkResult {
  videoDurationSec: number;
  videoResolution: string;
  framesProcessed: number;
  facesDetected: number;
  uniqueTracks: number;
  processingFps: number;
  processingTimeSec: number;
  mode: 'GPU (CUDA)' | 'CPU Multi-Thread';
  averageFaceSearchLatencyMs: number;
  timestamp: string;
}
