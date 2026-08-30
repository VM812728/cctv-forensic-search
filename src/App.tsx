import React, { useState } from 'react';
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
import { BenchmarkModal } from './components/BenchmarkModal';
import { WebcamModal } from './components/WebcamModal';

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

export function App() {
  // Navigation & Active States
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [cases, setCases] = useState<Case[]>(INITIAL_CASES);
  const [activeCaseId, setActiveCaseId] = useState<string>(INITIAL_CASES[0].id);
  const [allMatches, setAllMatches] = useState<SearchResultMatch[]>(SAMPLE_MATCHES);
  const [allClips, setAllClips] = useState<ClipEvidence[]>(SAMPLE_CLIPS);
  const [availableVideos, setAvailableVideos] = useState<CCTVVideo[]>(SAMPLE_CCTV_VIDEOS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [activeJobs, setActiveJobs] = useState<SearchJob[]>([]);

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

  const logAudit = (action: string, details: string, caseId?: string) => {
    const entry: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      username: currentUser.username,
      action,
      caseId,
      details,
      severity: 'info',
    };
    setAuditLogs(prev => [entry, ...prev]);
  };

  // Switch User Role
  const handleSwitchUser = () => {
    const nextIdx = (INITIAL_USERS.findIndex(u => u.id === currentUser.id) + 1) % INITIAL_USERS.length;
    const nextUser = INITIAL_USERS[nextIdx];
    setCurrentUser(nextUser);
    logAudit('LOGIN', `User session switched to ${nextUser.username} (${nextUser.role})`);
  };

  // Handle Launch Search
  const handleStartSearch = (newCase: Case, selectedVideoIds: string[]) => {
    setCases(prev => [newCase, ...prev]);
    setActiveCaseId(newCase.id);

    // Create background jobs for each selected video
    const newJobs: SearchJob[] = selectedVideoIds.map((vid, idx) => {
      const v = availableVideos.find(item => item.id === vid);
      return {
        id: `JOB-${Date.now().toString().slice(-4)}-${idx + 1}`,
        caseId: newCase.id,
        cameraName: v?.cameraName || `CAM-0${idx + 1}`,
        status: 'Processing',
        progressPercent: 5,
        currentFile: v?.fileName || 'cctv_recording.mp4',
        timeRange: '09:00:00 - 13:00:00',
        currentTimestamp: '09:15:30',
        processingFps: 135.0,
        elapsedSeconds: 12,
        estimatedRemainingSeconds: 45,
        facesAnalyzed: 0,
        matchesFound: 0,
      };
    });

    setActiveJobs(newJobs);
    logAudit('SEARCH_START', `Initiated search across ${selectedVideoIds.length} cameras for candidate ${newCase.candidate?.rollNumber}`, newCase.id);

    // Simulate animated progressive search processing
    let prog = 5;
    const interval = setInterval(() => {
      prog += 20;
      if (prog >= 100) {
        clearInterval(interval);
        setActiveJobs([]);
        
        // Generate simulated matches for this new search
        const generatedMatches: SearchResultMatch[] = [
          {
            id: `match-${newCase.id}-1`,
            caseId: newCase.id,
            candidateId: newCase.candidateId,
            videoId: selectedVideoIds[0] || 'vid-01',
            cameraName: 'CAM-01 (Main Entry Gate)',
            eventStartSeconds: 140,
            eventEndSeconds: 162,
            peakTimestampSeconds: 151,
            similarityScore: 0.892,
            confidenceBand: 'High',
            thumbnailUrl: newCase.candidate?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
            cctvFrameUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1280&h=720&fit=crop',
            searchType: 'Face Recognition (SFace)',
            reviewStatus: 'Pending',
            clipGenerated: false,
            boundingBox: { x: 380, y: 220, w: 160, h: 220 },
          },
          {
            id: `match-${newCase.id}-2`,
            caseId: newCase.id,
            candidateId: newCase.candidateId,
            videoId: selectedVideoIds[1] || 'vid-02',
            cameraName: 'CAM-02 (Biometric Desk)',
            eventStartSeconds: 310,
            eventEndSeconds: 335,
            peakTimestampSeconds: 322,
            similarityScore: 0.865,
            confidenceBand: 'High',
            thumbnailUrl: newCase.candidate?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
            cctvFrameUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1280&h=720&fit=crop',
            searchType: 'Face Recognition (SFace)',
            reviewStatus: 'Pending',
            clipGenerated: false,
            boundingBox: { x: 720, y: 290, w: 180, h: 240 },
          },
          {
            id: `match-${newCase.id}-3`,
            caseId: newCase.id,
            candidateId: newCase.candidateId,
            videoId: selectedVideoIds[2] || 'vid-03',
            cameraName: 'CAM-03 (Corridor A)',
            eventStartSeconds: 580,
            eventEndSeconds: 602,
            peakTimestampSeconds: 591,
            similarityScore: 0.724,
            confidenceBand: 'Medium',
            thumbnailUrl: newCase.candidate?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
            cctvFrameUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1280&h=720&fit=crop',
            searchType: 'Face Recognition (SFace)',
            reviewStatus: 'Pending',
            clipGenerated: false,
            boundingBox: { x: 510, y: 190, w: 140, h: 190 },
          }
        ];

        setAllMatches(prev => [...generatedMatches, ...prev]);
        setCases(prev => prev.map(c => c.id === newCase.id ? { 
          ...c, 
          status: 'Review Required',
          totalMatchesCount: generatedMatches.length,
        } : c));

        logAudit('SEARCH_COMPLETE', `Search complete: found ${generatedMatches.length} candidate appearance occurrences.`, newCase.id);
        setActiveTab('search_results');
      } else {
        setActiveJobs(prev => prev.map(j => ({
          ...j,
          progressPercent: prog,
          facesAnalyzed: Math.round(prog * 18.5),
          matchesFound: prog > 50 ? 2 : 0,
        })));
      }
    }, 450);

    setActiveTab('search_results');
  };

  // Confirm Match Action
  const handleConfirmMatch = (matchId: string, notes?: string) => {
    setAllMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          reviewStatus: 'Confirmed',
          reviewer: currentUser.username,
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
    setAllMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          reviewStatus: 'Rejected',
          reviewer: currentUser.username,
          reviewedAt: new Date().toISOString(),
          reviewNotes: notes || 'Rejected by auditor',
        };
      }
      return m;
    }));

    logAudit('MATCH_REJECTED', `Auditor rejected match event ${matchId}. Reason: ${notes || 'False positive'}`, currentCase.id);
  };

  // Generate Clip
  const handleGenerateClip = (matchId: string, preRoll: number, postRoll: number) => {
    const match = allMatches.find(m => m.id === matchId);
    if (!match) return;

    const startSec = Math.max(0, match.eventStartSeconds - preRoll);
    const endSec = match.eventEndSeconds + postRoll;
    const duration = endSec - startSec;
    const clipName = `${currentCase.caseCode}_${match.cameraName.replace(/[^a-zA-Z0-9]/g, '_')}_${startSec}s-${endSec}s.mp4`;

    const newClip: ClipEvidence = {
      id: `clip-${Date.now()}`,
      caseId: currentCase.id,
      searchResultId: match.id,
      cameraName: match.cameraName,
      clipFileName: clipName,
      clipUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      preRollSeconds: preRoll,
      postRollSeconds: postRoll,
      clipStartSeconds: startSec,
      clipEndSeconds: endSec,
      clipDurationSeconds: duration,
      clipSha256: generateEvidenceHash('clip', `${clipName}-${Date.now()}`),
      sourceFileName: `${match.cameraName.toLowerCase().replace(/\s/g, '_')}_0900_1300.mp4`,
      sourceFileSha256: generateEvidenceHash('source', match.cameraName),
      appVersion: 'CCTV-Search-v1.0.0-win64',
      generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      generatedBy: currentUser.username,
      caseCode: currentCase.caseCode,
      candidateRoll: currentCase.candidate?.rollNumber || 'EX-UNKNOWN',
    };

    setAllClips(prev => [newClip, ...prev]);
    setAllMatches(prev => prev.map(m => m.id === matchId ? { ...m, clipGenerated: true } : m));

    setCases(prev => prev.map(c => c.id === currentCase.id ? {
      ...c,
      clipsCount: c.clipsCount + 1,
    } : c));

    logAudit('CLIP_GENERATED', `Extracted evidence clip ${clipName} (${duration}s, SHA-256: ${newClip.clipSha256.substring(0, 16)}...)`, currentCase.id);
  };

  // Generate all confirmed clips
  const handleGenerateAllConfirmedClips = () => {
    const confirmedMatches = caseMatches.filter(m => m.reviewStatus === 'Confirmed' && !m.clipGenerated);
    confirmedMatches.forEach(m => {
      handleGenerateClip(m.id, settings.preRollSeconds, settings.postRollSeconds);
    });
    alert(`Generated ${confirmedMatches.length} new evidence clips with SHA-256 hashes.`);
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
      createdBy: 'admin',
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
    setAvailableVideos(prev => prev.map(v => ({
      ...v,
      isIndexed: true,
      facesDetectedCount: v.facesDetectedCount || 1200,
      indexedAt: new Date().toISOString().substring(0, 19),
    })));
    logAudit('BULK_INDEX_COMPLETE', 'Indexed all unindexed CCTV recordings into local vector storage.');
  };

  const handleDeleteIndex = (videoId: string) => {
    setAvailableVideos(prev => prev.map(v => v.id === videoId ? { ...v, isIndexed: false, facesDetectedCount: 0 } : v));
    logAudit('INDEX_DELETED', `Deleted vector cache index for video ${videoId}`);
  };

  const handleDeleteCase = (caseId: string) => {
    setCases(prev => prev.filter(c => c.id !== caseId));
    if (activeCaseId === caseId && cases.length > 1) {
      setActiveCaseId(cases.find(c => c.id !== caseId)?.id || '');
    }
    logAudit('CASE_DELETED', `Deleted case ${caseId}`);
  };

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
              onSaveSettings={(newSettings) => {
                setSettings(newSettings);
                logAudit('SETTINGS_UPDATED', 'Updated application thresholds and storage directory paths.');
              }}
            />
          )}
        </main>
      </div>

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

export default App;
