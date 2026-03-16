import type { Query, QueryClient } from "@tanstack/react-query";

type RequestSource = "axios" | "fetch";
type FetchStatus = "fetching" | "idle" | "paused";

interface NetworkMetric {
  count: number;
  inFlight: number;
  lastDurationMs: number | null;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastStatus: number | string | null;
  lastError: string | null;
  source: RequestSource;
}

interface QueryMetric {
  count: number;
  queryKey: string;
  observers: number;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
}

export interface FetchRequestLogTracker {
  requestId: number;
  key: string;
  source: RequestSource;
  method: string;
  url: string;
  startedAt: number;
}

interface FetchLoggerState {
  initialized: boolean;
  nextRequestId: number;
  totalNetworkRequests: number;
  totalQueryFetches: number;
  networkMetrics: Record<string, NetworkMetric>;
  queryMetrics: Record<string, QueryMetric>;
  queryFetchStatus: Record<string, FetchStatus>;
  queryLoggerAttached: boolean;
}

interface FetchDebugApi {
  reset: () => void;
  snapshot: () => {
    totalNetworkRequests: number;
    totalQueryFetches: number;
    network: Array<NetworkMetric & { request: string }>;
    queries: Array<QueryMetric & { queryHash: string }>;
  };
  printNetworkSummary: () => void;
  printQuerySummary: () => void;
}

declare global {
  interface Window {
    __UCRS_FETCH_DEBUG__?: FetchDebugApi;
  }
}

const GLOBAL_STATE_KEY = "__UCRS_FETCH_LOGGER_STATE__";

const isDev = import.meta.env.DEV;

const createState = (): FetchLoggerState => ({
  initialized: false,
  nextRequestId: 1,
  totalNetworkRequests: 0,
  totalQueryFetches: 0,
  networkMetrics: {},
  queryMetrics: {},
  queryFetchStatus: {},
  queryLoggerAttached: false,
});

const getState = (): FetchLoggerState => {
  const host = globalThis as typeof globalThis & {
    [GLOBAL_STATE_KEY]?: FetchLoggerState;
  };

  if (!host[GLOBAL_STATE_KEY]) {
    host[GLOBAL_STATE_KEY] = createState();
  }

  return host[GLOBAL_STATE_KEY]!;
};

const toIsoTime = (timestamp: number): string => new Date(timestamp).toISOString();

const normalizeUrl = (url: string): string => {
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return url;
  }

  return url;
};

const serializeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
};

const ensureDebugApi = () => {
  if (!isDev || typeof window === "undefined") {
    return;
  }

  const state = getState();

  if (state.initialized && window.__UCRS_FETCH_DEBUG__) {
    return;
  }

  const api: FetchDebugApi = {
    reset: () => {
      const host = globalThis as typeof globalThis & {
        [GLOBAL_STATE_KEY]?: FetchLoggerState;
      };
      host[GLOBAL_STATE_KEY] = createState();
      console.info("[fetch-debug] counters reset");
      ensureDebugApi();
    },
    snapshot: () => {
      const snapshotState = getState();
      return {
        totalNetworkRequests: snapshotState.totalNetworkRequests,
        totalQueryFetches: snapshotState.totalQueryFetches,
        network: Object.entries(snapshotState.networkMetrics)
          .map(([request, metric]) => ({ request, ...metric }))
          .sort((left, right) => right.count - left.count),
        queries: Object.entries(snapshotState.queryMetrics)
          .map(([queryHash, metric]) => ({ queryHash, ...metric }))
          .sort((left, right) => right.count - left.count),
      };
    },
    printNetworkSummary: () => {
      const snapshot = api.snapshot();
      console.table(snapshot.network);
      console.info(`[fetch-debug] total network requests: ${snapshot.totalNetworkRequests}`);
    },
    printQuerySummary: () => {
      const snapshot = api.snapshot();
      console.table(snapshot.queries);
      console.info(`[fetch-debug] total react-query fetches: ${snapshot.totalQueryFetches}`);
    },
  };

  window.__UCRS_FETCH_DEBUG__ = api;
  state.initialized = true;
  console.info("[fetch-debug] logger active. Use window.__UCRS_FETCH_DEBUG__.printNetworkSummary() and printQuerySummary() in the browser console.");
}

export const initializeFetchLogger = () => {
  ensureDebugApi();
};

