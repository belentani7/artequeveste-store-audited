# Línea base antes de reconstrucción 2026

## Decisión de alcance

La nueva tienda se reconstruirá como una experiencia fullstack independiente en arquitectura y diseño, sin reutilizar la estética de libro/manual ni los activos visuales históricos del PDF/HTML. El manual permanece como material de entrega, no como fuente de UI.

## Estado técnico heredado

El proyecto contiene React/Vite/Tailwind en el cliente, Express/tRPC en servidor, autenticación, Shopify Storefront, carrito, checkout, almacenamiento, Drizzle/MySQL, PVC-U y pruebas Vitest. También contiene GSAP, fuentes Google y una Home comercial reciente.

Las rutas de storefront visibles son principalmente `/` y `/404`; no existe una ruta de detalle de producto completa. La Home concentra hero, novedades, categorías, tarjetas, disponibilidad y carrito. El catálogo real no está disponible de forma estable: el smoke test anterior devolvía cero productos y el log más reciente registra `TypeError: fetch failed` / `UND_ERR_SOCKET` en `server/_core/shopify.ts` durante `listProducts`.

## Riesgos que la reconstrucción debe resolver

| Área | Hallazgo | Acción en la nueva tienda |
|---|---|---|
| Datos comerciales | No hay catálogo real publicado de forma comprobable | Diseñar estados vacíos honestos, contratos tipados y preparación clara para productos reales |
| Shopify | Fallo de red reciente en Storefront API | Añadir manejo de errores, timeout/retry razonable, observabilidad y pruebas contractuales sin ocultar fallos |
| UX de moda | La Home no sustituye un PDP completo | Crear listing + PDP con variantes, tallas, medidas y compra clara |
| Marca | El diseño heredado mezcla PDF y front | Crear estrategia visual nueva 2026 con assets nuevos y licencia/origen documentados |
| Mantenibilidad | La Home concentra demasiadas responsabilidades | Separar shell, header, catálogo, card, PDP, carrito, estados y contenido |
| Operación | El cliente no técnico necesita mantenimiento simple | Mantener Shopify como fuente de catálogo y documentar sólo las operaciones necesarias |

## Regla de activos 2026

Sólo se utilizarán activos creados o seleccionados para esta reconstrucción 2026, con origen/licencia documentados. No se usarán imágenes extraídas del PDF/manual ni se inventarán productos, reviews, ratings, testimonios, stock o tallas.
