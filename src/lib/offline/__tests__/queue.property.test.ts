// Feature: santa-elena-platform, Property 23: Sincronización de acciones pendientes al recuperar red

import { describe, it, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

/**
 * Validates: Requirements 10.6
 *
 * Property 23: For any set of actions queued during an offline period, when
 * network connectivity is restored, all actions in the queue must be sent to
 * the server and processed, without data loss.
 *
 * Specifically: for any set of N queued actions where all fetch calls succeed,
 * replayPendingActions returns N succeeded IDs and 0 failed IDs.
 */

// ---------------------------------------------------------------------------
// Helpers to build a minimal IDB mock from a list of QueuedActions
// ---------------------------------------------------------------------------

import type { QueuedAction } from "../queue";

function buildIDBMock(initialActions: QueuedAction[]) {
  // Mutable in-memory store
  const store: QueuedAction[] = [...initialActions];

  const objectStore = {
    getAll: vi.fn(() => {
      const req: { result: QueuedAction[]; onsuccess?: () => void; onerror?: () => void } = {
        result: [...store],
      };
      setTimeout(() => req.onsuccess?.(), 0);
      return req;
    }),
    delete: vi.fn((id: string) => {
      const idx = store.findIndex((a) => a.id === id);
      if (idx !== -1) store.splice(idx, 1);
      const req: { result: undefined; onsuccess?: () => void; onerror?: () => void } = {
        result: undefined,
      };
      setTimeout(() => req.onsuccess?.(), 0);
      return req;
    }),
    get: vi.fn((id: string) => {
      const action = store.find((a) => a.id === id);
      const req: { result: QueuedAction | undefined; onsuccess?: () => void; onerror?: () => void } = {
        result: action,
      };
      setTimeout(() => req.onsuccess?.(), 0);
      return req;
    }),
    put: vi.fn((item: QueuedAction) => {
      const idx = store.findIndex((a) => a.id === item.id);
      if (idx !== -1) store[idx] = item;
      const req: { result: string; onsuccess?: () => void; onerror?: () => void } = {
        result: item.id,
      };
      setTimeout(() => req.onsuccess?.(), 0);
      return req;
    }),
  };

  const tx = { objectStore: vi.fn(() => objectStore) };
  const db = {
    transaction: vi.fn(() => tx),
    objectStoreNames: { contains: vi.fn(() => true) },
  };

  const openReq: {
    result: typeof db;
    onsuccess?: () => void;
    onerror?: () => void;
    onupgradeneeded?: () => void;
  } = { result: db };

  const idbMock = {
    open: vi.fn(() => {
      setTimeout(() => openReq.onsuccess?.(), 0);
      return openReq;
    }),
  };

  return idbMock;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const queuedActionArb = fc.record({
  id: fc.uuid(),
  url: fc.constantFrom("/api/v1/listings", "/api/v1/messages", "/api/v1/notifications"),
  method: fc.constantFrom("POST", "PATCH", "DELETE"),
  body: fc.option(fc.string(), { nil: undefined }),
  headers: fc.constant(undefined),
  timestamp: fc.integer({ min: 1_000_000, max: 9_999_999 }),
  attempts: fc.constant(0),
  maxAttempts: fc.constant(3),
});

// ---------------------------------------------------------------------------
// Property 23
// ---------------------------------------------------------------------------

describe("Property 23: Sincronización de acciones pendientes al recuperar red", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("all N queued actions succeed when fetch always returns ok", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(queuedActionArb, { minLength: 1, maxLength: 10 }),
        async (actions) => {
          // Deduplicate IDs (fc.uuid can theoretically collide across runs)
          const unique = actions.filter(
            (a, i, arr) => arr.findIndex((b) => b.id === a.id) === i
          );
          if (unique.length === 0) return true;

          // Stub indexedDB with the pre-populated store
          vi.stubGlobal("indexedDB", buildIDBMock(unique));

          // Stub fetch to always succeed
          vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({ ok: true } as Response)
          );

          const { replayPendingActions } = await import("../queue");
          const { succeeded, failed } = await replayPendingActions();

          // All actions must succeed, none must fail
          return succeeded.length === unique.length && failed.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("no data loss: every queued action ID appears in succeeded when all fetches succeed", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(queuedActionArb, { minLength: 1, maxLength: 10 }),
        async (actions) => {
          const unique = actions.filter(
            (a, i, arr) => arr.findIndex((b) => b.id === a.id) === i
          );
          if (unique.length === 0) return true;

          vi.stubGlobal("indexedDB", buildIDBMock(unique));
          vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({ ok: true } as Response)
          );

          const { replayPendingActions } = await import("../queue");
          const { succeeded } = await replayPendingActions();

          const succeededSet = new Set(succeeded);
          // Every original action ID must be in the succeeded set
          return unique.every((a) => succeededSet.has(a.id));
        }
      ),
      { numRuns: 100 }
    );
  });
});
