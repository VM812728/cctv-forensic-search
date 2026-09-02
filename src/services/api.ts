/// <reference types="vite/client" />
import { 
  FaceAnalysisApiResponse, 
  EmbeddingApiResponse, 
  BoundingBoxCoordinates,
  DetectedFaceInfo,
  StartSearchApiRequest,
  StartSearchApiResponse,
  SearchStatusApiResponse,
  CandidateReferenceInfo,
  VideoMetadataApiResponse,
  VideoListApiResponse,
  SearchResultMatchApiItem,
  RawFaceMatchApiItem,
  ClipEvidenceApiItem,
  ExtractClipRequestApiItem
} from '../types';


export const API_BASE_URL = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ?? '';

export interface BackendHealth {
  status: string;
  service: string;
  version: string;
}

export interface BackendSystemInfo {
  os: string;
  os_release: string;
  python_version: string;
  cpu: string;
  cpu_cores: number;
  ram_total_gb: number;
  ram_available_gb: number;
  gpu_available: boolean;
  gpu_name?: string;
  cuda_available: boolean;
  onnx_providers: string[];
  biometric_engine_ready: boolean;
  face_detection_model: string;
  face_recognition_model: string;
  model_files_present: boolean;
  missing_model_files?: string[];
  selected_execution_provider: string;
  embedding_dimension: number;
  model_initialization_error?: string | null;
}

export class BackendConnectionError extends Error {
  constructor(message = 'Cannot connect to local FastAPI backend on ' + API_BASE_URL + '. Please ensure the backend is running with start_backend.bat.') {
    super(message);
    this.name = 'BackendConnectionError';
  }
}

/**
 * Check if the FastAPI backend service is online and healthy
 */
export async function checkBackendHealth(): Promise<BackendHealth> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3500)
    });
    if (!response.ok) {
      throw new Error(`Backend returned status ${response.status}`);
    }
    return await response.json();
  } catch (err: unknown) {
    throw new BackendConnectionError();
  }
}

/**
 * Retrieve OS, CPU, RAM and CUDA/ONNX runtime telemetry from the backend
 */
export async function getBackendSystemInfo(): Promise<BackendSystemInfo> {
  try {
    const response = await fetch(`${API_BASE_URL}/system/info`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4500)
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch system telemetry: ${response.statusText}`);
    }
    return await response.json();
  } catch (err: unknown) {
    throw new BackendConnectionError();
  }
}

/**
 * Send candidate image to FastAPI backend for REAL face detection, bounding box calculation,
 * and biometric quality scoring (sharpness, illumination, resolution).
 */
export async function analyzeCandidatePhoto(
  photoInput: File | Blob | string
): Promise<FaceAnalysisApiResponse> {
  try {
    const formData = new FormData();

    if (typeof photoInput === 'string') {
      // Base64 or DataURL string
      formData.append('image_base64', photoInput);
    } else {
      // File or Blob
      formData.append('file', photoInput, (photoInput as File).name || 'candidate_photo.jpg');
    }

    const response = await fetch(`${API_BASE_URL}/candidate/analyze`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorJson.detail || `Server error during face analysis (${response.status})`);
    }

    const data: FaceAnalysisApiResponse = await response.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
      throw new BackendConnectionError();
    }
    throw err;
  }
}

/**
 * Request real 512-d normalized face feature embedding from the localized face crop.
 */
export async function generateCandidateEmbedding(
  photoInput: File | Blob | string,
  bbox?: BoundingBoxCoordinates,
  faceId?: string
): Promise<EmbeddingApiResponse> {
  try {
    const formData = new FormData();

    if (typeof photoInput === 'string') {
      formData.append('image_base64', photoInput);
    } else {
      formData.append('file', photoInput, (photoInput as File).name || 'candidate_photo.jpg');
    }

    if (bbox) {
      formData.append('bounding_box_json', JSON.stringify(bbox));
    }
    if (faceId) {
      formData.append('face_id', faceId);
    }

    const response = await fetch(`${API_BASE_URL}/candidate/embedding`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorJson.detail || `Server error during embedding generation (${response.status})`);
    }

    const data: EmbeddingApiResponse = await response.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
      throw new BackendConnectionError();
    }
    throw err;
  }
}

/**
 * Retrieve verified candidate reference metadata.
 */
export async function getCandidateReference(identifier: string): Promise<CandidateReferenceInfo> {
  try {
    const response = await fetch(`${API_BASE_URL}/candidate/reference/${encodeURIComponent(identifier)}`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorJson.detail || `Candidate reference not found (${response.status})`);
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
      throw new BackendConnectionError();
    }
    throw err;
  }
}

/**
 * Initiates a server-side CCTV candidate search job (returns QUEUED search_id).
 */
export async function startSearch(request: StartSearchApiRequest): Promise<StartSearchApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/search/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorJson.detail || `Failed to start search job (${response.status})`);
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
      throw new BackendConnectionError();
    }
    throw err;
  }
}

/**
 * Polls real-time progress, telemetry, and match results for a given search job.
 */
export async function getSearchStatus(searchId: string): Promise<SearchStatusApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/search/${encodeURIComponent(searchId)}/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorJson.detail || `Search job not found (${response.status})`);
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
      throw new BackendConnectionError();
    }
    throw err;
  }
}

/**
 * Retrieve final detected candidate match results for a search job.
 */
export async function getSearchResults(searchId: string): Promise<SearchResultMatchApiItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/search/${encodeURIComponent(searchId)}/results`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorJson.detail || `Failed to fetch search results (${response.status})`);
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
      throw new BackendConnectionError();
    }
    throw err;
  }
}

