/**
 * Cryptographic utility functions for CCTV evidence integrity verification.
 */

export async function computeSha256(data: string | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer;
  if (typeof data === 'string') {
    const encoder = new TextEncoder();
    buffer = encoder.encode(data).buffer;
  } else {
    buffer = data;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export function generateEvidenceHash(prefix: string, seedString: string): string {
  // Deterministic fast hash for mock or client-side assets
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const part2 = Math.abs((hash * 31) | 0).toString(16).padStart(8, '0');
  const part3 = Math.abs((hash * 97) | 0).toString(16).padStart(8, '0');
  const part4 = Math.abs((hash * 139) | 0).toString(16).padStart(8, '0');
  const part5 = Math.abs((hash * 211) | 0).toString(16).padStart(8, '0');
  const part6 = Math.abs((hash * 277) | 0).toString(16).padStart(8, '0');
  const part7 = Math.abs((hash * 331) | 0).toString(16).padStart(8, '0');
  const part8 = Math.abs((hash * 401) | 0).toString(16).padStart(8, '0');
  return `${hex}${part2}${part3}${part4}${part5}${part6}${part7}${part8}`.substring(0, 64);
}

export function formatSecondsToTimecode(totalSeconds: number, includeHours: boolean = true): string {
  const isNegative = totalSeconds < 0;
  const absSeconds = Math.abs(totalSeconds);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = Math.floor(absSeconds % 60);
  const millis = Math.floor((absSeconds % 1) * 100);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const sign = isNegative ? '-' : '';
  if (includeHours || hours > 0) {
    return `${sign}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${sign}${pad(minutes)}:${pad(seconds)}.${pad(millis)}`;
}

export function formatTimeOfDay(baseHour: number, baseMinute: number, offsetSeconds: number): string {
  const totalSec = baseHour * 3600 + baseMinute * 60 + offsetSeconds;
  const hours = Math.floor(totalSec / 3600) % 24;
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = Math.floor(totalSec % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${pad(displayHours)}:${pad(minutes)}:${pad(seconds)} ${ampm}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
