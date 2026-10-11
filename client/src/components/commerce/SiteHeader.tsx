import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { startLogin } from "@/const";
import { STOREFRONT_CATEGORIES } from "@shared/storefrontRules";

/**
 * Accounts are optional for this storefront: catalog, cart and checkout are
 * public. When the titular has not configured the OAuth portal, the header
 * must NOT render a dead "Entrar" button — the audit's rule is that no
 * control ships without a working destination.
 */
const LOGIN_ENABLED = Boolean(
  import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID
);

type SiteHeaderProps = {
  /** Hide the marketing anchors on routes that are not the Home page. */
  variant?: "home" | "compact";
};

/**
 * One header for every route.
 *
 * Before this component existed, Home, PDP and 404 each rendered their own
 * copies: the PDP had no item count, the 404 had no search, and any change to
 * the cart badge had to be made three times (and was already inconsistent).
 * Now the cart badge, search entry point and category links are identical
 * everywhere, and the mobile menu is closed automatically on navigation.
 */
export default function SiteHeader({ variant = "home" }: SiteHeaderProps) {
  const { itemCount, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [location, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Any navigation closes the menus: a menu left open on the PDP is a classic
  // SPA bug where the overlay follows the shopper across routes.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const value = term.trim();
    if (!value) return;
    navigate(`/busca?q=${encodeURIComponent(value)}`);
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--aqv-line)] bg-[var(--aqv-paper)]/95 backdrop-blur">
      <div className="aqv-container flex h-[72px] items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="aqv-mobile-nav"
            className="p-1 md:hidden"
            onClick={() => setMenuOpen(value => !value)}
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <Link
            href="/"
            className="aqv-wordmark"
            aria-label="Arte Que Veste — página inicial"
          >
            ARTE QUE VESTE
          </Link>
        </div>

        <nav
          id="aqv-mobile-nav"
          aria-label="Navegação principal"
          className={`${
            menuOpen
              ? "absolute left-0 right-0 top-[72px] flex border-b border-[var(--aqv-line)] bg-[var(--aqv-paper)] p-5"
              : "hidden"
          } flex-col gap-5 text-[10px] uppercase tracking-[0.16em] md:static md:flex md:flex-row md:gap-7 md:border-0 md:bg-transparent md:p-0`}
        >
          {STOREFRONT_CATEGORIES.map(category => (
            <Link
              key={category.slug}
              href={`/categoria/${category.slug}`}
              className="hover:text-[var(--aqv-accent)] focus-visible:text-[var(--aqv-accent)]"
            >
              {category.label}
            </Link>
          ))}
          {variant === "home" ? (
            <>
              <a href="#novidades" onClick={() => setMenuOpen(false)}>
                Novidades
              </a>
              <a href="#informacoes" onClick={() => setMenuOpen(false)}>
                Ajuda
              </a>
            </>
          ) : (
            <Link href="/#catalogo">Catálogo</Link>
          )}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Buscar peças"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen(value => !value)}
            className="p-2"
          >
            <Search size={18} />
          </button>
          {LOGIN_ENABLED && (
            <button
              type="button"
              aria-label="Entrar na conta"
              onClick={() => startLogin()}
              className="hidden px-2 text-[10px] uppercase tracking-[0.14em] sm:block"
            >
              Entrar
            </button>
          )}
          <button
            type="button"
            aria-label={`Abrir carrinho${itemCount > 0 ? `, ${itemCount} ${itemCount === 1 ? "item" : "itens"}` : ", vazio"}`}
            onClick={openCart}
            className="relative p-2"
          >
            <ShoppingBag size={19} />
            {itemCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-[var(--aqv-accent)] px-1 text-[9px] text-white"
              >
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-[var(--aqv-line)] bg-[var(--aqv-surface)]">
          <form
            onSubmit={submitSearch}
            role="search"
            className="aqv-container flex items-center gap-3 py-4"
          >
            <label htmlFor="aqv-search-input" className="sr-only">
              Buscar peças
            </label>
            <input
              id="aqv-search-input"
              ref={inputRef}
              type="search"
              value={term}
              onChange={event => setTerm(event.target.value)}
              placeholder="Buscar por camiseta, quimono, bolsa…"
              maxLength={80}
              className="h-11 flex-1 border border-[var(--aqv-line)] bg-[var(--aqv-paper)] px-4 text-sm outline-none focus-visible:border-[var(--aqv-accent)]"
            />
            <button
              type="submit"
              className="h-11 bg-[var(--aqv-ink)] px-5 text-[10px] font-medium uppercase tracking-[0.15em] text-white transition hover:bg-[var(--aqv-accent)]"
            >
              Buscar
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