export const startNetworkFetchLog = (
  method: string,
  url: string,
  source: RequestSource,
): FetchRequestLogTracker | undefined => {
  if (!isDev) {
    return undefined;
  }

  ensureDebugApi();

  const state = getState();
  const normalizedMethod = method.toUpperCase();
  const normalizedUrl = normalizeUrl(url);
  const key = `${normalizedMethod} ${normalizedUrl}`;
  const startedAt = Date.now();

  const metric = state.networkMetrics[key] ?? {
    count: 0,
    inFlight: 0,
    lastDurationMs: null,
    lastStartedAt: null,
    lastCompletedAt: null,
    lastStatus: null,
    lastError: null,
    source,
  };

  metric.count += 1;
  metric.inFlight += 1;
  metric.lastStartedAt = toIsoTime(startedAt);
  metric.source = source;
  state.networkMetrics[key] = metric;
  state.totalNetworkRequests += 1;

  const tracker: FetchRequestLogTracker = {
    requestId: state.nextRequestId,
    key,
    source,
    method: normalizedMethod,
    url: normalizedUrl,
    startedAt,
  };

  state.nextRequestId += 1;

  console.info(
    `[fetch-debug][${source}] request #${tracker.requestId} (${metric.count}x) ${tracker.method} ${tracker.url}`,
    { totalNetworkRequests: state.totalNetworkRequests, inFlight: metric.inFlight },
  );

  return tracker;
};

export const finishNetworkFetchLog = (
  tracker: FetchRequestLogTracker | undefined,
  details: { status?: number | string; error?: unknown } = {},
) => {
  if (!isDev || !tracker) {
    return;
  }

  const state = getState();
  const metric = state.networkMetrics[tracker.key];

  if (!metric) {
    return;
  }

  const completedAt = Date.now();

  metric.inFlight = Math.max(0, metric.inFlight - 1);
  metric.lastCompletedAt = toIsoTime(completedAt);
  metric.lastDurationMs = completedAt - tracker.startedAt;
  metric.lastStatus = details.status ?? "unknown";
  metric.lastError = details.error ? serializeError(details.error) : null;

  if (details.error) {
    console.info(
      `[fetch-debug][${tracker.source}] failed #${tracker.requestId} ${tracker.method} ${tracker.url}`,
      { status: metric.lastStatus, durationMs: metric.lastDurationMs, error: metric.lastError },
    );
    return;
  }

  console.info(
    `[fetch-debug][${tracker.source}] completed #${tracker.requestId} ${tracker.method} ${tracker.url}`,
    { status: metric.lastStatus, durationMs: metric.lastDurationMs, inFlight: metric.inFlight },
  );
};

const formatQueryKey = (query: Query): string => {
  try {
    return JSON.stringify(query.queryKey);
  } catch {
    return query.queryHash;
  }
};

export const attachReactQueryFetchLogger = (queryClient: QueryClient) => {
  if (!isDev) {
    return;
  }

  ensureDebugApi();

  const state = getState();

  if (state.queryLoggerAttached) {
    return;
  }

  queryClient.getQueryCache().subscribe((event) => {
    if (event?.type !== "updated") {
      return;
    }

    const query = event.query;
    const fetchStatus = query.state.fetchStatus as FetchStatus;
    const previousFetchStatus = state.queryFetchStatus[query.queryHash] ?? "idle";

    if (fetchStatus === "fetching" && previousFetchStatus !== "fetching") {
      const metric = state.queryMetrics[query.queryHash] ?? {
        count: 0,
        queryKey: formatQueryKey(query),
        observers: 0,
        lastStartedAt: null,
        lastCompletedAt: null,
        lastStatus: null,
        lastError: null,
      };

      metric.count += 1;
      metric.observers = query.getObserversCount();
      metric.lastStartedAt = toIsoTime(Date.now());
      metric.lastStatus = "fetching";
      metric.lastError = null;
      state.queryMetrics[query.queryHash] = metric;
      state.totalQueryFetches += 1;

      console.info(
        `[fetch-debug][react-query] fetch #${metric.count} ${metric.queryKey}`,
        { observers: metric.observers, totalQueryFetches: state.totalQueryFetches },
      );
    }

    if (fetchStatus !== "fetching" && previousFetchStatus === "fetching") {
      const metric = state.queryMetrics[query.queryHash];

      if (metric) {
        metric.observers = query.getObserversCount();
        metric.lastCompletedAt = toIsoTime(Date.now());
        metric.lastStatus = query.state.status;
        metric.lastError = query.state.error ? serializeError(query.state.error) : null;

        console.info(
          `[fetch-debug][react-query] settled ${metric.queryKey}`,
          { status: metric.lastStatus, error: metric.lastError },
        );
      }
    }

    state.queryFetchStatus[query.queryHash] = fetchStatus;
  });

  state.queryLoggerAttached = true;
}

initializeFetchLogger();