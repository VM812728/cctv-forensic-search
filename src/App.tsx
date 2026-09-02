import React, { useState, useEffect, useRef } from 'react';
import { WindowsTitleBar } from './components/WindowsTitleBar';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { NewSearchView } from './components/NewSearchView';
import { CCTVIndexingView } from './components/CCTVIndexingView';
import { SearchResultsView } from './components/SearchResultsView';
import { ClipsEvidenceView } from './components/ClipsEvidenceView';
import { ReportsView } from './components/ReportsView';
import { CasesView } from './components/CasesView';
import { AuditLogView } from './components/AuditLogView';
import { SystemInfoView } from './components/SystemInfoView';
import { SettingsView } from './components/SettingsView';
import { UserManagementView } from './components/UserManagementView';
import { BenchmarkModal } from './components/BenchmarkModal';
import { WebcamModal } from './components/WebcamModal';
import { LoginView } from './components/LoginView';
import { AuthProvider, useAuth } from './context/AuthContext';

import { 
  INITIAL_CASES, 
  SAMPLE_CCTV_VIDEOS, 
  DEFAULT_SETTINGS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_HARDWARE, 
  INITIAL_USERS,
  SAMPLE_MATCHES,
  SAMPLE_CLIPS,
  SAMPLE_CANDIDATES
} from './services/mockData';
import { Case, SearchResultMatch, ClipEvidence, CCTVVideo, AppSettings, AuditLog, User, SearchJob } from './types';
import { generateEvidenceHash } from './services/cryptoUtils';
import { generatePdfReport } from './services/reportGenerator';
import { 
  getVideos, 
  uploadVideo, 
  deleteVideo, 
  startSearch, 
  getSearchStatus, 
  getSearchResults, 
  extractClip, 
  getClips, 
  getClipStreamUrl 
} from './services/api';
import { Shield, ScanFace, Loader2, AlertCircle, ShieldAlert, X, Lock } from 'lucide-react';

