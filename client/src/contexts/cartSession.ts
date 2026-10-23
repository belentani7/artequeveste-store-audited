/**
 * Keep the cart usable when browsers reject localStorage (private mode,
 * storage permissions or quota). A successful write is authoritative for this
 * page even if the browser refuses to persist it.
 */
type CartStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createCartSession(
  key: string,
  getStorage: () => CartStorage | null
) {
  let inMemoryId: string | null | undefined;
  let tail: Promise<unknown> = Promise.resolve();

  return {
    readCartId(): string | null {
      if (inMemoryId !== undefined) return inMemoryId;
      try {
        return getStorage()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    writeCartId(id: string | null): void {
      inMemoryId = id;
      try {
        const storage = getStorage();
        if (id === null) storage?.removeItem(key);
        else storage?.setItem(key, id);
      } catch {
        // The in-memory cart remains usable until this page is closed.
      }
    },
    enqueue<T>(task: () => Promise<T>): Promise<T> {
      const run = tail.then(task, task);
      tail = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    },
  };
}
