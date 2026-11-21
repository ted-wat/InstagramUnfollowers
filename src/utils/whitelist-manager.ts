import { UserNode } from "../model/user";
import { Timings } from "../model/timings";
import { WHITELISTED_RESULTS_STORAGE_KEY, TIMINGS_STORAGE_KEY, LAST_SCAN_RESULTS_STORAGE_KEY, LAST_SCAN_TIMESTAMP_STORAGE_KEY, BLOCKED_UNTIL_STORAGE_KEY } from "../constants/constants";
import { deduplicateUsersById, getCookie } from "./utils";

/**
 * Export whitelist to a JSON file
 */
export const exportWhitelist = (whitelistedUsers: readonly UserNode[]): void => {
  if (whitelistedUsers.length === 0) {
    alert("No users in whitelist to export");
    return;
  }

  const dataStr = JSON.stringify(whitelistedUsers, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `instagram-whitelist-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Import whitelist from a JSON file
 */
export const importWhitelist = (
  file: File,
  onSuccess: (users: readonly UserNode[]) => void,
  onError: (message: string) => void
): void => {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const importedUsers = JSON.parse(content) as UserNode[];
      
      // Validate the imported data
      if (!Array.isArray(importedUsers)) {
        onError("Invalid file format: Expected an array of users");
        return;
      }
      
      const isValid = importedUsers.every(validWhitelistEntry);
      if (!isValid) {
        onError("Invalid file format: Users missing required fields (id, username)");
        return;
      }
      
      onSuccess(importedUsers);
    } catch (error) {
      onError(`Failed to parse JSON file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  reader.onerror = () => {
    onError("Failed to read file");
  };
  
  reader.readAsText(file);
};

function validWhitelistEntry(user: any): boolean {
  if (!user || typeof user.id !== 'string' || typeof user.username !== 'string' ||
    !/^[a-z0-9._]{1,30}$/i.test(user.username) || user.username === '.' || user.username === '..') {
    return false;
  }
  const pending = `pasted_${user.username.toLowerCase()}`;
  return /^[1-9]\d*$/.test(user.id) || user.id === pending || user.id.startsWith(pending + '_');
}

// A write action must stop if its protection list cannot be read or trusted.
export function loadWhitelistForAction(): readonly UserNode[] {
  const raw = localStorage.getItem(WHITELISTED_RESULTS_STORAGE_KEY);
  if (raw === null) {
    return [];
  }
  const entries = JSON.parse(raw);
  if (!Array.isArray(entries) || !entries.every(validWhitelistEntry)) {
    throw new Error('Invalid stored whitelist.');
  }
  return entries;
}

export const loadWhitelist = (): readonly UserNode[] => {
  try {
    return loadWhitelistForAction();
  } catch {
    return [];
  }
};

/**
 * Save whitelist to localStorage
 */
export function saveWhitelist(whitelistedUsers: readonly UserNode[]): void {
  if (!Array.isArray(whitelistedUsers) || !whitelistedUsers.every(validWhitelistEntry)) {
    throw new Error('Invalid whitelist entries.');
  }
  localStorage.setItem(WHITELISTED_RESULTS_STORAGE_KEY, JSON.stringify(whitelistedUsers));
}

/**
 * Merge imported whitelist with existing whitelist (avoiding duplicates)
 */
export const mergeWhitelists = (
  existing: readonly UserNode[],
  imported: readonly UserNode[]
): readonly UserNode[] => {
  const existingIds = new Set(existing.map(user => user.id));
  const uniqueImported = imported.filter(user => !existingIds.has(user.id));
  return [...existing, ...uniqueImported];
};

const isTimings = (value: unknown): value is Timings => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((timing) => typeof timing === "number");
};

/**
 * Load timings from localStorage
 */
export const loadTimings = (): Timings | null => {
  try {
    const timingsFromStorage = localStorage.getItem(TIMINGS_STORAGE_KEY);
    if (timingsFromStorage === null) {
      return null;
    }
    const parsedTimings: unknown = JSON.parse(timingsFromStorage);
    return isTimings(parsedTimings) ? parsedTimings : null;
  } catch {
    return null;
  }
};

/**
 * Save timings to localStorage
 */
export const saveTimings = (timings: Timings): void => {
  try {
    localStorage.setItem(TIMINGS_STORAGE_KEY, JSON.stringify(timings));
  } catch (e) {
    console.warn("Could not save timings to storage:", e);
  }
};

/**
 * Cache completed scan results locally for instant recall.
 * Scoped to the logged-in account: one shared key would show the previous
 * account's results after switching accounts.
 */
export interface CachedScan {
  readonly results: readonly UserNode[];
  readonly timestamp: number;
  readonly complete: boolean;
}

// A single write ties completion, viewer, timestamp and rows to the same scan.
export function saveCachedScanResults(results: readonly UserNode[], accountId: string, complete: boolean): void {
  if (!/^[1-9]\d*$/.test(accountId)) {
    return;
  }
  try {
    const entry = { version: 2, accountId, complete, results, timestamp: Date.now() };
    localStorage.setItem(`${LAST_SCAN_RESULTS_STORAGE_KEY}-${accountId}`, JSON.stringify(entry));
  } catch (e) {
    console.warn("Could not cache scan results:", e);
  }
}

export function loadCachedScanResults(): CachedScan | null {
  try {
    const accountId = getCookie('ds_user_id');
    if (!accountId || !/^[1-9]\d*$/.test(accountId)) {
      return null;
    }
    const raw = localStorage.getItem(`${LAST_SCAN_RESULTS_STORAGE_KEY}-${accountId}`);
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw);
    const legacy = Array.isArray(parsed);
    if (!legacy && (parsed?.version !== 2 || parsed.accountId !== accountId)) {
      return null;
    }
    const rows = legacy ? parsed : parsed.results;
    const timestamp = legacy ? Number(localStorage.getItem(`${LAST_SCAN_TIMESTAMP_STORAGE_KEY}-${accountId}`)) : parsed.timestamp;
    if (!Number.isSafeInteger(timestamp) || timestamp <= 0 || !Array.isArray(rows) ||
      !rows.every(user => validWhitelistEntry(user) && /^[1-9]\d*$/.test(user.id))) {
      return null;
    }
    return { results: deduplicateUsersById(rows), timestamp, complete: !legacy && parsed.complete === true };
  } catch {
    return null;
  }
}

/**
 * Timestamp (ms) until which scans and unfollows must not start.
 */
let inMemoryBlockedUntil = 0;
export const getBlockedUntil = (): number => {
  try {
    return Math.max(Number(localStorage.getItem(BLOCKED_UNTIL_STORAGE_KEY)) || 0, inMemoryBlockedUntil);
  } catch {
    return inMemoryBlockedUntil;
  }
};

export const setBlockedUntil = (until: number): void => {
  inMemoryBlockedUntil = Math.max(getBlockedUntil(), until);
  try {
    localStorage.setItem(BLOCKED_UNTIL_STORAGE_KEY, String(inMemoryBlockedUntil));
  } catch (e) {
    console.warn("Could not persist the cooldown:", e);
  }
};
