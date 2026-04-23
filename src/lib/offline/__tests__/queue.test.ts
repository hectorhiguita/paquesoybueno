import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBackoffDelay } from "../queue";

// ---------------------------------------------------------------------------
// Pure function tests (no IndexedDB needed)
// ---------------------------------------------------------------------------

describe("getBackoffDelay", () => {
  it("returns 1000ms for attempt 0", () => {
    expect(getBackoffDelay(0)).toBe(1000);
  });

  it("returns 2000ms for attempt 1", () => {
    expect(getBackoffDelay(1)).toBe(2000);
  });

  it("returns 4000ms for attempt 2", () => {
    expect(getBackoffDelay(2)).toBe(4000);
  });

  it("caps at 4000ms for attempts beyond 2", () => {
    expect(getBackoffDelay(3)).toBe(4000);
    expect(getBackoffDelay(10)).toBe(4000);
  });
});

// ---------------------------------------------------------------------------
// IndexedDB-dependent function tests (mocked)
// ---------------------------------------------------------------------------

// Minimal IDBRequest factory
function makeRequest<T>(result: T, error: DOMException | null = null) {
  const req: Partial<IDBRequest<T>> = { result, error };
  return req as IDBRequest<T>;
}

function makeIDBMock(actions: import("../queue").QueuedAction[] = []) {
  const store = {
    add: vi.fn((item) => {
      actions.push(item);
      const req = makeRequest(item.id);
      setTimeout(() => (req as { onsuccess?: () => void }).onsuccess?.(), 0);
      return req;
    }),
    getAll: vi.fn(() => {
      const req = makeRequest([...actions]);
      setTimeout(() => (req as { onsuccess?: () => void }).onsuccess?.(), 0);
      return req;
    }),
    delete: vi.fn((id: string) => {
      const idx = actions.findIndex((a) => a.id === id);
      if (idx !== -1) actions.splice(idx, 1);
      const req = makeRequest(undefined);
      setTimeout(() => (req as { onsuccess?: () => void }).onsuccess?.(), 0);
      return req;
    }),
    get: vi.fn((id: string) => {
      const action = actions.find((a) => a.id === id);
      const req = makeRequest(action);
      setTimeout(() => (req as { onsuccess?: () => void }).onsuccess?.(), 0);
      return req;
    }),
    put: vi.fn((item) => {
      const idx = actions.findIndex((a) => a.id === item.id);
      if (idx !== -1) actions[idx] = item;
      const req = makeRequest(item.id);
      setTimeout(() => (req as { onsuccess?: () => void }).onsuccess?.(), 0);
      return req;
    }),
  };

  const tx = { objectStore: vi.fn(() => store) };
  const db = {
    transaction: vi.fn(() => tx),
    objectStoreNames: { contains: vi.fn(() => true) },
  };

  const openReq: Partial<IDBOpenDBRequest> = { result: db as unknown as IDBDatabase };
  const idbMock = {
    open: vi.fn(() => {
      setTimeout(() => (openReq as { onsuccess?: () => void }).onsuccess?.(), 0);
      return openReq as IDBOpenDBRequest;
    }),
  };

  return { idbMock, store, actions };
}

describe("enqueueAction", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("stores an action and returns a string id", async () => {
    const { idbMock, store } = makeIDBMock();
    vi.stubGlobal("indexedDB", idbMock);
    vi.stubGlobal("crypto", { randomUUID: () => "test-uuid-1234" });

    const { enqueueAction } = await import("../queue");
    const id = await enqueueAction({ url: "/api/test", method: "POST" });

    expect(typeof id).toBe("string");
    expect(store.add).toHaveBeenCalledOnce();
    const added = store.add.mock.calls[0][0];
    expect(added.url).toBe("/api/test");
    expect(added.method).toBe("POST");
    expect(added.attempts).toBe(0);
    expect(added.maxAttempts).toBe(3);
  });
});

describe("getPendingActions", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns all stored actions", async () => {
    const existing = [
      { id: "a1", url: "/api/1", method: "POST", timestamp: 1, attempts: 0, maxAttempts: 3 },
      { id: "a2", url: "/api/2", method: "PATCH", timestamp: 2, attempts: 1, maxAttempts: 3 },
    ];
    const { idbMock } = makeIDBMock(existing);
    vi.stubGlobal("indexedDB", idbMock);

    const { getPendingActions } = await import("../queue");
    const result = await getPendingActions();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("a1");
    expect(result[1].id).toBe("a2");
  });

  it("returns empty array when queue is empty", async () => {
    const { idbMock } = makeIDBMock([]);
    vi.stubGlobal("indexedDB", idbMock);

    const { getPendingActions } = await import("../queue");
    const result = await getPendingActions();

    expect(result).toHaveLength(0);
  });
});

describe("removeAction", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("removes the action with the given id", async () => {
    const actions = [
      { id: "del-1", url: "/api/x", method: "DELETE", timestamp: 1, attempts: 0, maxAttempts: 3 },
    ];
    const { idbMock, store } = makeIDBMock(actions);
    vi.stubGlobal("indexedDB", idbMock);

    const { removeAction } = await import("../queue");
    await removeAction("del-1");

    expect(store.delete).toHaveBeenCalledWith("del-1");
  });
});

describe("updateActionAttempts", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("updates the attempts count for an existing action", async () => {
    const actions = [
      { id: "upd-1", url: "/api/y", method: "POST", timestamp: 1, attempts: 0, maxAttempts: 3 },
    ];
    const { idbMock, store } = makeIDBMock(actions);
    vi.stubGlobal("indexedDB", idbMock);

    const { updateActionAttempts } = await import("../queue");
    await updateActionAttempts("upd-1", 2);

    expect(store.put).toHaveBeenCalledOnce();
    const updated = store.put.mock.calls[0][0];
    expect(updated.attempts).toBe(2);
  });
});
