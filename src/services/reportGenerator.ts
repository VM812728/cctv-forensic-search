import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Case, SearchResultMatch, ClipEvidence, Candidate } from '../types';
import { formatSecondsToTimecode, formatTimeOfDay } from './cryptoUtils';

export function generatePdfReport(
  currentCase: Case,
  candidate: Candidate,
  matches: SearchResultMatch[],
  clips: ClipEvidence[],
  reviewerName: string = 'Chief Examination Auditor'
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor: [number, number, number] = [24, 43, 73]; // Deep Navy
  const accentColor: [number, number, number] = [37, 99, 235]; // Blue

  // Top Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('EXAMINATION CCTV CANDIDATE IDENTIFICATION REPORT', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('AI BIOMETRIC SEARCH & FORENSIC EVIDENCE EXTRACTION LOG', 14, 18);
  doc.text(`Generated: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`, 14, 23);

  // Metadata Card Block
  let y = 36;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. Case & Examination Details', 14, y);

  y += 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 38, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Case Code:', 18, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(currentCase.caseCode, 45, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.text('Client / Agency:', 110, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(currentCase.client || 'N/A', 145, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.text('Exam Name:', 18, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(currentCase.examName || 'N/A', 45, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('Exam Date:', 110, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(currentCase.examDate || 'N/A', 145, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('Centre Name:', 18, y + 21);
  doc.setFont('helvetica', 'normal');
  const splitCentre = doc.splitTextToSize(currentCase.centreName || 'N/A', 140);
  doc.text(splitCentre, 45, y + 21);

  doc.setFont('helvetica', 'bold');
  doc.text('Candidate Roll:', 18, y + 31);
  doc.setFont('helvetica', 'normal');
  doc.text(`${candidate.rollNumber} - ${candidate.candidateName}`, 45, y + 31);

  doc.setFont('helvetica', 'bold');
  doc.text('Review Status:', 110, y + 31);
  doc.setFont('helvetica', 'normal');
  doc.text(currentCase.status, 145, y + 31);

  // Mandatory Biometric Disclaimer Box
  y += 44;
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(14, y, pageWidth - 28, 16, 2, 2, 'FD');

  doc.setTextColor(185, 28, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('LEGAL & EVIDENTIARY NOTICE (MANDATORY HUMAN AUDIT REQUIREMENT):', 18, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('AI-generated face matching similarity scores are subject to mandatory human verification. This document', 18, y + 9);
  doc.text('records human-audited occurrences confirmed by the designated CCTV forensic officer.', 18, y + 13);

  // Section 2: Confirmed Occurrences & Matches Table
  y += 24;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. Candidate CCTV Appearance Events', 14, y);

  const matchRows = matches.map((m, idx) => [
    `#${idx + 1}`,
    m.cameraName,
    `${formatSecondsToTimecode(m.eventStartSeconds)} – ${formatSecondsToTimecode(m.eventEndSeconds)}`,
    `${m.eventEndSeconds - m.eventStartSeconds}s`,
    `${(m.similarityScore * 100).toFixed(1)}%`,
    m.searchType === 'Face Recognition (SFace)' ? 'YuNet + SFace' : 'Appearance',
    m.reviewStatus.toUpperCase(),
    m.reviewer || 'N/A',
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [['#', 'Camera', 'Time Range', 'Duration', 'Confidence', 'AI Engine', 'Auditor Verdict', 'Reviewer']],
    body: matchRows.length > 0 ? matchRows : [['-', 'No appearance events recorded', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-expect-error autoTable adds lastAutoTable property
  y = doc.lastAutoTable.finalY + 12;

  // Check page overflow
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  // Section 3: Extracted Video Clips & SHA-256 Hashes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. Extracted Video Evidence Clips & SHA-256 Integrity Hashes', 14, y);

  const clipRows = clips.map((c, idx) => [
    `Clip #${idx + 1}`,
    c.cameraName,
    c.clipFileName,
    `${c.clipDurationSeconds}s`,
    c.clipSha256.substring(0, 24) + '...',
    c.generatedAt.substring(0, 19),
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [['Ref', 'Camera', 'Evidence Filename', 'Duration', 'SHA-256 Hash Digest', 'Timestamp']],
    body: clipRows.length > 0 ? clipRows : [['-', 'No clips generated for this case', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [45, 55, 72],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      font: 'courier',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-expect-error autoTable adds lastAutoTable property
  y = doc.lastAutoTable.finalY + 14;

  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  // Sign-off Block
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y + 18, 80, y + 18);
  doc.line(pageWidth - 80, y + 18, pageWidth - 14, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Forensic CCTV Auditor Signature', 14, y + 23);
  doc.text(`Auditor: ${reviewerName}`, 14, y + 27);

  doc.text('Centre Superintendent / Observer Seal', pageWidth - 80, y + 23);
  doc.text('National Examination Security Division', pageWidth - 80, y + 27);

  // Download PDF
  doc.save(`${currentCase.caseCode}_CCTV_Forensic_Report.pdf`);
}

export function generateCsvReport(
  currentCase: Case,
  candidate: Candidate,
  matches: SearchResultMatch[],
  clips: ClipEvidence[]
): void {
  const headers = [
    'Case ID',
    'Candidate ID / Roll No',
    'Candidate Name',
    'Centre Name',
    'Exam Name',
    'Exam Date',
    'Camera',
    'Source File',
    'Peak Match Timestamp (Sec)',
    'Event Start Timestamp',
    'Event End Timestamp',
    'Event Duration (Sec)',
    'Similarity Score (%)',
    'Confidence Band',
    'Search Type',
    'Reviewer',
    'Review Status',
    'Review Timestamp',
    'Clip Filename',
    'Clip SHA-256 Hash',
    'Source File SHA-256 Hash',
    'Clip Generation Time',
  ];

  const rows = matches.map((m) => {
    const clip = clips.find((c) => c.searchResultId === m.id);
    return [
      `"${currentCase.caseCode}"`,
      `"${candidate.rollNumber}"`,
      `"${candidate.candidateName}"`,
      `"${(currentCase.centreName || '').replace(/"/g, '""')}"`,
      `"${(currentCase.examName || '').replace(/"/g, '""')}"`,
      `"${currentCase.examDate}"`,
      `"${m.cameraName}"`,
      `"${clip ? clip.sourceFileName : 'N/A'}"`,
      m.peakTimestampSeconds,
      `"${formatSecondsToTimecode(m.eventStartSeconds)}"`,
      `"${formatSecondsToTimecode(m.eventEndSeconds)}"`,
      m.eventEndSeconds - m.eventStartSeconds,
      (m.similarityScore * 100).toFixed(2),
      `"${m.confidenceBand}"`,
      `"${m.searchType}"`,
      `"${m.reviewer || 'N/A'}"`,
      `"${m.reviewStatus}"`,
      `"${m.reviewedAt || 'N/A'}"`,
      `"${clip ? clip.clipFileName : 'N/A'}"`,
      `"${clip ? clip.clipSha256 : 'N/A'}"`,
      `"${clip ? clip.sourceFileSha256 : 'N/A'}"`,
      `"${clip ? clip.generatedAt : 'N/A'}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${currentCase.caseCode}_CCTV_Report.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateHashManifest(
  currentCase: Case,
  clips: ClipEvidence[]
): void {
  const lines = [
    `================================================================================`,
    `CCTV CANDIDATE SEARCH & CLIP EXTRACTION - EVIDENCE INTEGRITY MANIFEST (SHA-256)`,
    `================================================================================`,
    `Case Code:        ${currentCase.caseCode}`,
    `Client:           ${currentCase.client}`,
    `Exam Name:        ${currentCase.examName}`,
    `Exam Date:        ${currentCase.examDate}`,
    `Centre:           ${currentCase.centreName}`,
    `Manifest Date:    ${new Date().toISOString()} UTC`,
    `Verification:     SHA-256 Cryptographic Hash Standard`,
    `================================================================================`,
    ``,
    `EVIDENCE CLIPS LIST:`,
    `--------------------------------------------------------------------------------`,
  ];

  clips.forEach((clip, i) => {
    lines.push(`Clip #${i + 1}: ${clip.clipFileName}`);
    lines.push(`  Camera:            ${clip.cameraName}`);
    lines.push(`  Duration:          ${clip.clipDurationSeconds} seconds (${formatSecondsToTimecode(clip.clipStartSeconds)} to ${formatSecondsToTimecode(clip.clipEndSeconds)})`);
    lines.push(`  Clip SHA-256:      ${clip.clipSha256}`);
    lines.push(`  Source Video:      ${clip.sourceFileName}`);
    lines.push(`  Source SHA-256:    ${clip.sourceFileSha256}`);
    lines.push(`  Created At:        ${clip.generatedAt} by ${clip.generatedBy}`);
    lines.push(`  App Version:       ${clip.appVersion}`);
    lines.push(`--------------------------------------------------------------------------------`);
  });

  lines.push(``);
  lines.push(`LEGAL NOTICE:`);
  lines.push(`All clips are extracted with bit-exact integrity preservation.`);
  lines.push(`To verify hashes in Windows PowerShell:`);
  lines.push(`  Get-FileHash -Algorithm SHA256 .\\Evidence\\<filename>.mp4`);
  lines.push(`================================================================================`);

  const textContent = lines.join('\n');
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${currentCase.caseCode}_Evidence_Hashes.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
