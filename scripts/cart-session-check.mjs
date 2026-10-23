import assert from "node:assert/strict";
import { test } from "node:test";
import { createCartSession } from "../client/src/contexts/cartSession.ts";

const deniedStorage = () => {
  throw new Error("SecurityError: blocked");
};

test("blocked localStorage keeps the cart id in memory", () => {
  const session = createCartSession("cart", deniedStorage);
  assert.equal(session.readCartId(), null);
  session.writeCartId("gid://cart/123");
  assert.equal(session.readCartId(), "gid://cart/123");
  session.writeCartId(null);
  assert.equal(session.readCartId(), null);
});

test("successful storage reads, writes and clears cart id", () => {
  const data = new Map([["cart", "previous"]]);
  const storage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  };
  const session = createCartSession("cart", () => storage);
  assert.equal(session.readCartId(), "previous");
  session.writeCartId("current");
  assert.equal(data.get("cart"), "current");
  assert.equal(session.readCartId(), "current");
  session.writeCartId(null);
  assert.equal(data.has("cart"), false);
  assert.equal(session.readCartId(), null);
});

test("failed persistence does not resurrect a stale id", () => {
  const storage = {
    getItem: () => "stale",
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: () => {
      throw new Error("SecurityError");
    },
  };
  const session = createCartSession("cart", () => storage);
  assert.equal(session.readCartId(), "stale");
  session.writeCartId("fresh");
  assert.equal(session.readCartId(), "fresh");
  session.writeCartId(null);
  assert.equal(session.readCartId(), null);
});

test("concurrent adds serialize creation and reuse one cart", async () => {
  const session = createCartSession("cart", deniedStorage);
  const operations = [];
  async function add(variant) {
    return session.enqueue(async () => {
      const id = session.readCartId();
      if (!id) {
        await Promise.resolve();
        operations.push("create:" + variant);
        session.writeCartId("new-cart");
      } else {
        operations.push("add:" + id + ":" + variant);
      }
    });
  }
  await Promise.all([add("A"), add("B"), add("C")]);
  assert.deepEqual(operations, [
    "create:A",
    "add:new-cart:B",
    "add:new-cart:C",
  ]);
});

test("rejected mutations do not deadlock subsequent operations", async () => {
  const session = createCartSession("cart", deniedStorage);
  await assert.rejects(
    session.enqueue(async () => {
      throw new Error("offline");
    }),
    /offline/
  );
  assert.equal(await session.enqueue(async () => 42), 42);
});
