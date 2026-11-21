import React, { ChangeEvent, useEffect, useState } from "react";
import { render } from "react-dom";
import "./styles.scss";

import { UserNode } from './model/user';
import { Toast } from "./components/Toast";
import { UserCheckIcon } from "./components/icons/UserCheckIcon";
import { UserUncheckIcon } from "./components/icons/UserUncheckIcon";
import {
  DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
  DEFAULT_TIME_BETWEEN_UNFOLLOWS,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS,
  DEFAULT_USERS_PER_SEARCH_CYCLE,
  BLOCKED_COOLDOWN_MS,
  WHITELISTED_RESULTS_STORAGE_KEY,
  FOLLOWERS_PAGE_SAFETY_LIMIT,
  FOLLOWING_PAGE_SAFETY_LIMIT,
  CHECKS_BEFORE_LONG_SLEEP,
  INSTAGRAM_HOSTNAME,
  RATE_LIMIT_COOLDOWN_SECONDS,
} from "./constants/constants";
import {
  createWhitelistMatcher,
  isHardBlock,
  assertUnreachable,
  deduplicateUsersById,
  fetchFriendshipsPage,
  FriendshipsListKind,
  FriendshipsPage,
  getCookie,
  getCurrentPageUnfollowers,
  getUsersForDisplay,
  InstagramApiError,
  RawFriendshipUser,
  sleep,
  unfollowUser,
} from "./utils/utils";
import { SnapshotManager, ScanCapture, SnapshotPair } from './components/SnapshotManager';
import { SnapshotUser, pastUnfollowers, snapshotUser } from './utils/snapshots';
import { ScanningTab } from './model/scanning-tab';
import { NotSearching } from "./components/NotSearching";
import { State } from "./model/state";
import { Searching } from "./components/Searching";
import { Toolbar } from "./components/Toolbar";
import { Unfollowing } from "./components/Unfollowing";
import { Timings } from "./model/timings";
import { getBlockedUntil, loadCachedScanResults, loadWhitelistForAction, loadTimings, loadWhitelist, saveCachedScanResults, saveTimings, saveWhitelist, setBlockedUntil } from './utils/whitelist-manager';
import { getInitialLanguage, Language, saveLanguage, t } from "./utils/i18n";

const LOCAL_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const isLocalPreview = LOCAL_PREVIEW_HOSTS.has(location.hostname);

const currentViewer = (): string | null => {
  if (isLocalPreview) {
    return '1';
  }
  const id = getCookie('ds_user_id');
  return id && /^[1-9][0-9]*$/.test(id) ? id : null;
};

const toResult = (user: SnapshotUser, followsViewer = false): UserNode => ({
  ...user, follows_viewer: followsViewer, followed_by_viewer: true, requested_by_viewer: false,
});

const _createPreviewUser = (
  id: string,
  username: string,
  fullName: string,
  options: { readonly isPrivate?: boolean; readonly isVerified?: boolean; readonly followsViewer?: boolean } = {},
): UserNode => ({
  id,
  username,
  full_name: fullName,
  profile_pic_url: '',
  is_private: options.isPrivate ?? false,
  is_verified: options.isVerified ?? false,
  followed_by_viewer: true,
  follows_viewer: options.followsViewer ?? false,
  requested_by_viewer: false,

});

const _getPreviewUsers = (): readonly UserNode[] => [
  _createPreviewUser("1", "alina.frames", "Alina Moreno", { isVerified: true }),
  _createPreviewUser("2", "brassandbone", "Theo Walsh", { isPrivate: true }),
  _createPreviewUser("3", "citrus.archive", "Mara Kim", { followsViewer: true }),
  _createPreviewUser("4", "dawnledger", "Jon Bell", { isPrivate: true }),
  _createPreviewUser("5", "elias.market", "Elias Noor", { isVerified: true }),
  _createPreviewUser("6", "fieldnotes.studio", "Nadia Reyes"),
  _createPreviewUser("7", "glint.supply", "Remy Park", { followsViewer: true }),
  _createPreviewUser("8", "harbor.sequence", "Ivy Chen", { isPrivate: true }),
  _createPreviewUser("9", "inkline.daily", "Sofia Grant"),
  _createPreviewUser("10", "juniper.signal", "Cal Reed", { isVerified: true }),
  _createPreviewUser("11", "keystone.labs", "Mina Torres"),
  _createPreviewUser("12", "lowlight.club", "Owen Voss", { isPrivate: true }),
];



