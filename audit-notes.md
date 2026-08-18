# Auditoría profunda Arte Que Veste

## Matriz de decisión

La aplicación de cambios exige superar un umbral de 9/10 en cada dimensión y no presentar fallos críticos. Las dimensiones son: backend, frontend, utilidad, relevancia, potencial, identidad, mantenibilidad, seguridad, accesibilidad y evidencia de operación. Un 10/10 absoluto se reserva para una solución con evidencia suficiente; si falta evidencia, se registra como no probado y no se aplica automáticamente.

## Fuentes primarias consultadas

1. [Shopify Hydrogen](https://shopify.dev/docs/api/hydrogen/latest). Shopify describe Hydrogen como su stack opinado para headless commerce, construido sobre React Router, con utilidades y ejemplos para experiencias dinámicas y performantes. Requiere autenticación y consultas contra Storefront API y Customer Account API. Hydrogen se vincula a versiones trimestrales específicas de Storefront API, por lo que la compatibilidad/versionado debe auditarse antes de migrar.
2. [Baymard: 5 Apparel UX Best Practices](https://baymard.com/blog/apparel-5-best-practices). La referencia se utilizará para evaluar la capacidad de una tienda de ropa para comunicar apariencia, talla y ajuste, evitando que el frontend sea sólo editorial.
3. [Shopify Hydrogen en GitHub](https://github.com/Shopify/hydrogen). Referencia oficial de código para comparar prácticas, estructura y mantenimiento; no se copiarán assets, textos o diseño propietario.

## Observaciones iniciales del repositorio

El proyecto actual ya tiene React/Vite/Tailwind, Express/tRPC, autenticación, Shopify Storefront, carrito, checkout, validación PVC-U, headers de seguridad, tests Vitest y GSAP. El endpoint de productos responde correctamente con envelopes de validación, pero el catálogo remoto observado en logs y smoke test devuelve cero productos. Esto limita cualquier puntuación de merchandising real y potencial comercial hasta que el titular publique productos reales.

La Home fue reorientada recientemente para ser una storefront: hero corto de ropa, novedades, todas las piezas, filtros, precio, tamaños cuando existen, disponibilidad, carrito y checkout. La auditoría debe comprobar que no haya controles vacíos, que la IA comercial sea coherente y que las mejoras propuestas no destruyan Shopify, el flujo de autenticación ni la identidad propia de Arte Que Veste.
