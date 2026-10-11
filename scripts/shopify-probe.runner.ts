/**
 * `pnpm shopify:probe` — live catalog probe.
 *
 * Prints the normalized first page against the real Storefront API, plus the
 * pagination cursor, and exits non-zero when the catalog is not usable for
 * rendering. This is the script to run after the titular publishes products:
 * it answers "will the storefront have something real to show?" without
 * touching the UI.
 */

import {
  SHOPIFY_API_VERSION,
  getStorefrontStatus,
  isShopifyConfigured,
  listProductPage,
  listCollections,
} from "../server/_core/shopify";

async function main() {
  if (!isShopifyConfigured()) {
    console.error(
      [
        "[shopify:probe] Shopify is not connected, so the storefront is in launch mode (empty catalog, no error).",
        "  Set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_API_ACCESS_TOKEN to run a live probe.",
      ].join("\n")
    );
    process.exit(2);
  }

  const status = getStorefrontStatus();
  console.log(
    `[shopify:probe] store=${status.storeDomain} api=${SHOPIFY_API_VERSION}`
  );

  console.log("[shopify:probe] calling listProductPage({ first: 25 })...");
  const page = await listProductPage({ first: 25 });
  console.log(
    `[shopify:probe] received ${page.products.length} product(s); hasNextPage=${page.pageInfo.hasNextPage}\n`
  );

  const preview = page.products.map(product => ({
    handle: product.handle,
    title: product.title,
    productType: product.productType,
    price: `${product.priceRange.min.amount} ${product.priceRange.min.currencyCode}`,
    image: product.images[0]?.url ?? null,
    variantCount: product.variants.length,
    availableVariants: product.variants.filter(
      variant => variant.availableForSale
    ).length,
    publishedMetafields: product.metafields
      ? Object.keys(product.metafields)
      : [],
  }));
  console.log(JSON.stringify(preview, null, 2));

  const collections = await listCollections(10).catch(() => []);
  console.log(
    `\n[shopify:probe] collections: ${collections.map(collection => collection.handle).join(", ") || "(none)"}`
  );
  if (collections.length) {
    console.log(
      "  Tip: a collection whose handle matches a storefront category is used as-is by /categoria/<slug>."
    );
  }

  const usable = page.products.find(product => {
    const hasTitle =
      typeof product.title === "string" && product.title.trim().length > 0;
    const hasImage = (product.images[0]?.url ?? "").length > 0;
    const price = Number.parseFloat(product.priceRange.min.amount);
    return hasTitle && hasImage && Number.isFinite(price) && price > 0;
  });

  if (!usable) {
    console.error(
      "\n[shopify:probe] FAIL: no product had all of title + image + price > 0."
    );
    console.error(
      "  Likely causes: products not published to the storefront channel, missing price, or missing media."
    );
    process.exit(1);
  }

  console.log(
    `\n[shopify:probe] OK: "${usable.title}" has title + image + price > 0.`
  );
}

main().catch(error => {
  console.error("[shopify:probe] ERROR:", error);
  process.exit(1);
});
