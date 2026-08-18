# Auditoría 10×10 — Arte Que Veste

## Decisión ejecutiva

La auditoría no autoriza una migración externa automática. **Ningún repositorio evaluado alcanza 10/10 simultáneamente en backend, frontend, utilidad, relevancia, potencial e identidad**, y el proyecto actual presenta un bloqueo comercial verificable: el smoke test contra Shopify devuelve cero productos. Por lo tanto, no se copia Hydrogen ni otra plataforma externa al storefront. Se conserva el backend Shopify/tRPC existente y se prepara el repositorio nuevo únicamente como una copia auditada, trazable y privada del proyecto actual, sin afirmar que la tienda esté lista para vender mientras el titular no publique catálogo, pagos, envíos y datos fiscales.

La regla aplicada es estricta: un candidato externo sólo se incorpora si obtiene 10/10 en todas las dimensiones obligatorias, tiene licencia compatible, documentación primaria, mantenimiento demostrable, integración limpia con Shopify y no degrada la identidad propia de Arte Que Veste. Si falta una sola condición, queda como referencia y no como dependencia.

## Matriz de puntuación

| Dimensión | Puntuación actual | Evidencia | Bloqueo para 10/10 |
|---|---:|---|---|
| Backend | 8/10 | tRPC 11, Express, Shopify Storefront, normalización backend-agnóstica, carrito, checkout, PVC-U y headers de seguridad. | El smoke test live recibe una lista vacía; faltan pruebas de operación real con catálogo publicado y checkout real. |
| Frontend | 6/10 | Home responsive, navegación comercial, filtros, precio, disponibilidad, carrinho y CTA. TypeScript estricto y validación visual desktop/mobile. | Sólo existen Home y 404 como rutas; no hay una experiencia de detalle de producto con selector visible de tallas, guía de medidas, fit, fotos de modelo y selección de variante. |
| Utilidad | 5/10 | La estructura de compra existe y el carrito puede llevar al checkout. | Sin productos reales, la utilidad de compra es limitada y el test de Shopify falla por catálogo vacío. |
| Relevancia | 9/10 | Idioma portugués, Brasil, Sergipe, moneda y flujo Shopify coherentes con el encargo. | Faltan datos operativos del titular y catálogo real para probar el escenario completo brasileño. |
| Potencial | 8/10 | Shopify permite productos, colecciones, carrito, checkout y evolución headless; el stack tiene tRPC y tipos compartidos. | La arquitectura actual no alcanza aún el nivel de catálogo/filtros/PDP necesario para escalar merchandising de moda. |
| Identidad | 7/10 | Paleta papel/tinta/turquesa, referencias a xilogravura y firma discreta de Pedro Belentani. | El hero sigue siendo gráfico abstracto; faltan fotografías y assets reales de prendas que hagan inequívoca la marca de ropa. |
| Mantenibilidad | 7/10 | TypeScript estricto, tipos compartidos, tests Vitest y documentación PVC-U. | La Home concentra demasiada UI en un archivo monolítico y hay dependencias amplias de plantilla no necesariamente usadas. |
| Seguridad | 8/10 | Secretos fuera del código, OAuth, sanitización, límites, headers, CSP y envelopes de validación. | Falta evidencia de auditoría externa, pruebas E2E de checkout y revisión de CSP/terceros en producción. |
| Accesibilidad | 7/10 | Labels en controles principales, navegación mobile, estados de consentimiento y foco proporcionado por componentes. | Falta auditoría automatizada y manual completa; el catálogo/PDP aún no prueba tallas, errores y teclado en escenarios reales. |
| Evidencia operacional | 5/10 | Build y TypeScript pasan; 10 de 12 tests pasan y 1 está skippeado. | El test live Shopify falla porque `products` devuelve `[]`; pagos, envíos, fiscales y compra real dependen del titular. |

**Resultado del proyecto actual:** 7,0/10 promedio ponderado aproximado. **No es 10/10.** No se oculta este resultado ni se presenta como tienda comercial completa.