/**
 * Retrieve Stage E frame-level raw face matches.
 */
export async function getRawMatches(searchId: string): Promise<RawFaceMatchApiItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/search/${encodeURIComponent(searchId)}/raw-matches`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorJson.detail || `Failed to fetch raw matches (${response.status})`);
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
      throw new BackendConnectionError();
    }
    throw err;
  }
}

/**
 * Retrieve Stage H Pass 2 dense verification matches.
 */
export async function getPass2Matches(searchId: string): Promise<RawFaceMatchApiItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/search/${encodeURIComponent(searchId)}/pass2-matches`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorJson.detail || `Failed to fetch pass 2 matches (${response.status})`);
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
      throw new BackendConnectionError();
    }
    throw err;
  }
}

/**
 * Upload a CCTV video file to the backend repository.
 */
export async function uploadVideo(
  videoFile: File | Blob,
  cameraName?: string
): Promise<VideoMetadataApiResponse> {
  try {
    const formData = new FormData();
    formData.append('file', videoFile, (videoFile as File).name || 'cctv_recording.mp4');
    if (cameraName) {
      formData.append('camera_name', cameraName);
    }

    const response = await fetch(`${API_BASE_URL}/videos/upload`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(60000) // Videos can be large
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorJson.detail || `Failed to upload video (${response.status})`);
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
      throw new BackendConnectionError();
    }
    throw err;
  }
}

/**
 * List all available recorded CCTV videos in backend storage.
 */
export async function getVideos(): Promise<VideoListApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/videos`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorJson.detail || `Failed to list videos (${response.status})`);
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
      throw new BackendConnectionError();
    }
    throw err;
  }
}

/**
 * Delete a CCTV video from backend storage.
 */
export async function deleteVideo(videoId: string): Promise<{ status: string; message: string; video_id: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/videos/${encodeURIComponent(videoId)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorJson.detail || `Failed to delete video (${response.status})`);
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
      throw new BackendConnectionError();
    }
    throw err;
  }
}

/**
 * Extract forensic evidence clip for an appearance event.
 */
export async function extractClip(
  request: ExtractClipRequestApiItem
): Promise<{ clip: ClipEvidenceApiItem; message: string; status: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/clips/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorJson.detail || `Failed to extract evidence clip (${response.status})`);
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
      throw new BackendConnectionError();
    }
    throw err;
  }
}

/**
 * Retrieve metadata for a specific evidence clip.
 */
export async function getClip(clipId: string): Promise<ClipEvidenceApiItem> {
  try {
    const response = await fetch(`${API_BASE_URL}/clips/${encodeURIComponent(clipId)}`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorJson.detail || `Evidence clip not found (${response.status})`);
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
      throw new BackendConnectionError();
    }
    throw err;
  }
}

/**
 * List all evidence clips, optionally filtered by Case ID.
 */
export async function getClips(caseId?: string): Promise<ClipEvidenceApiItem[]> {
  try {
    const url = caseId 
      ? `${API_BASE_URL}/clips?case_id=${encodeURIComponent(caseId)}`
      : `${API_BASE_URL}/clips`;

    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorJson.detail || `Failed to list evidence clips (${response.status})`);
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
      throw new BackendConnectionError();
    }
    throw err;
  }
}

/**
 * Generate stream URL for direct video player playback.
 */
export function getClipStreamUrl(clipId: string): string {
  const cleanId = clipId.replace(/\.mp4$/, '');
  return `${API_BASE_URL}/clips/${encodeURIComponent(cleanId)}/stream`;
}


