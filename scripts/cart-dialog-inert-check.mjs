import assert from "node:assert/strict";
import { test } from "node:test";
import { inertDialogBackground } from "../client/src/components/commerce/dialogInert.ts";

test("portaled cart keeps itself interactive while hiding the rest of the page", () => {
  const root = { inert: false };
  const alreadyInert = { inert: true };
  const dialog = { inert: false };
  const parent = { children: [root, dialog, alreadyInert] };
  dialog.parentElement = parent;
  const restore = inertDialogBackground(dialog);
  assert.equal(root.inert, true);
  assert.equal(dialog.inert, false);
  assert.equal(alreadyInert.inert, true);
  restore();
  assert.equal(root.inert, false);
  assert.equal(dialog.inert, false);
  assert.equal(alreadyInert.inert, true);
});

test("a detached dialog does not modify unrelated elements", () => {
  const dialog = { inert: false, parentElement: null };
  const restore = inertDialogBackground(dialog);
  restore();
  assert.equal(dialog.inert, false);
});
