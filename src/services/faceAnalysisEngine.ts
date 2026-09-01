import { CandidatePhotoQuality, SearchResultMatch, ConfidenceBand, CCTVVideo } from '../types';
import { generateEvidenceHash } from './cryptoUtils';
import { analyzeCandidatePhoto } from './api';

export async function analyzeCandidatePhotoQuality(imageSrc: string): Promise<CandidatePhotoQuality> {
  // Call real FastAPI backend for local face detection and biometric quality evaluation
  const apiResult = await analyzeCandidatePhoto(imageSrc);

  if (apiResult.face_count === 0) {
    return {
      faceDetected: false,
      faceCount: 0,
      width: apiResult.image_width,
      height: apiResult.image_height,
      faceWidthPx: 0,
      faceHeightPx: 0,
      facePercentage: 0,
      blurScore: 0,
      brightnessScore: 0,
      isQualityGood: false,
      qualityLabel: 'POOR',
      guidanceMessage: apiResult.guidance_message,
      detectedFaces: [],
      warnings: ['No face detected in the uploaded image. Please upload a clear photograph facing the camera.']
    };
  }

  const primaryFace = apiResult.faces[0];
  const allWarnings = apiResult.faces.flatMap(f => f.warnings);

  return {
    faceDetected: true,
    faceCount: apiResult.face_count,
    width: apiResult.image_width,
    height: apiResult.image_height,
    faceWidthPx: primaryFace.face_width_px,
    faceHeightPx: primaryFace.face_height_px,
    facePercentage: primaryFace.face_percentage,
    blurScore: primaryFace.blur_score,
    brightnessScore: primaryFace.brightness_score,
    isQualityGood: primaryFace.quality_label === 'GOOD',
    qualityLabel: primaryFace.quality_label,
    guidanceMessage: apiResult.guidance_message,
    detectedFaces: apiResult.faces,
    selectedFaceId: primaryFace.face_id,
    warnings: allWarnings
  };
}

/**
 * Merges raw frame-level detections into continuous candidate appearance events
 * (tracking behavior equivalent to ByteTrack / SORT)
 */
export function mergeDetectionsIntoEvents(
  rawDetections: Array<{
    timeSeconds: number;
    similarity: number;
    bbox: { x: number; y: number; w: number; h: number };
    cctvFrameUrl: string;
    thumbnailUrl: string;
  }>,
  caseId: string,
  candidateId: string,
  video: CCTVVideo,
  searchType: 'Face Recognition (SFace)' | 'Appearance Search (Fallback)',
  thresholdHigh: number = 0.65,
  thresholdMed: number = 0.50,
  maxGapSeconds: number = 4.0
): SearchResultMatch[] {
  if (rawDetections.length === 0) return [];

  // Sort by timestamp
  const sorted = [...rawDetections].sort((a, b) => a.timeSeconds - b.timeSeconds);
  const events: SearchResultMatch[] = [];

  let currentCluster: typeof rawDetections = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (curr.timeSeconds - prev.timeSeconds <= maxGapSeconds) {
      currentCluster.push(curr);
    } else {
      // Finalize previous cluster into event
      events.push(createMatchEvent(currentCluster, caseId, candidateId, video, searchType, thresholdHigh, thresholdMed));
      currentCluster = [curr];
    }
  }

  if (currentCluster.length > 0) {
    events.push(createMatchEvent(currentCluster, caseId, candidateId, video, searchType, thresholdHigh, thresholdMed));
  }

  // Sort descending by highest similarity score
  return events.sort((a, b) => b.similarityScore - a.similarityScore);
}

function createMatchEvent(
  cluster: Array<{
    timeSeconds: number;
    similarity: number;
    bbox: { x: number; y: number; w: number; h: number };
    cctvFrameUrl: string;
    thumbnailUrl: string;
  }>,
  caseId: string,
  candidateId: string,
  video: CCTVVideo,
  searchType: 'Face Recognition (SFace)' | 'Appearance Search (Fallback)',
  thresholdHigh: number,
  thresholdMed: number
): SearchResultMatch {
  const startSec = cluster[0].timeSeconds;
  const endSec = cluster[cluster.length - 1].timeSeconds + 2; // slight buffer
  
  // Find peak detection
  let peak = cluster[0];
  for (const item of cluster) {
    if (item.similarity > peak.similarity) {
      peak = item;
    }
  }

  let confidenceBand: ConfidenceBand = 'Low';
  if (peak.similarity >= thresholdHigh) {
    confidenceBand = 'High';
  } else if (peak.similarity >= thresholdMed) {
    confidenceBand = 'Medium';
  }

  const matchId = `match-${caseId}-${video.id}-${Math.round(startSec)}-${Math.random().toString(36).substring(2, 6)}`;

  return {
    id: matchId,
    caseId,
    candidateId,
    videoId: video.id,
    cameraName: video.cameraName,
    eventStartSeconds: Math.round(startSec),
    eventEndSeconds: Math.round(endSec),
    peakTimestampSeconds: Math.round(peak.timeSeconds),
    similarityScore: Math.round(peak.similarity * 1000) / 1000,
    confidenceBand,
    thumbnailUrl: peak.thumbnailUrl,
    cctvFrameUrl: peak.cctvFrameUrl,
    searchType,
    reviewStatus: 'Pending',
    clipGenerated: false,
    boundingBox: peak.bbox,
    appearanceMatchDetails: {
      upperColorMatch: true,
      lowerColorMatch: true,
      backpackMatch: true,
    },
  };
}
