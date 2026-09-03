export type UserRole = 'Admin' | 'ADMIN' | 'SUPER_ADMIN' | 'Auditor' | 'Viewer' | 'USER';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'Active' | 'Disabled';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  mobileNumber?: string;
  role: UserRole;
  avatar?: string;
  status?: UserStatus;
  userId?: string; // Human-readable activated forensic identifier (e.g. CVS-US-892011)
  createdAt?: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  lastLogin?: string;
  isFirebaseUser?: boolean;
}

export type CaseStatus = 
  | 'Created'
  | 'Indexing'
  | 'Searching'
  | 'Review Required'
  | 'Completed'
  | 'Exported'
  | 'Archived';

export interface BoundingBoxCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LandmarkPointInfo {
  x: number;
  y: number;
}

export interface FacialLandmarksInfo {
  right_eye: LandmarkPointInfo;
  left_eye: LandmarkPointInfo;
  nose: LandmarkPointInfo;
  right_mouth_corner: LandmarkPointInfo;
  left_mouth_corner: LandmarkPointInfo;
}

export interface DetectedFaceInfo {
  face_id: string;
  bounding_box: BoundingBoxCoordinates;
  landmarks?: FacialLandmarksInfo;
  detection_confidence: number;
  quality_score: number;
  quality_label: 'GOOD' | 'FAIR' | 'POOR';
  blur_score: number;
  brightness_score: number;
  face_width_px: number;
  face_height_px: number;
  face_percentage: number;
  warnings: string[];
}

export interface FaceAnalysisApiResponse {
  face_count: number;
  faces: DetectedFaceInfo[];
  image_width: number;
  image_height: number;
  overall_quality: 'GOOD' | 'FAIR' | 'POOR' | 'MULTIPLE' | 'NONE';
  guidance_message: string;
  analysis_timestamp: string;
}

export interface EmbeddingApiResponse {
  embedding_created: boolean;
  embedding_dimension: number;
  face_quality_score: number;
  message: string;
  face_id: string;
}

export interface CandidateReferenceInfo {
  candidate_id: string;
  reference_id: string;
  face_id: string;
  roll_number?: string;
  candidate_name?: string;
  embedding_available: boolean;
  embedding_dimension: number;
  quality_score: number;
  quality_label: string;
  created_at: string;
}

export interface SearchConfigParams {
  sampling_fps: number;
  match_threshold: number;
  high_confidence_threshold: number;
  match_gap_tolerance_seconds: number;
  min_event_duration_seconds: number;
  pre_roll_seconds: number;
  post_roll_seconds: number;
  verification_enabled: boolean;
  verification_padding_seconds?: number;
  verification_sampling_fps?: number;
  verification_threshold?: number;
  verification_high_confidence_threshold?: number;
  min_verification_matches?: number;
  min_verification_duration_seconds?: number;
}

export interface StartSearchApiRequest {
  case_id?: string;
  candidate_id: string;
  face_id?: string;
  selected_video_ids: string[];
  config?: Partial<SearchConfigParams>;
}

export interface StartSearchApiResponse {
  search_id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  message: string;
  candidate_id: string;
  videos_total: number;
  created_at: string;
}

export interface VideoMetadataApiResponse {
  video_id: string;
  filename: string;
  file_size_bytes: number;
  duration_seconds: number;
  fps: number;
  width: number;
  height: number;
  codec: string;
  camera_name?: string;
  created_at?: string;
}

export interface VideoListApiResponse {
  videos: VideoMetadataApiResponse[];
  total_count: number;
}


export interface AppearanceEventApiItem {
  event_id: string;
  search_id: string;
  case_id?: string;
  candidate_id: string;
  reference_id?: string;
  video_id: string;
  camera_name?: string;
  start_time_seconds: number;
  end_time_seconds: number;
  duration_seconds: number;
  peak_similarity: number;
  peak_timestamp_seconds: number;
  peak_frame_index?: number;
  peak_bounding_box: BoundingBoxCoordinates;
  frame_match_count: number;
  confidence_band: 'High' | 'Medium' | 'Low' | string;
  thumbnail_url?: string;
  clip_id?: string;
  clip_generated?: boolean;
  created_at?: string;
}

