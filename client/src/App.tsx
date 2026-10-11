import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import { CartProvider } from "./contexts/CartContext";

/**
 * Route-level code splitting.
 *
 * The Home ships in the entry chunk (it is the landing page); every other
 * route is lazy so a shopper who only browses the landing page never pays for
 * the PDP, the search page or the policy copy.
 */
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const PolicyPage = lazy(() => import("./pages/PolicyPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <div
      className="min-h-screen bg-[var(--aqv-paper)]"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="aqv-topline">
        Envio para todo o Brasil · frete calculado no checkout
      </div>
      <div className="aqv-container py-16">
        <p className="aqv-kicker">Carregando</p>
        <div className="mt-6 h-[70vh] animate-pulse bg-[var(--aqv-surface-2)]" />
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/produto/:handle" component={ProductDetail} />
      <Route path="/categoria/:slug" component={CategoryPage} />
      <Route path="/busca" component={SearchPage} />
      <Route path="/trocas">{() => <PolicyPage policyKey="trocas" />}</Route>
      <Route path="/privacidade">
        {() => <PolicyPage policyKey="privacidade" />}
      </Route>
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <CartProvider>
          <Suspense fallback={<RouteFallback />}>
            <Router />
          </Suspense>
        </CartProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