function App() {
  const [state, setState] = useState<State>({
    ...(
      isLocalPreview && new URLSearchParams(location.search).get("preview") === "scanning"
        ? {
          status: "scanning",
          page: 1,
          searchTerm: "",
          currentTab: "non_whitelisted",
          percentage: 100,
          results: _getPreviewUsers(), viewerId: '1',
          selectedResults: _getPreviewUsers().slice(0, 3),
          whitelistedResults: _getPreviewUsers().slice(10, 12),
          filter: {
            showVerified: true,
            showPrivate: true,
            showWithOutProfilePicture: true,
          },
        } as State
        : { status: "initial" as const }
    ),
  });

  const [capture, setCapture] = useState<ScanCapture | null>(null);
  const [pair, setPair] = useState<SnapshotPair | null>(null);
  const [historyOwner, setHistoryOwner] = useState<string | null>(null);

  const [toast, setToast] = useState<{ readonly show: false } | { readonly show: true; readonly text: string }>({
    show: false,
  });

  const [timings, setTimings] = useState<Timings>(() => {
    const storedTimings = loadTimings();
    return {
      timeBetweenSearchCycles: storedTimings?.timeBetweenSearchCycles ?? DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
      timeToWaitAfterFiveSearchCycles: storedTimings?.timeToWaitAfterFiveSearchCycles ?? DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
      timeBetweenUnfollows: storedTimings?.timeBetweenUnfollows ?? DEFAULT_TIME_BETWEEN_UNFOLLOWS,
      timeToWaitAfterFiveUnfollows: storedTimings?.timeToWaitAfterFiveUnfollows ?? DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS,
      usersPerSearchCycle: storedTimings?.usersPerSearchCycle ?? DEFAULT_USERS_PER_SEARCH_CYCLE,
    };
  });

  // Save timings whenever they change
  useEffect(() => {
    saveTimings(timings);
  }, [timings]);

  const [cachedScan, setCachedScan] = useState<ReturnType<typeof loadCachedScanResults>>(() =>
    loadCachedScanResults(),
  );

  const [lang, setLang] = useState<Language>(() => getInitialLanguage());

  const [scanningPaused, setScanningPaused] = useState(false);
  const scanningPausedRef = React.useRef(false);

  const pauseScan = () => {
    setScanningPaused(prev => {
      const next = !prev;
      scanningPausedRef.current = next;
      return next;
    });
  };

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    saveLanguage(newLang);
  };


  let isActiveProcess: boolean;
  switch (state.status) {
    case "initial":
      isActiveProcess = false;
      break;
    case "scanning":
      isActiveProcess = Boolean(state.isScanningActive);
      break;
    case "unfollowing":
      isActiveProcess = !state.aborted && state.unfollowLog.length < state.selectedResults.length;
      break;
    default:
      assertUnreachable(state);
  }

  const activeOwner = state.status === 'initial' ? null : state.viewerId;
  const checkViewOwner = React.useCallback(() => {
    const viewer = currentViewer();
    if ((!activeOwner || activeOwner === viewer) && (!historyOwner || historyOwner === viewer)) {
      return true;
    }
    setHistoryOwner(null);
    setPair(null);
    setCapture(null);
    setCachedScan(loadCachedScanResults());
    setState({ status: 'initial' });
    setToast({ show: true, text: t(lang, 'scanAccountChanged') });
    return false;
  }, [activeOwner, historyOwner, lang]);

  useEffect(() => {
    const check = () => {
      if (!document.hidden) {
        checkViewOwner();
      }
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [checkViewOwner]);

  function openSnapshots() {
    if (!checkViewOwner()) {
      return;
    }
    const viewer = currentViewer();
    if (viewer) {
      setHistoryOwner(viewer);
    } else {
      setToast({ show: true, text: t(lang, 'loginForSnapshots') });
    }
  }

  const viewingDiff = state.status === 'scanning' && state.currentTab === 'past_unfollowers';
  const scanViewer = state.status === 'scanning' ? state.viewerId : undefined;
  const scanWhitelist = state.status === 'scanning' ? state.whitelistedResults : undefined;
  const diffUsers = React.useMemo(() => {
    if (!viewingDiff || !scanWhitelist || !pair || pair.baseline.ownerId !== scanViewer) {
      return [];
    }
    return pastUnfollowers(pair.baseline, pair.comparison, scanWhitelist).map(user => toResult(user));
  }, [viewingDiff, scanViewer, scanWhitelist, pair]);
  const displayed = state.status === 'scanning'
    ? getUsersForDisplay(state.currentTab === 'past_unfollowers' ? diffUsers : state.results,
      state.whitelistedResults, state.currentTab, state.searchTerm, state.filter)
    : [];

  function viewDiff(chosen: SnapshotPair) {
    const viewerId = currentViewer();
    if (!viewerId || chosen.baseline.ownerId !== viewerId || chosen.comparison.ownerId !== viewerId) {
      return;
    }
    setPair(chosen);
    setHistoryOwner(null);
    if (state.status === 'scanning' && state.viewerId === viewerId) {
      setState({ ...state, currentTab: 'past_unfollowers', page: 1, selectedResults: [], searchTerm: '' });
      return;
    }
    const cached = loadCachedScanResults();
    setState({
      status: 'scanning', viewerId, currentTab: 'past_unfollowers', isScanningActive: false,
      page: 1, searchTerm: '', percentage: 100, results: cached?.results ?? [], scanIncomplete: !cached?.complete,
      whitelistedResults: loadWhitelist(), selectedResults: [],
      filter: { showPrivate: true, showVerified: true, showWithOutProfilePicture: true },
    });
  }

  function changeTab(next: ScanningTab) {
    if (state.status !== 'scanning' || next === state.currentTab) {
      return;
    }
    if (next === 'past_unfollowers' && (!pair || pair.baseline.ownerId !== currentViewer())) {
      openSnapshots();
      return;
    }
    setState({ ...state, currentTab: next, selectedResults: [], page: 1, searchTerm: '' });
  }

  function startQueue() {
    if (state.status !== 'scanning' || state.isScanningActive || state.currentTab === 'whitelisted' || !checkViewOwner()) {
      return;
    }
    if (isLocalPreview) {
      setToast({ show: true, text: t(lang, 'previewReadOnly') });
      return;
    }
    const viewerId = currentViewer();
    const fromDiff = state.currentTab === 'past_unfollowers';
    if (!viewerId || viewerId !== state.viewerId || (fromDiff ? pair?.baseline.ownerId !== viewerId : state.scanIncomplete)) {
      setToast({ show: true, text: t(lang, 'queueChanged') });
      return;
    }
    const selected = new Set(state.selectedResults.map(user => user.id));
    const candidates = displayed.filter(user => selected.has(user.id) && /^[1-9][0-9]*$/.test(user.id));
    if (candidates.length === 0 || candidates.length !== selected.size) {
      return;
    }
    if (!confirm(t(lang, 'unfollowConfirm'))) {
      return;
    }
    setState({
      status: 'unfollowing', viewerId, fromDiff, searchTerm: '', percentage: 0,
      selectedResults: candidates, unfollowLog: [], filter: { showSucceeded: true, showFailed: true },
    });
  }

  const onLoadCached = () => {
    setCapture(null);
    // Re-read instead of trusting the mount-time snapshot: the account may have
    // been switched in another tab, and the cache is scoped per account.
    const cached = loadCachedScanResults();
    setCachedScan(cached);
    if (!cached || cached.results.length === 0) {
      return;
    }
    const whitelistedResults = loadWhitelist();
    setState({
      status: "scanning",
      page: 1,
      searchTerm: "",
      currentTab: "non_whitelisted",
      percentage: 100,
      isScanningActive: false,
      results: cached.results,
      viewerId: currentViewer() ?? undefined,
      scanIncomplete: !cached.complete,
      selectedResults: [],
      whitelistedResults,
      filter: {
        showVerified: true,
        showPrivate: true,
        showWithOutProfilePicture: true,
      },
    });
    setToast({
      show: true,
      text: t(lang, "loadedFromCache", cached.results.length),
    });
  };

  const onScan = async () => {
    if (state.status !== "initial") {
      return;
    }
    setCapture(null);
    scanningPausedRef.current = false;
    setScanningPaused(false);
    if (isLocalPreview) {
      const previewUsers = _getPreviewUsers();
      setCapture({ ownerId: '1', capturedAt: Date.now(), followers: previewUsers.filter(u => u.follows_viewer), following: [...previewUsers] });
      setState({
        status: "scanning",
        page: 1,
        searchTerm: "",
        currentTab: "non_whitelisted",
        percentage: 100,
        isScanningActive: false,
        results: previewUsers, viewerId: '1',
        selectedResults: previewUsers.slice(0, 3),
        whitelistedResults: previewUsers.slice(10, 12),
        filter: {
          showVerified: true,
          showPrivate: true,
          showWithOutProfilePicture: true,
        },
      });
      return;
    }
    const blockedUntil = getBlockedUntil();
    if (blockedUntil > Date.now()) {
      setToast({
        show: true,
        text: t(lang, "rateLimitPause", Math.ceil((blockedUntil - Date.now()) / 1000)),
      });
      return;
    }
    const whitelistedResults = loadWhitelist();
    setState({
      status: "scanning",
      page: 1,
      searchTerm: "",
      currentTab: "non_whitelisted",
      percentage: 0,
      isScanningActive: true,
      viewerId: currentViewer() ?? undefined,
      results: [],
      selectedResults: [],
      whitelistedResults,
      filter: {
        showVerified: true,
        showPrivate: true,
        showWithOutProfilePicture: true,
      },
    });
  };

  const handleScanFilter = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "scanning") {
      return;
    }
    if (state.selectedResults.length > 0) {
      if (!confirm("Changing filter options will clear selected users")) {
        // Force re-render. Bit of a hack but had an issue where the checkbox state was still
        // changing in the UI even even when not confirming. So updating the state fixes this
        // by synchronizing the checkboxes with the filter statuses in the state.
        setState({ ...state });
        return;
      }
    }
    setState({
      ...state,
      // Make sure to clear selected results when changing filter options. This is to avoid having
      // users selected in the unfollow queue but not visible in the UI, which would be confusing.
      selectedResults: [],
      filter: {
        ...state.filter,
        [e.currentTarget.name]: e.currentTarget.checked,
      },
    });
  };

  const handleUnfollowFilter = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "unfollowing") {
      return;
    }
    setState({
      ...state,
      filter: {
        ...state.filter,
        [e.currentTarget.name]: e.currentTarget.checked,
      },
    });
  };

  const toggleUser = (newStatus: boolean, user: UserNode) => {
    if (state.status !== "scanning") {
      return;
    }
    if (newStatus) {
      setState({
        ...state,
        selectedResults: [...state.selectedResults, user],
      });
    } else {
      setState({
        ...state,
        selectedResults: state.selectedResults.filter(result => result.id !== user.id),
      });
    }
  };

  const toggleAllUsers = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "scanning") {
      return;
    }
    if (e.currentTarget.checked) {
      const currentIds = new Set(state.selectedResults.map(u => u.id));
      const toAdd = displayed.filter(u => !currentIds.has(u.id));
      setState({
        ...state,
        selectedResults: [...state.selectedResults, ...toAdd],
      });
    } else {
      const displayedIds = new Set(displayed.map(u => u.id));
      setState({
        ...state,
        selectedResults: state.selectedResults.filter(u => !displayedIds.has(u.id)),
      });
    }
  };

  // it will work the same as toggleAllUsers, but it will select everyone on the current page.
  const toggleCurrentePageUsers = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "scanning") {
      return;
    }
    const pageUsers = getCurrentPageUnfollowers(displayed, state.page);
    if (e.currentTarget.checked) {
      const currentIds = new Set(state.selectedResults.map(u => u.id));
      const toAdd = pageUsers.filter(u => !currentIds.has(u.id));
      setState({
        ...state,
        selectedResults: [...state.selectedResults, ...toAdd],
      });
    } else {
      const pageUserIds = new Set(pageUsers.map(u => u.id));
      setState({
        ...state,
        selectedResults: state.selectedResults.filter(u => !pageUserIds.has(u.id)),
      });
    }
  };

  const onWhitelistUpdate = (updatedWhitelist: readonly UserNode[]): boolean => {
    if (!checkViewOwner()) {
      return false;
    }
    try {
      saveWhitelist(updatedWhitelist);
    } catch {
      setToast({ show: true, text: t(lang, 'whitelistSaveFailed') });
      setState(prev => prev.status === 'scanning' ? { ...prev, selectedResults: [] } : prev);
      return false;
    }
    if (state.status === "scanning") {
      setState({
        ...state,
        whitelistedResults: updatedWhitelist, selectedResults: [], page: 1,
      });
    }
    return true;
  };

  useEffect(() => {
    const syncWhitelist = (event: StorageEvent) => {
      if (event.key !== null && event.key !== WHITELISTED_RESULTS_STORAGE_KEY) {
        return;
      }
      const whitelistedResults = loadWhitelist();
      setState(prev => prev.status === 'scanning' ? { ...prev, whitelistedResults, selectedResults: [], page: 1 } : prev);
    };
    window.addEventListener('storage', syncWhitelist);
    return () => window.removeEventListener('storage', syncWhitelist);
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      // Prompt user if he tries to leave while in the middle of a process (searching / unfollowing / etc..)
      // This is especially good for avoiding accidental tab closing which would result in a frustrating experience.
      if (!isActiveProcess) {
        return;
      }

      // `e` Might be undefined in older browsers, so silence linter for this one.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      e = e || window.event;

      // `e` Might be undefined in older browsers, so silence linter for this one.
      // For IE and Firefox prior to version 4
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (e) {
        e.returnValue = "Changes you made may not be saved.";
      }

      // For Safari
      return "Changes you made may not be saved.";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isActiveProcess, state]);

  useEffect(() => {
    if (state.status !== 'scanning' || isLocalPreview || !state.isScanningActive) {
      return;
    }

    const viewerId = state.viewerId;
    if (!viewerId || viewerId !== currentViewer()) {
      setState(prevState =>
        prevState.status === 'scanning' ? { ...prevState, isScanningActive: false, scanIncomplete: true } : prevState,
      );
      setToast({ show: true, text: t(lang, "scanFailedFollowing") });
      return;
    }

    let cancelled = false;
    const scanAccountChanged = new Error("Instagram account changed during scan");
    const checkScanAccount = () => {
      if (cancelled || getCookie('ds_user_id') !== viewerId) {
        throw scanAccountChanged;
      }
    };

    // Retry transient network failures. An explicit account block ends the run.
    type PageResult =
      | { readonly ok: true; readonly page: FriendshipsPage }
      | { readonly ok: false; readonly blocked: boolean };

    const fetchPageWithRetry = async (
      kind: FriendshipsListKind,
      maxId?: string,
      count?: number,
    ): Promise<PageResult> => {
      let retries = 0;
      const maxRetries = 3;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        checkScanAccount();
        if (getBlockedUntil() > Date.now()) {
          return { ok: false, blocked: true };
        }
        try {
          return { ok: true, page: await fetchFriendshipsPage(kind, maxId, count, viewerId) };
        } catch (e: any) {
          checkScanAccount();
          if (isHardBlock(e)) {
            setBlockedUntil(Date.now() + BLOCKED_COOLDOWN_MS);
            return { ok: false, blocked: true };
          }
          const message = String(e?.message ?? "");
          const isRateLimitOrSoftBlock =
            (e instanceof InstagramApiError || e?.name === "InstagramApiError") &&
            (e?.notJson === true ||
              /feedback_required|checkpoint|rate limit|please wait/i.test(message));
          const isNetworkError = e instanceof TypeError || /fetch|network/i.test(message);
          const isTransient = isRateLimitOrSoftBlock || isNetworkError;

          if (isTransient && retries < maxRetries) {
            retries++;
            const waitSeconds = isRateLimitOrSoftBlock
              ? RATE_LIMIT_COOLDOWN_SECONDS * retries
              : 5 * retries;
            for (let sec = waitSeconds; sec > 0; sec--) {
              checkScanAccount();
              setToast({
                show: true,
                text: t(lang, "rateLimitPause", sec),
              });
              await sleep(1000);
            }
            setToast({ show: false });
            continue;
          }
          console.error(`${kind} request failed:`, e);
          if (isRateLimitOrSoftBlock) {
            // Remember the 429 so the next scan/unfollow does not walk straight back into it.
            setBlockedUntil(Date.now() + BLOCKED_COOLDOWN_MS);
          }
          return { ok: false, blocked: isTransient };
        }
      }
    };

    let requestsSinceLongSleep = 0;
    const paceRequest = async () => {
      // Pause scanning if user requested so.
      while (scanningPausedRef.current) {
        checkScanAccount();
        await sleep(1000);
        console.info("Scan paused");
      }

      await sleep(Math.floor(Math.random() * 700) + 300);
      await sleep(Math.floor(Math.random() * (timings.timeBetweenSearchCycles - timings.timeBetweenSearchCycles * 0.7)) + timings.timeBetweenSearchCycles);

      requestsSinceLongSleep++;
      if (requestsSinceLongSleep >= CHECKS_BEFORE_LONG_SLEEP) {
        requestsSinceLongSleep = 0;
        const longSleepVar = Math.max(
          0,
          timings.timeToWaitAfterFiveSearchCycles + (Math.random() * 10000 - 5000), // +/- 5 seconds
        );
        setToast({
          show: true,
          text: t(lang, "sleepingSafety", Math.round(longSleepVar / 1000)),
        });
        await sleep(longSleepVar);
      }
      setToast({ show: false });
    };

    // Walks the viewer's own list (followers or following) page by page. `onPageUsers` is
    // awaited for each page before the next one is requested and returns
    // false to stop the walk early. Resolves true only if the whole list was
    // walked.
    const fetchList = async (
      kind: FriendshipsListKind,
      pageSafetyLimit: number,
      onPageUsers: (pageUsers: readonly RawFriendshipUser[]) => Promise<boolean>,
    ): Promise<boolean> => {
      let maxId: string | undefined;
      let pagesFetched = 0;
      const cursors = new Set<string>();

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const result = await fetchPageWithRetry(kind, maxId, timings.usersPerSearchCycle);
        checkScanAccount();
        if (!result.ok) {
          console.error(`Stopping ${kind} scan early.`);
          return false;
        }
        const page = result.page;
        const pageUsers = page.users;
        if (!Array.isArray(pageUsers) || (page.has_more === true && !page.next_max_id) ||
          (page.has_more === false && Boolean(page.next_max_id)) || (page.next_max_id && !pageUsers.length)) {
          return false;
        }

        if (!(await onPageUsers(pageUsers))) {
          return false;
        }

        const hasMore = Boolean(page.next_max_id) && page.has_more !== false;
        if (!hasMore || pageUsers.length === 0) {
          return true;
        }

        pagesFetched += 1;
        if (pagesFetched >= pageSafetyLimit) {
          console.error(`Stopping ${kind} scan early: hit the safety cap of ${pageSafetyLimit} pages.`);
          return false;
        }
        if (cursors.has(page.next_max_id!)) {
          // Instagram handed back the cursor we just sent: the walk would loop forever.
          console.error(`Stopping ${kind} scan early: Instagram returned the same page cursor twice.`);
          return false;
        }
        maxId = page.next_max_id;
        cursors.add(maxId!);

        await paceRequest();
      }
    };

    const scan = async () => {
      const followers = new Map<string, SnapshotUser>();
      const following = new Map<string, SnapshotUser>();
      let followersCount = 0;

      const indexFollowersPage = async (pageUsers: readonly RawFriendshipUser[]): Promise<boolean> => {
        for (const user of pageUsers) {
          const record = snapshotUser(user);
          followers.set(record.id, record);
          followersCount++;
        }

        const followersProgress = Math.min(49, Math.round(50 * (1 - 1 / (1 + followersCount / 150))));
        setState(prevState =>
          prevState.status === "scanning"
            ? {
                ...prevState,
                percentage: followersProgress,
                totalScanned: followersCount,
              }
            : prevState,
        );

        setToast({
          show: true,
          text: t(lang, "indexingFollowersProgress", followersCount),
        });

        return true;
      };

      const followersCompleted = await fetchList(
        "followers",
        FOLLOWERS_PAGE_SAFETY_LIMIT,
        indexFollowersPage,
      );
      checkScanAccount();

      if (!followersCompleted) {
        // If followers list could not be fully loaded, aborting is mandatory.
        // Proceeding with an incomplete follower index would cause true followers
        // to be falsely flagged as unfollowers.
        setState(prevState =>
          prevState.status === "scanning"
            ? { ...prevState, isScanningActive: false, scanIncomplete: true }
            : prevState,
        );
        setToast({
          show: true,
          text: t(lang, "scanFailedFollowers"),
        });
        return;
      }

      // Mark Phase 1 complete at 50%
      setState(prevState =>
        prevState.status === "scanning"
          ? { ...prevState, percentage: 50 }
          : prevState,
      );

      // Phase 2: Walk the viewer's following list and check each against the follower index.
      // Accounts not in the index genuinely do not follow back and are progressively streamed to UI.
      const nonFollowers: UserNode[] = [];
      const seenNonFollowerIds = new Set<string>();
      let checkedCount = 0;

      const checkFollowingPage = async (pageUsers: readonly RawFriendshipUser[]): Promise<boolean> => {
        const nonFollowersBatch: UserNode[] = [];

        for (const user of pageUsers) {
          const record = snapshotUser(user);
          following.set(record.id, record);
          const followsViewer = followers.has(record.id);
          if (!followsViewer) {
            nonFollowersBatch.push(toResult(record));
          }
          checkedCount++;
        }

        const newNonFollowersBatch = deduplicateUsersById(nonFollowersBatch, seenNonFollowerIds);
        nonFollowers.push(...newNonFollowersBatch);
        const followingProgress = Math.min(99, 50 + Math.round(50 * (1 - 1 / (1 + checkedCount / 150))));

        setState(prevState =>
          prevState.status === "scanning"
            ? {
                ...prevState,
                results: newNonFollowersBatch.length > 0 ? [...prevState.results, ...newNonFollowersBatch] : prevState.results,
                totalScanned: checkedCount,
                percentage: followingProgress,
              }
            : prevState,
        );

        setToast({
          show: true,
          text: t(lang, "scanningFollowingProgress", checkedCount),
        });

        return true;
      };

      await paceRequest();
      const followingCompleted = await fetchList(
        "following",
        FOLLOWING_PAGE_SAFETY_LIMIT,
        checkFollowingPage,
      );
      checkScanAccount();

      if (!followingCompleted && checkedCount === 0) {
        setState(prevState =>
          prevState.status === 'scanning' ? { ...prevState, isScanningActive: false, scanIncomplete: true } : prevState,
        );
        setToast({
          show: true,
          text: t(lang, "scanFailedFollowing"),
        });
        return;
      }

      const scanIsComplete = followingCompleted;

      if (scanIsComplete) {
        setCapture({ ownerId: viewerId, capturedAt: Date.now(), followers: Array.from(followers.values()), following: Array.from(following.values()) });
      }
      if (scanIsComplete || nonFollowers.length > 0) {
        saveCachedScanResults(nonFollowers, viewerId, scanIsComplete);
        setCachedScan(loadCachedScanResults());
      }

      setState(prevState => {
        if (prevState.status !== "scanning") {
          return prevState;
        }
        return {
          ...prevState,
          percentage: 100,
          scanIncomplete: !scanIsComplete,
          isScanningActive: false,
          results: nonFollowers,
          totalScanned: checkedCount,
        };
      });

      setToast({
        show: true,
        text: scanIsComplete
          ? t(lang, "scanCompleted")
          : t(lang, "partialScanInterrupted", checkedCount),
      });
    };
    scan().catch(error => {
      if (cancelled) {
        return;
      }
      setCapture(null);
      if (error !== scanAccountChanged) {
        setState(prev => prev.status === 'scanning' ? { ...prev, isScanningActive: false, scanIncomplete: true, selectedResults: [] } : prev);
        setToast({ show: true, text: t(lang, 'partialScanWarning') });
        return;
      }
      setPair(null);
      scanningPausedRef.current = false;
      setScanningPaused(false);
      setCachedScan(loadCachedScanResults());
      setState({ status: "initial" });
      setToast({ show: true, text: t(lang, "scanAccountChanged") });
    });
    return () => {
      cancelled = true;
    };
    // A scan begins once on entry. Progress and filter changes do not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  useEffect(() => {
    let cancelled = false;
    const unfollow = async () => {
      if (state.status !== "unfollowing" || isLocalPreview) {
        return;
      }

      const blockedUntil = getBlockedUntil();
      if (blockedUntil > Date.now()) {
        setToast({
          show: true,
          text: t(lang, "rateLimitPause", Math.ceil((blockedUntil - Date.now()) / 1000)),
        });
        setState(prevState => (prevState.status === "unfollowing" ? { ...prevState, aborted: true } : prevState));
        return;
      }

      const stopQueue = (reason: string) => {
        setState(prev => prev.status === 'unfollowing' ? { ...prev, aborted: true, stopReason: reason } : prev);
      };
      const csrftoken = getCookie("csrftoken");
      if (csrftoken === null) {
        stopQueue(t(lang, 'queueSession'));
        return;
      }

      let counter = 0;
      for (const user of state.selectedResults) {
        const eligible = () => {
          if (cancelled || state.viewerId !== currentViewer() || getBlockedUntil() > Date.now()) {
            return false;
          }
          try {
            const protectedUser = createWhitelistMatcher(loadWhitelistForAction());
            if (protectedUser(user)) {
              return false;
            }
            if (!state.fromDiff) {
              return true;
            }
            const id = user.id;
            if (!pair || pair.baseline.ownerId !== state.viewerId) {
              return false;
            }
            const wasFollower = pair.baseline.followers[id];
            const stillFollowing = pair.comparison.following[id];
            const aliases = [wasFollower, pair.baseline.following[id], stillFollowing];
            return !!(wasFollower && stillFollowing && !pair.comparison.followers[id]) &&
              !aliases.some(alias => alias && protectedUser(alias));
          } catch {
            return false;
          }
        };
        if (cancelled) {
          return;
        }
        if (!eligible()) {
          stopQueue(t(lang, 'queueChanged'));
          break;
        }
        counter += 1;
        const percentage = Math.floor((counter / state.selectedResults.length) * 100);
        try {
          const result = await unfollowUser(user, csrftoken, eligible);
          if (cancelled) {
            return;
          }
          const success = result.outcome === "unfollowed";
          const isActionBlocked = result.outcome === "blocked";
          if (!success) {
            console.warn(`Unfollow for ${user.username} not confirmed: ${result.detail}`);
          }
          setState(prevState => {
            if (prevState.status !== "unfollowing") {
              return prevState;
            }
            return {
              ...prevState,
              percentage,
              unfollowLog: [
                ...prevState.unfollowLog,
                {
                  user,
                  unfollowedSuccessfully: success,
                },
              ],
            };
          });

          if (isActionBlocked) {
            setBlockedUntil(Date.now() + BLOCKED_COOLDOWN_MS);
            setToast({
              show: true,
              text: t(lang, "actionBlockedWarning"),
            });
            setState(prevState => (prevState.status === "unfollowing" ? { ...prevState, aborted: true } : prevState));
            break;
          }
        } catch (e) {
          if (isHardBlock(e)) {
            setBlockedUntil(Date.now() + BLOCKED_COOLDOWN_MS);
            stopQueue(t(lang, 'actionBlockedWarning'));
            break;
          }
          console.error(e);
          setState(prevState => {
            if (prevState.status !== "unfollowing") {
              return prevState;
            }
            return {
              ...prevState,
              percentage,
              unfollowLog: [
                ...prevState.unfollowLog,
                {
                  user,
                  unfollowedSuccessfully: false,
                },
              ],
            };
          });
        }
        // If unfollowing the last user in the list, no reason to wait.
        if (user === state.selectedResults[state.selectedResults.length - 1]) {
          break;
        }
        await sleep(Math.floor(Math.random() * (timings.timeBetweenUnfollows * 1.2 - timings.timeBetweenUnfollows)) + timings.timeBetweenUnfollows);

        if (counter % 5 === 0) {
          setToast({
            show: true,
            text: t(lang, "sleepingSafety", `${Math.round(timings.timeToWaitAfterFiveUnfollows / 60000)}m`),
          });
          await sleep(timings.timeToWaitAfterFiveUnfollows);
        }
        setToast({ show: false });
      }
    };
    void unfollow();
    return () => {
      cancelled = true;
    };
    // A queue owns its initially confirmed selection until it finishes or is cancelled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  let markup: React.JSX.Element;
  switch (state.status) {
    case "initial":
      markup = <NotSearching onScan={onScan} lang={lang} cachedScan={cachedScan} onLoadCached={onLoadCached}></NotSearching>;
      break;

    case "scanning": {
      markup = <Searching
        displayed={displayed} changeTab={changeTab} changeWhitelist={onWhitelistUpdate} startQueue={startQueue}
        pairDescription={pair ? `${pair.baseline.label} → ${pair.comparison.label}` : ''}
        state={state}
        handleScanFilter={handleScanFilter}
        toggleUser={toggleUser}
        pauseScan={pauseScan}
        setState={setState}
        scanningPaused={scanningPaused}
        UserCheckIcon={UserCheckIcon}
        UserUncheckIcon={UserUncheckIcon}
        lang={lang}
      ></Searching>;
      break;
    }

    case "unfollowing":
      markup = <Unfollowing
        state={state}
        handleUnfollowFilter={handleUnfollowFilter}
        lang={lang}
      ></Unfollowing>;
      break;

    default:
      assertUnreachable(state);
  }

  const showScanWarning = state.status === 'scanning' && state.isScanningActive && state.results.length === 0;

  return (
    <main id="main" role="main" className={`iu ${showScanWarning ? "has-scan-warning" : ""}`}>
      <section className="overlay">
        <Toolbar
          displayed={displayed} openSnapshots={openSnapshots} checkViewOwner={checkViewOwner}
          state={state}
          setState={setState}
          isActiveProcess={isActiveProcess}
          toggleAllUsers={toggleAllUsers}
          toggleCurrentePageUsers={toggleCurrentePageUsers}
          setTimings={setTimings}
          currentTimings={timings}
          whitelistedUsers={state.status === "scanning" ? state.whitelistedResults : loadWhitelist()}
          onWhitelistUpdate={onWhitelistUpdate}
          lang={lang}
          onLanguageChange={handleLanguageChange}
        ></Toolbar>

        {markup}
        {historyOwner && <SnapshotManager ownerId={historyOwner} currentOwner={currentViewer}
          capture={capture?.ownerId === historyOwner ? capture : null}
          pair={pair?.baseline.ownerId === historyOwner ? pair : null} lang={lang}
          onCompare={viewDiff} onClose={() => setHistoryOwner(null)} />}

        {toast.show && <Toast show={toast.show} message={toast.text} onClose={() => setToast({ show: false })} />}
      </section>
    </main>
  );
}

if (location.hostname !== INSTAGRAM_HOSTNAME && !isLocalPreview) {
  alert("Can be used only on Instagram routes");
} else {
  document.title = "InstagramUnfollowers";
  document.body.innerHTML = "";
  render(<App />, document.body);
}