## Referencia externa evaluada

### Shopify Hydrogen

[Hydrogen](https://shopify.dev/docs/api/hydrogen/latest) es el stack oficial de Shopify para headless commerce basado en React Router, con utilidades, clientes y ejemplos específicos. La documentación oficial indica que necesita Storefront API y Customer Account API, y que sus versiones están vinculadas a versiones trimestrales de las APIs.[1] El repositorio oficial [Shopify/hydrogen](https://github.com/Shopify/hydrogen) usa licencia MIT, mantiene documentación, ejemplos, tests y un monorepo activo, pero sus propias versiones también están ligadas al versionado de Storefront API.[2]

| Criterio | Hydrogen aplicado a Arte Que Veste |
|---|---:|
| Backend | 10/10 como referencia de plataforma; 7/10 como migración inmediata |
| Frontend | 9/10 como base técnica; 6/10 sin construir el PDP de moda |
| Utilidad | 8/10; requiere catálogo y configuración real |
| Relevancia | 9/10 por Shopify; no sustituye el trabajo de marca |
| Potencial | 10/10 como stack Shopify headless |
| Identidad | 3/10 de fábrica; no contiene la identidad de Arte Que Veste |
| Riesgo de migración | Alto; exige reescribir rutas, despliegue, contratos y pruebas |

**Decisión:** Hydrogen no se aplica automáticamente porque no alcanza 10/10 en identidad, utilidad inmediata ni riesgo de migración. Se conserva como referencia técnica, no como dependencia.

## Auditoría de UX de moda

La investigación de Baymard indica que el 90% de los sitios de apparel analizados omite al menos un aspecto importante para evaluar apariencia, talla o ajuste.[3] Sus hallazgos señalan que la información de tallas, los botones visibles para cada talla, las imágenes sobre modelos humanos y la información de ajuste son componentes críticos. Su investigación específica de tallas reporta que el 83% de los sitios desktop y el 87% de los sitios mobile no ofrece información suficiente.[4]

Aplicado a este repositorio, el principal trabajo pendiente no es cambiar de plataforma: es completar una página de producto de ropa con selección de variante visible, medidas reales, guía de talla, fotografías reales de la prenda y un flujo de compra probado.

## Auditoría técnica reproducible

| Control | Resultado |
|---|---|
| TypeScript `pnpm exec tsc --noEmit` | Pasa |
| Build `pnpm build` | Pasa; Vite genera bundle JS aproximado de 782 KB y CSS de 121 KB antes de gzip |
| Vitest unit/integration | 10 tests pasan; smoke live Shopify falla; 1 test queda skippeado |
| Shopify products live | Devuelve lista vacía; no hay producto real usable para verificar imagen/precio |
| Secretos en archivos | No se detectaron credenciales literales; las referencias observadas son variables de entorno |
| Preview desktop/mobile | Validado visualmente; storefront comercial y navegación responsive |
| Publicación | El checkpoint posterior a la corrección quedó publicado en el dominio Manus |

## Qué se aplica y qué no

Se aplica al repositorio nuevo la **base auditada actual**, incluyendo backend Shopify/tRPC, PVC-U, seguridad, tests, storefront comercial y documentación. No se incorpora código de Hydrogen ni de un repositorio externo porque no supera el veto 10/10 en todas las dimensiones y no sería responsable introducir una migración grande sin catálogo, datos de titular y pruebas de operación real.

No se fabrican productos, reseñas, ratings, testimonios, tallas, fotos ni stock. La puntuación comercial sólo puede subir cuando existan datos reales y se valide una compra real.

## Referencias

[1]: https://shopify.dev/docs/api/hydrogen/latest "Shopify Hydrogen API Reference"
[2]: https://github.com/Shopify/hydrogen "Shopify Hydrogen GitHub repository"
[3]: https://baymard.com/blog/apparel-5-best-practices "Baymard — 5 Apparel UX Best Practices"
[4]: https://baymard.com/blog/apparel-size-information "Baymard — Apparel Size Information"