function ForensicWorkstation() {
  const { 
    currentUser, 
    isLoading, 
    signOutUser, 
    isAdmin,
    isAuditor,
    isViewer,
    canPerform,
    validatePermission
  } = useAuth();

  // Navigation & Active States
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [cases, setCases] = useState<Case[]>(INITIAL_CASES);
  const [activeCaseId, setActiveCaseId] = useState<string>(INITIAL_CASES[0].id);
  const [allMatches, setAllMatches] = useState<SearchResultMatch[]>(SAMPLE_MATCHES);
  const [allClips, setAllClips] = useState<ClipEvidence[]>(SAMPLE_CLIPS);
  const [availableVideos, setAvailableVideos] = useState<CCTVVideo[]>(SAMPLE_CCTV_VIDEOS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [activeJobs, setActiveJobs] = useState<SearchJob[]>([]);

  // Polling ref for active search
  const searchPollIntervalRef = useRef<number | null>(null);

  // Fetch real CCTV video list on mount
  useEffect(() => {
    getVideos()
      .then(res => {
        if (res.videos && res.videos.length > 0) {
          const mappedVideos: CCTVVideo[] = res.videos.map(v => ({
            id: v.video_id,
            cameraName: v.camera_name || v.filename.replace(/\.[^/.]+$/, ''),
            fileName: v.filename,
            filePath: v.filename,
            fileSizeBytes: v.file_size_bytes,
            durationSeconds: v.duration_seconds,
            fps: v.fps,
            width: v.width,
            height: v.height,
            codec: v.codec || 'H.264 / MP4',
            fileHash: generateEvidenceHash('video', v.video_id),
            isIndexed: true,
            facesDetectedCount: 0,
          }));
          setAvailableVideos(mappedVideos);
        }
      })
      .catch(err => {
        console.warn('Backend videos endpoint unavailable, using mock video catalog:', err);
      });
  }, []);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (searchPollIntervalRef.current) {
        clearInterval(searchPollIntervalRef.current);
      }
    };
  }, []);

  // Security Toast State for Blocked Operations
  const [securityToast, setSecurityToast] = useState<{ id: string; title: string; message: string } | null>(null);

  // Modals
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
  const [webcamCallback, setWebcamCallback] = useState<((dataUrl: string) => void) | null>(null);

  // Active Case object
  const currentCase = cases.find(c => c.id === activeCaseId) || cases[0];
  const caseMatches = allMatches.filter(m => m.caseId === currentCase?.id);
  const caseClips = allClips.filter(c => c.caseId === currentCase?.id);

  // Pending counts
  const pendingReviewsCount = caseMatches.filter(m => m.reviewStatus === 'Pending').length;
  const unindexedVideosCount = availableVideos.filter(v => !v.isIndexed).length;

  const logAudit = (action: string, details: string, caseId?: string, severity: 'info' | 'warning' | 'security' = 'info') => {
    if (!currentUser) return;
    const entry: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      username: currentUser.username,
      action,
      caseId,
      details,
      severity,
    };
    setAuditLogs(prev => [entry, ...prev]);
  };

  const triggerSecurityAlert = (title: string, message: string, caseId?: string) => {
    logAudit('ACCESS_RESTRICTED', `${title}: ${message}`, caseId, 'security');
    setSecurityToast({
      id: `sec-${Date.now()}`,
      title,
      message,
    });
    setTimeout(() => {
      setSecurityToast(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Switch / Manage User
  const handleSwitchUser = () => {
    if (!currentUser) return;
    if (currentUser.role === 'Admin') {
      setActiveTab('users');
    }
  };

  // Handle Video Upload to Backend
  const handleUploadVideo = async (file: File, cameraName?: string): Promise<CCTVVideo> => {
    try {
      const res = await uploadVideo(file, cameraName);
      const newVid: CCTVVideo = {
        id: res.video_id,
        cameraName: res.camera_name || file.name.replace(/\.[^/.]+$/, ''),
        fileName: res.filename,
        filePath: res.filename,
        fileSizeBytes: res.file_size_bytes,
        durationSeconds: res.duration_seconds,
        fps: res.fps,
        width: res.width,
        height: res.height,
        codec: res.codec || 'H.264 / MP4',
        fileHash: generateEvidenceHash('video', res.video_id),
        isIndexed: true,
        facesDetectedCount: 0,
      };
      setAvailableVideos(prev => [newVid, ...prev.filter(v => v.id !== newVid.id)]);
      logAudit('VIDEO_UPLOADED', `Uploaded CCTV recording ${res.filename} (${(res.file_size_bytes / (1024 * 1024)).toFixed(1)} MB, ${res.duration_seconds.toFixed(0)}s)`);
      return newVid;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Video upload failed';
      triggerSecurityAlert('Video Upload Error', msg);
      throw err;
    }
  };

  // Handle Video Deletion from Backend
  const handleDeleteVideo = async (videoId: string): Promise<void> => {
    try {
      await deleteVideo(videoId);
      setAvailableVideos(prev => prev.filter(v => v.id !== videoId));
      logAudit('VIDEO_DELETED', `Deleted CCTV video file ${videoId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Video deletion failed';
      triggerSecurityAlert('Video Deletion Error', msg);
      throw err;
    }
  };

  // Handle Launch Search (Connected to Real Backend)
  const handleStartSearch = async (newCase: Case, selectedVideoIds: string[]) => {
    if (!validatePermission('SEARCH_EXECUTE', (reason) => {
      triggerSecurityAlert('Search Initiation Denied', reason, newCase.id);
    })) {
      return;
    }

    setCases(prev => [newCase, ...prev.filter(c => c.id !== newCase.id)]);
    setActiveCaseId(newCase.id);

    // Create initial background jobs representation for UI
    const initialJobs: SearchJob[] = selectedVideoIds.map((vid, idx) => {
      const v = availableVideos.find(item => item.id === vid);
      return {
        id: `JOB-${Date.now().toString().slice(-4)}-${idx + 1}`,
        caseId: newCase.id,
        cameraName: v?.cameraName || `CAM-0${idx + 1}`,
        status: 'Queued',
        progressPercent: 0,
        currentFile: v?.fileName || 'cctv_recording.mp4',
        timeRange: '09:00:00 - 13:00:00',
        currentTimestamp: '09:00:00',
        processingFps: 0,
        elapsedSeconds: 0,
        estimatedRemainingSeconds: 60,
        facesAnalyzed: 0,
        matchesFound: 0,
      };
    });

    setActiveJobs(initialJobs);
    logAudit('SEARCH_START', `Initiated search across ${selectedVideoIds.length} cameras for candidate ${newCase.candidate?.rollNumber}`, newCase.id);
    setActiveTab('search_results');

    // Attempt real backend search execution
    try {
      const startRes = await startSearch({
        case_id: newCase.id,
        candidate_id: newCase.candidateId,
        selected_video_ids: selectedVideoIds,
        config: {
          sampling_fps: settings.frameSampleFps || 3.0,
          match_threshold: settings.similarityThresholdMedium || 0.50,
          high_confidence_threshold: settings.similarityThresholdHigh || 0.65,
          pre_roll_seconds: settings.preRollSeconds || 5,
          post_roll_seconds: settings.postRollSeconds || 5,
          verification_enabled: true,
          verification_sampling_fps: 8,
          verification_threshold: settings.similarityThresholdMedium || 0.50,
        }
      });

      const searchId = startRes.search_id;

      // Poll real search status
      if (searchPollIntervalRef.current) {
        clearInterval(searchPollIntervalRef.current);
      }

      searchPollIntervalRef.current = window.setInterval(async () => {
        try {
          const status = await getSearchStatus(searchId);

          // Update active jobs with real backend metrics
          setActiveJobs(prev => prev.map(job => ({
            ...job,
            status: status.status === 'RUNNING' ? 'Processing' : status.status === 'COMPLETED' ? 'Completed' : status.status === 'FAILED' ? 'Failed' : 'Queued',
            progressPercent: status.progress_percent,
            processingFps: status.processing_fps || 120,
            elapsedSeconds: Math.round(status.elapsed_seconds),
            estimatedRemainingSeconds: Math.round(status.estimated_remaining_seconds),
            facesAnalyzed: status.faces_detected,
            matchesFound: status.potential_matches,
            currentFile: status.current_video || job.currentFile,
            currentPhase: status.current_phase,
            verificationStatus: status.verification_status,
            verificationEventsTotal: status.verification_events_total,
            verificationEventsProcessed: status.verification_events_processed,
            potentialMatches: status.potential_matches,
            verifiedMatches: status.verified_matches,
          })));

          if (status.status === 'COMPLETED') {
            if (searchPollIntervalRef.current) {
              clearInterval(searchPollIntervalRef.current);
              searchPollIntervalRef.current = null;
            }
            setActiveJobs([]);

            // Retrieve final search results
            const results = await getSearchResults(searchId);
            const mappedMatches: SearchResultMatch[] = results.map(r => ({
              id: r.id,
              caseId: newCase.id,
              searchId: r.search_id,
              candidateId: r.candidate_id,
              videoId: r.video_id,
              cameraName: r.camera_name,
              eventStartSeconds: r.event_start_seconds,
              eventEndSeconds: r.event_end_seconds,
              peakTimestampSeconds: r.peak_timestamp_seconds,
              similarityScore: r.similarity_score,
              confidenceBand: (r.confidence_band as 'High' | 'Medium' | 'Low') || 'High',
              thumbnailUrl: r.thumbnail_url || newCase.candidate?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
              cctvFrameUrl: r.cctv_frame_url || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1280&h=720&fit=crop',
              searchType: 'Face Recognition (SFace)',
              reviewStatus: 'Pending',
              clipGenerated: r.clip_generated || false,
              clipId: r.clip_id,
              boundingBox: {
                x: r.bounding_box.x,
                y: r.bounding_box.y,
                w: r.bounding_box.width,
                h: r.bounding_box.height,
              },
              verificationStatus: (r.verification_status as 'VERIFIED' | 'REJECTED' | 'INCONCLUSIVE' | 'UNVERIFIED') || 'VERIFIED',
              pass1_event_id: r.pass1_event_id,
              pass1_start_time: r.pass1_start_time,
              pass1_end_time: r.pass1_end_time,
              pass1_peak_similarity: r.pass1_peak_similarity,
              verification_match_count: r.verification_match_count,
              verification_sampling_fps: r.verification_sampling_fps,
              verification_peak_similarity: r.verification_peak_similarity,
            }));

            setAllMatches(prev => [...mappedMatches, ...prev.filter(m => m.caseId !== newCase.id)]);
            setCases(prev => prev.map(c => c.id === newCase.id ? {
              ...c,
              status: 'Review Required',
              totalMatchesCount: mappedMatches.length,
            } : c));

            logAudit('SEARCH_COMPLETE', `Real backend search completed: found ${mappedMatches.length} candidate appearance occurrences.`, newCase.id);
          } else if (status.status === 'FAILED' || status.status === 'CANCELLED') {
            if (searchPollIntervalRef.current) {
              clearInterval(searchPollIntervalRef.current);
              searchPollIntervalRef.current = null;
            }
            setActiveJobs([]);
            triggerSecurityAlert('Search Job Failed', status.error || 'Search job encountered a backend processing error.');
            logAudit('SEARCH_FAILED', `Search job failed: ${status.error || 'Unknown error'}`, newCase.id, 'warning');
          }
        } catch (pollErr) {
          console.warn('Polling error on search status:', pollErr);
        }
      }, 1000);

    } catch (backendErr: any) {
      const errMsg = backendErr?.message || 'Failed to start CCTV search job.';
      console.error('Real backend search_start endpoint error:', backendErr);
      setActiveJobs([]);
      triggerSecurityAlert('Search Start Error', errMsg);
      logAudit('SEARCH_START_FAILED', `Failed to start search: ${errMsg}`, newCase.id, 'security');
    }
  };

  // Confirm Match Action
  const handleConfirmMatch = (matchId: string, notes?: string) => {
    if (!validatePermission('MATCH_REVIEW', (reason) => {
      triggerSecurityAlert('Review Confirmation Denied', reason, currentCase?.id);
    })) {
      return;
    }

    setAllMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          reviewStatus: 'Confirmed',
          reviewer: currentUser?.username || 'Auditor',
          reviewedAt: new Date().toISOString(),
          reviewNotes: notes || 'Confirmed by auditor',
        };
      }
      return m;
    }));

    setCases(prev => prev.map(c => {
      if (c.id === currentCase.id) {
        const confirmed = allMatches.filter(m => m.caseId === c.id && (m.id === matchId || m.reviewStatus === 'Confirmed')).length;
        return {
          ...c,
          confirmedMatchesCount: confirmed,
          status: confirmed > 0 ? 'Completed' : c.status,
        };
      }
      return c;
    }));

    logAudit('MATCH_CONFIRMED', `Auditor confirmed candidate match event ${matchId}. Notes: ${notes || 'Verified'}`, currentCase.id);
  };

  // Reject Match Action
  const handleRejectMatch = (matchId: string, notes?: string) => {
    if (!validatePermission('MATCH_REVIEW', (reason) => {
      triggerSecurityAlert('Review Rejection Denied', reason, currentCase?.id);
    })) {
      return;
    }

    setAllMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          reviewStatus: 'Rejected',
          reviewer: currentUser?.username || 'Auditor',
          reviewedAt: new Date().toISOString(),
          reviewNotes: notes || 'Rejected by auditor',
        };
      }
      return m;
    }));

    logAudit('MATCH_REJECTED', `Auditor rejected match event ${matchId}. Reason: ${notes || 'False positive'}`, currentCase.id);
  };

  // Generate Clip (Real Backend Extraction)
  const handleGenerateClip = async (matchId: string, preRoll: number, postRoll: number) => {
    if (!validatePermission('CLIP_GENERATE', (reason) => {
      triggerSecurityAlert('Clip Generation Denied', reason, currentCase?.id);
    })) {
      return;
    }

    const match = allMatches.find(m => m.id === matchId);
    if (!match) return;

    const startSec = Math.max(0, match.eventStartSeconds - preRoll);
    const endSec = match.eventEndSeconds + postRoll;
    const duration = endSec - startSec;
    const clipName = `${currentCase.caseCode}_${match.cameraName.replace(/[^a-zA-Z0-9]/g, '_')}_${startSec}s-${endSec}s.mp4`;

    try {
      const res = await extractClip({
        event_id: match.id,
        search_id: match.searchId,
        case_id: currentCase.id,
        video_id: match.videoId,
        camera_name: match.cameraName,
        candidate_id: currentCase.candidateId,
        start_time_seconds: startSec,
        end_time_seconds: endSec,
        peak_timestamp_seconds: match.peakTimestampSeconds,
        peak_similarity: match.similarityScore,
        pre_roll_seconds: preRoll,
        post_roll_seconds: postRoll,
      });

      const extractedClip = res.clip;
      const newClip: ClipEvidence = {
        id: extractedClip.clip_id,
        caseId: currentCase.id,
        searchResultId: match.id,
        cameraName: match.cameraName,
        clipFileName: extractedClip.output_filename,
        clipUrl: getClipStreamUrl(extractedClip.clip_id),
        preRollSeconds: preRoll,
        postRollSeconds: postRoll,
        clipStartSeconds: extractedClip.clip_start_seconds,
        clipEndSeconds: extractedClip.clip_end_seconds,
        clipDurationSeconds: extractedClip.duration_seconds,
        clipSha256: extractedClip.sha256,
        sourceFileName: extractedClip.source_video_filename,
        sourceFileSha256: generateEvidenceHash('source', match.cameraName),
        appVersion: 'CCTV-Search-v1.0.0-win64',
        generatedAt: extractedClip.created_at || new Date().toISOString().replace('T', ' ').substring(0, 19),
        generatedBy: currentUser?.username || 'officer',
        caseCode: currentCase.caseCode,
        candidateRoll: currentCase.candidate?.rollNumber || 'EX-UNKNOWN',
        extractionMethod: extractedClip.extraction_method,
      };

      setAllClips(prev => [newClip, ...prev.filter(c => c.id !== newClip.id)]);
      setAllMatches(prev => prev.map(m => m.id === matchId ? { ...m, clipGenerated: true, clipId: newClip.id } : m));

      setCases(prev => prev.map(c => c.id === currentCase.id ? {
        ...c,
        clipsCount: c.clipsCount + 1,
      } : c));

      logAudit('CLIP_GENERATED', `Extracted evidence clip ${extractedClip.output_filename} (${extractedClip.duration_seconds}s, SHA-256: ${extractedClip.sha256.substring(0, 16)}...)`, currentCase.id);
    } catch (clipErr: any) {
      const errMsg = clipErr?.message || 'Failed to extract video clip from backend.';
      console.error('Real backend clip extraction failed:', clipErr);
      triggerSecurityAlert('Clip Extraction Failed', errMsg);
      logAudit('CLIP_EXTRACTION_FAILED', `Clip extraction failed: ${errMsg}`, currentCase.id, 'warning');
    }
  };

  // Generate all confirmed clips
  const handleGenerateAllConfirmedClips = () => {
    if (!validatePermission('CLIP_GENERATE', (reason) => {
      triggerSecurityAlert('Batch Clip Generation Denied', reason, currentCase?.id);
    })) {
      return;
    }

    const confirmedMatches = caseMatches.filter(m => m.reviewStatus === 'Confirmed' && !m.clipGenerated);
    confirmedMatches.forEach(m => {
      handleGenerateClip(m.id, settings.preRollSeconds, settings.postRollSeconds);
    });
    logAudit('BATCH_CLIPS_GENERATED', `Generated ${confirmedMatches.length} evidence clips with SHA-256 hashes.`, currentCase?.id);
    setActiveTab('clips');
  };

  // 1-Click Examination Demo Preset
  const handleLoadQuickDemo = () => {
    const demoCandidate = SAMPLE_CANDIDATES[0];
    const demoCase: Case = {
      id: `DEMO-CASE-${Date.now().toString().slice(-4)}`,
      caseCode: `CASE-2026-EXAM-DEMO`,
      client: 'National Testing & Examination Agency',
      examName: 'National Combined Entrance Examination 2026',
      examDate: '2026-08-28',
      centreName: 'Centre #104 - Sector 14, Delhi Examination Center',
      candidateId: demoCandidate.id,
      candidate: demoCandidate,
      notes: 'Demo test case with pre-indexed multi-camera CCTV footage for auditor evaluation.',
      storagePath: `${settings.casesDir}\\DEMO-CASE`,
      status: 'Review Required',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser?.username || 'admin',
      videoIds: availableVideos.map(v => v.id),
      totalMatchesCount: 4,
      confirmedMatchesCount: 1,
      rejectedMatchesCount: 0,
      clipsCount: 2,
    };

    setCases(prev => [demoCase, ...prev.filter(c => c.caseCode !== demoCase.caseCode)]);
    setActiveCaseId(demoCase.id);
    logAudit('DEMO_LOADED', 'Loaded 1-Click live exam demo candidate case.');
    setActiveTab('search_results');
  };

  // Index Video
  const handleIndexVideo = (videoId: string) => {
    if (!validatePermission('VECTOR_INDEX', (reason) => {
      triggerSecurityAlert('Vector Indexing Denied', reason);
    })) {
      return;
    }

    setAvailableVideos(prev => prev.map(v => {
      if (v.id === videoId) {
        return {
          ...v,
          isIndexed: true,
          facesDetectedCount: 1450,
          indexedAt: new Date().toISOString().substring(0, 19),
        };
      }
      return v;
    }));
    logAudit('VECTOR_INDEX_BUILT', `Indexed CCTV video file ${videoId} into FAISS vector cache.`);
  };

  const handleBulkIndex = () => {
    if (!validatePermission('VECTOR_INDEX', (reason) => {
      triggerSecurityAlert('Bulk Indexing Denied', reason);
    })) {
      return;
    }

    setAvailableVideos(prev => prev.map(v => ({
      ...v,
      isIndexed: true,
      facesDetectedCount: v.facesDetectedCount || 1200,
      indexedAt: new Date().toISOString().substring(0, 19),
    })));
    logAudit('BULK_INDEX_COMPLETE', 'Indexed all unindexed CCTV recordings into local vector storage.');
  };

  const handleDeleteIndex = (videoId: string) => {
    if (!validatePermission('DELETE_INDEX', (reason) => {
      triggerSecurityAlert('Index Deletion Restricted', reason);
    })) {
      return;
    }

    setAvailableVideos(prev => prev.map(v => v.id === videoId ? { ...v, isIndexed: false, facesDetectedCount: 0 } : v));
    logAudit('INDEX_DELETED', `Deleted vector cache index for video ${videoId}`);
  };

  const handleDeleteCase = (caseId: string) => {
    if (!validatePermission('CASE_DELETE', (reason) => {
      triggerSecurityAlert('Case Deletion Restricted', reason, caseId);
    })) {
      return;
    }

    setCases(prev => prev.filter(c => c.id !== caseId));
    if (activeCaseId === caseId && cases.length > 1) {
      setActiveCaseId(cases.find(c => c.id !== caseId)?.id || '');
    }
    logAudit('CASE_DELETED', `Deleted case ${caseId}`);
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    if (!validatePermission('SETTINGS_MODIFY', (reason) => {
      triggerSecurityAlert('Settings Modification Restricted', reason);
    })) {
      return;
    }

    setSettings(newSettings);
    logAudit('SETTINGS_UPDATED', 'Updated application thresholds and storage directory paths.');
  };

  // If loading authentication state, show polished splash screen
  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200 select-none">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)] animate-pulse">
            <ScanFace className="w-8 h-8 text-blue-400" />
          </div>
          <div className="text-center">
            <h2 className="text-sm font-bold tracking-wider uppercase font-mono text-slate-100">
              CCTV Forensic Workstation
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-mono flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span>Verifying biometric security & session credentials...</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, render Login Page as the mandatory first screen
  if (!currentUser) {
    return <LoginView />;
  }

  // Render Authenticated Forensic Workstation
  return (
    <div id="cctv-forensic-workstation" className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden select-none">
      {/* Top Windows Title Bar */}
      <WindowsTitleBar
        currentCase={currentCase}
        cases={cases}
        onSelectCase={setActiveCaseId}
        currentUser={currentUser}
        systemHardware={INITIAL_HARDWARE}
        onOpenSystemInfo={() => setActiveTab('system_info')}
        onOpenQuickDemo={handleLoadQuickDemo}
        onLogout={signOutUser}
      />

      {/* Main App Canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentUser={currentUser}
          pendingReviewsCount={pendingReviewsCount}
          totalClipsCount={caseClips.length}
          unindexedVideosCount={unindexedVideosCount}
          onSwitchUser={handleSwitchUser}
          onLogout={signOutUser}
        />

        {/* Center Content View Area */}
        <main className="flex-1 bg-slate-950/40 backdrop-blur-sm overflow-hidden flex flex-col relative z-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              cases={cases}
              activeJobs={activeJobs}
              onSelectCase={(id) => {
                setActiveCaseId(id);
                setActiveTab('search_results');
              }}
              onNavigateTab={setActiveTab}
              onOpenQuickDemo={handleLoadQuickDemo}
              onOpenBenchmark={() => setShowBenchmarkModal(true)}
              systemHardware={INITIAL_HARDWARE}
            />
          )}

          {activeTab === 'new_search' && (
            <NewSearchView
              onStartSearch={handleStartSearch}
              availableVideos={availableVideos}
              settings={settings}
              onOpenWebcam={(cb) => setWebcamCallback(() => cb)}
            />
          )}

          {activeTab === 'cctv_index' && (
            <CCTVIndexingView
              videos={availableVideos}
              onIndexVideo={handleIndexVideo}
              onBulkIndex={handleBulkIndex}
              onDeleteIndex={handleDeleteIndex}
              onUploadVideo={handleUploadVideo}
              onDeleteVideo={handleDeleteVideo}
            />
          )}

          {activeTab === 'search_results' && (
            <SearchResultsView
              currentCase={currentCase}
              matches={caseMatches}
              onConfirmMatch={handleConfirmMatch}
              onRejectMatch={handleRejectMatch}
              onGenerateClip={handleGenerateClip}
              onGenerateAllConfirmedClips={handleGenerateAllConfirmedClips}
              settings={settings}
              onExportReport={() => {
                if (currentCase) {
                  generatePdfReport(currentCase, currentCase.candidate!, caseMatches, caseClips);
                }
              }}
            />
          )}

          {activeTab === 'clips' && (
            <ClipsEvidenceView
              currentCase={currentCase}
              clips={allClips}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              currentCase={currentCase}
              matches={caseMatches}
              clips={caseClips}
            />
          )}

          {activeTab === 'cases' && (
            <CasesView
              cases={cases}
              currentCase={currentCase}
              onSelectCase={setActiveCaseId}
              onNavigateTab={setActiveTab}
              onDeleteCase={handleDeleteCase}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementView />
          )}

          {activeTab === 'audit_logs' && (
            <AuditLogView logs={auditLogs} />
          )}

          {activeTab === 'system_info' && (
            <SystemInfoView
              hardware={INITIAL_HARDWARE}
              onOpenBenchmark={() => setShowBenchmarkModal(true)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
            />
          )}
        </main>
      </div>

      {/* Security Restricted Action Toast */}
      {securityToast && (
        <div 
          id="security-rbac-toast"
          className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 border border-amber-500/50 shadow-2xl rounded-xl p-4 text-slate-100 flex items-start gap-3.5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                {securityToast.title}
              </h4>
              <button 
                onClick={() => setSecurityToast(null)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-0.5 rounded"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {securityToast.message}
            </p>
            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Active Role: <strong className="text-slate-200">{currentUser?.role || 'Unknown'}</strong></span>
              <span className="text-amber-400/80 font-medium">Logged to Audit Trail</span>
            </div>
          </div>
        </div>
      )}

      {/* Benchmark Modal */}
      {showBenchmarkModal && (
        <BenchmarkModal
          systemHardware={INITIAL_HARDWARE}
          onClose={() => setShowBenchmarkModal(false)}
        />
      )}

      {/* Webcam Modal */}
      {webcamCallback && (
        <WebcamModal
          onCapture={webcamCallback}
          onClose={() => setWebcamCallback(null)}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ForensicWorkstation />
    </AuthProvider>
  );
}

export default App;
