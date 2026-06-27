/**
 * statsSync.ts
 *
 * Syncs player stats and match history to the backend.
 * All operations are fire-and-forget and silently catch errors —
 * localStorage always remains the primary source of truth.
 */

import type { PlayerStats } from '../utils/statsSystem';
import type { MatchHistoryEntry } from '../utils/statsSystem';
import { API_BASE } from '../hooks/useWebSocket';

// ─── Push (after every game) ───────────────────────────────────────────────

/**
 * Pushes the current local stats and match history to the backend.
 * Safe to call fire-and-forget: all errors are swallowed.
 */
export async function pushStats(
  playerId: string,
  stats: PlayerStats,
  matchHistory: MatchHistoryEntry[]
): Promise<void> {
  try {
    const payload = {
      playerId,
      playerName: stats.name,
      gamesPlayedTotal: stats.gamesPlayedTotal,
      gamesPlayedOffline: stats.gamesPlayedOffline,
      gamesPlayedOnline: stats.gamesPlayedOnline,
      winsTotal: stats.winsTotal,
      winsOffline: stats.winsOffline,
      winsOnline: stats.winsOnline,
      winStreakCurrent: stats.winStreakCurrent,
      winStreakBest: stats.winStreakBest,
      totalPointsScored: stats.totalPointsScored,
      roundsPlayed: stats.roundsPlayed,
      lowestRoundScore: stats.lowestRoundScore,
      highestRoundScore: stats.highestRoundScore,
      declaresCorrect: stats.declaresCorrect,
      declaresWrong: stats.declaresWrong,
      recentForm: JSON.stringify(stats.recentForm),
      matchHistory: JSON.stringify(matchHistory),
    };

    await fetch(`${API_BASE}/api/stats/${encodeURIComponent(playerId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (_) {
    // Silently swallow — offline or backend unavailable
  }
}

// ─── Pull + Merge (on app startup) ────────────────────────────────────────

/**
 * Fetches remote stats and merges them with the current local stats.
 * Returns the merged PlayerStats if successful, null on failure.
 *
 * Merge rules (local is source of truth, remote can only add):
 *  - Counters (games, wins, points, rounds, declares): Math.max(local, remote)
 *  - winStreakBest: Math.max
 *  - winStreakCurrent: keep local (live, real-time value)
 *  - lowestRoundScore: Math.min when both > 0, else whichever is non-zero
 *  - highestRoundScore: Math.max
 *  - recentForm: use whichever array is longer
 *  - matchHistory: merge both, deduplicate by gameId, newest 50
 */
export async function pullAndMergeStats(
  playerId: string,
  localStats: PlayerStats,
  localHistory: MatchHistoryEntry[]
): Promise<{ stats: PlayerStats; history: MatchHistoryEntry[] } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/stats/${encodeURIComponent(playerId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      // 404 = first-time player, no remote data yet — that's fine
      return null;
    }

    const remote = await res.json();

    // ── Merge stats counters ────────────────────────────────────────────────
    const merged: PlayerStats = {
      name: localStats.name || remote.playerName || 'Player',
      gamesPlayedTotal: Math.max(localStats.gamesPlayedTotal, remote.gamesPlayedTotal ?? 0),
      gamesPlayedOffline: Math.max(localStats.gamesPlayedOffline, remote.gamesPlayedOffline ?? 0),
      gamesPlayedOnline: Math.max(localStats.gamesPlayedOnline, remote.gamesPlayedOnline ?? 0),
      winsTotal: Math.max(localStats.winsTotal, remote.winsTotal ?? 0),
      winsOffline: Math.max(localStats.winsOffline, remote.winsOffline ?? 0),
      winsOnline: Math.max(localStats.winsOnline, remote.winsOnline ?? 0),
      winStreakBest: Math.max(localStats.winStreakBest, remote.winStreakBest ?? 0),
      winStreakCurrent: localStats.winStreakCurrent, // keep local — it's the live value
      totalPointsScored: Math.max(localStats.totalPointsScored, remote.totalPointsScored ?? 0),
      roundsPlayed: Math.max(localStats.roundsPlayed, remote.roundsPlayed ?? 0),
      highestRoundScore: Math.max(localStats.highestRoundScore, remote.highestRoundScore ?? 0),
      declaresCorrect: Math.max(localStats.declaresCorrect, remote.declaresCorrect ?? 0),
      declaresWrong: Math.max(localStats.declaresWrong, remote.declaresWrong ?? 0),
      lowestRoundScore: mergeLowestScore(localStats.lowestRoundScore, remote.lowestRoundScore ?? 0),
      recentForm: mergeRecentForm(localStats.recentForm, remote.recentForm),
    };

    // ── Merge match history ─────────────────────────────────────────────────
    const remoteHistory: MatchHistoryEntry[] = parseHistory(remote.matchHistory);
    const mergedHistory = mergeMatchHistory(localHistory, remoteHistory);

    return { stats: merged, history: mergedHistory };
  } catch (_) {
    // Network error, backend offline — return null, caller falls back to local
    return null;
  }
}

// ─── Merge Helpers ─────────────────────────────────────────────────────────

function mergeLowestScore(local: number, remote: number): number {
  if (local > 0 && remote > 0) return Math.min(local, remote);
  return Math.max(local, remote); // prefer non-zero
}

function mergeRecentForm(
  local: ('W' | 'L')[],
  remoteJson: string | null | undefined
): ('W' | 'L')[] {
  let remote: ('W' | 'L')[] = [];
  try {
    if (remoteJson) remote = JSON.parse(remoteJson) as ('W' | 'L')[];
  } catch (_) {}
  // Use whichever has more entries
  return remote.length >= local.length ? remote : local;
}

function parseHistory(json: string | null | undefined): MatchHistoryEntry[] {
  try {
    if (json) return JSON.parse(json) as MatchHistoryEntry[];
  } catch (_) {}
  return [];
}

function mergeMatchHistory(
  local: MatchHistoryEntry[],
  remote: MatchHistoryEntry[]
): MatchHistoryEntry[] {
  const map = new Map<string, MatchHistoryEntry>();
  // Add remote first, then local (local wins on collision — it's more trusted)
  for (const entry of remote) map.set(entry.gameId, entry);
  for (const entry of local) map.set(entry.gameId, entry);

  const merged = Array.from(map.values());
  // Sort newest first
  merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  // Cap at 50
  return merged.slice(0, 50);
}
