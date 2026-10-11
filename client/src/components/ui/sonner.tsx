import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toast host, pinned to the store's light surface.
 *
 * The storefront is intentionally single-theme (paper + ink), so this no
 * longer reads `next-themes` — the theme provider and `next-themes` were
 * removed as part of the dependency audit.
 */
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="light"
    className="toaster group"
    style={
      {
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
      } as React.CSSProperties
    }
    {...props}
  />
);

export { Toaster };