export interface ClipEvidenceApiItem {
  clip_id: string;
  event_id: string;
  search_id?: string;
  case_id?: string;
  candidate_id?: string;
  reference_id?: string;
  video_id: string;
  camera_name?: string;
  source_video_filename: string;
  output_filename: string;
  clip_path?: string;
  clip_start_seconds: number;
  clip_end_seconds: number;
  duration_seconds: number;
  peak_timestamp_seconds: number;
  peak_similarity: number;
  sha256: string;
  file_size_bytes: number;
  mime_type: string;
  extraction_method: 'stream_copy' | 're_encoded' | string;
  created_at: string;
}

export interface ExtractClipRequestApiItem {
  event_id: string;
  search_id?: string;
  case_id?: string;
  video_id?: string;
  source_video_path?: string;
  camera_name?: string;
  candidate_id?: string;
  reference_id?: string;
  start_time_seconds?: number;
  end_time_seconds?: number;
  peak_timestamp_seconds?: number;
  peak_similarity?: number;
  pre_roll_seconds?: number;
  post_roll_seconds?: number;
  force_reencode?: boolean;
}


export interface SearchResultMatchApiItem {
  id: string;
  search_id: string;
  case_id?: string;
  candidate_id: string;
  reference_id?: string;
  video_id: string;
  camera_name: string;
  event_start_seconds: number;
  event_end_seconds: number;
  peak_timestamp_seconds: number;
  similarity_score: number;
  confidence_band: 'High' | 'Medium' | 'Low' | string;
  thumbnail_url?: string;
  cctv_frame_url?: string;
  bounding_box: BoundingBoxCoordinates;
  duration_seconds: number;
  clip_generated: boolean;
  clip_id?: string;
  frame_index?: number;
  raw_match_id?: string;
  frame_match_count?: number;
  verification_status?: 'VERIFIED' | 'REJECTED' | 'INCONCLUSIVE' | 'UNVERIFIED' | string;
  pass1_event_id?: string;
  pass1_start_time?: number;
  pass1_end_time?: number;
  pass1_peak_similarity?: number;
  verification_match_count?: number;
  verification_sampling_fps?: number;
  verification_peak_similarity?: number;
}

export interface RawFaceMatchApiItem {
  match_id: string;
  search_id: string;
  case_id?: string;
  candidate_id: string;
  reference_id?: string;
  video_id: string;
  camera_name?: string;
  frame_index: number;
  timestamp_seconds: number;
  similarity_score: number;
  confidence_band: string;
  bounding_box: BoundingBoxCoordinates;
  face_index?: number;
  detection_confidence?: number;
  created_at?: string;
}

export interface SearchStatusApiResponse {
  search_id: string;
  case_id?: string;
  candidate_id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  current_phase?: string;
  progress_percent: number;
  videos_total: number;
  videos_processed: number;
  current_video?: string;
  current_timestamp?: string;
  frames_processed: number;
  faces_detected: number;
  potential_matches: number;
  verified_matches: number;
  verification_status?: string;
  verification_events_total?: number;
  verification_events_processed?: number;
  verification_frames_processed?: number;
  verification_faces_detected?: number;
  verification_matches?: number;
  processing_fps: number;
  elapsed_seconds: number;
  estimated_remaining_seconds: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  results: SearchResultMatchApiItem[];
  raw_matches?: RawFaceMatchApiItem[];
  pass2_matches?: RawFaceMatchApiItem[];
}

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
  qualityLabel?: 'GOOD' | 'FAIR' | 'POOR';
  guidanceMessage?: string;
  detectedFaces?: DetectedFaceInfo[];
  selectedFaceId?: string;
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
  searchId?: string;
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
  landmarks?: FacialLandmarksInfo;
  verificationStatus?: 'VERIFIED' | 'REJECTED' | 'INCONCLUSIVE' | 'UNVERIFIED';
  pass1_event_id?: string;
  pass1_start_time?: number;
  pass1_end_time?: number;
  pass1_peak_similarity?: number;
  verification_match_count?: number;
  verification_sampling_fps?: number;
  verification_peak_similarity?: number;
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
  fileSizeBytes?: number;
  extractionMethod?: string;
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
  currentPhase?: string;
  verificationStatus?: string;
  verificationEventsTotal?: number;
  verificationEventsProcessed?: number;
  potentialMatches?: number;
  verifiedMatches?: number;
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
