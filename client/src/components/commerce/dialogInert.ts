/**
 * Make the page behind a portaled dialog non-interactive while preserving
 * elements that were already inert before the dialog opened.
 *
 * The dialog must be a direct child of the portal target (document.body).
 * Never inert an ancestor of the dialog: that would disable the dialog too.
 */
export function inertDialogBackground(dialog: Element): () => void {
  const siblings = dialog.parentElement?.children;
  if (!siblings) return () => undefined;

  const previous: Array<{ element: HTMLElement; inert: boolean }> = [];
  for (const sibling of Array.from(siblings)) {
    if (sibling === dialog || !("inert" in sibling)) continue;
    const element = sibling as HTMLElement;
    previous.push({ element, inert: element.inert });
    element.inert = true;
  }

  return () => {
    for (const { element, inert } of previous) element.inert = inert;
  };
}
