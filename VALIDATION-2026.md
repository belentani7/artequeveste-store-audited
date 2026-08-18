# Validación Arte Que Veste — reconstrucción 2026

## Aprobado

| Control | Resultado |
|---|---|
| TypeScript (`pnpm check`) | Aprobado, sin errores |
| Build (`pnpm build`) | Aprobado; Vite y bundle server completan |
| Reglas comerciales nuevas | 3 tests Vitest focalizados aprobados |
| Seguridad/PVC-U existente | Se conserva; no se añadieron secretos ni tokens |
| Catálogo sin productos | Estado branded de lanzamiento, sin datos falsos |
| Error de producto | Shell de marca y estado comercial preservados |
| Responsive | Home revisada en desktop y mobile |
| Motion | GSAP con gate para `prefers-reduced-motion` |
| Consentimiento | Banner mínimo no bloqueante para analítica |
| Assets | Sólo URL persistente de asset 2026 validado y CSS determinista; placeholders fallidos retirados |

## Dependencia externa pendiente

La batería completa de Vitest conserva un smoke test live de Shopify que falla porque `products.list` devuelve `[]`. Esto no es un fallo introducido por la reconstrucción: el catálogo del titular todavía no tiene un producto publicado con imagen, precio y variante utilizable. El test se mantiene fallando intencionalmente para no ocultar la falta de catálogo real.

## Decisión de entrega

La reconstrucción se considera técnicamente lista para que el titular publique productos reales. No se fabricaron productos, precios, stock, reviews, ratings, testimonios, medidas ni claims de sostenibilidad.

## Rendimiento y carga

El build final queda aprobado con `pnpm build`. La entrada principal de la aplicación quedó en aproximadamente **63.54 kB**, la PDP en un chunk lazy de aproximadamente **20.48 kB** y las dependencias transitivas en un vendor chunk de aproximadamente **735.37 kB**. El warning de Vite sobre el vendor grande sigue visible y queda documentado como optimización futura; la Home ya no arrastra la PDP ni GSAP como dependencias directas del shell.

La analítica dejó de cargarse desde `index.html`: ahora sólo se inserta después de que el usuario elige “Aceitar analítica”. La opción “Somente essenciais” no inserta el script.

## Alcance comercial

Se validaron UI de catálogo vacío, estados de error, ruta PDP inexistente, selector de categoría, selección de variante real, add-to-cart y la continuidad hacia checkout mediante el contexto existente. No se pudo completar una compra real ni verificar precio/stock/imágenes live porque Shopify todavía devuelve catálogo vacío; esa parte queda para cuando el titular publique la primera pieza.
