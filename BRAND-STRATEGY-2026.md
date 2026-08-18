# Arte Que Veste — Estrategia de marca y storefront 2026

## 1. Posicionamiento

**Arte Que Veste** será una marca de ropa autoral brasileña contemporánea, nacida entre Sergipe y Recife, que convierte referencias gráficas, memoria territorial y trabajo manual en prendas utilizables en la vida cotidiana. La marca no se presentará como un museo, un libro ni una tienda de artesanía: será una tienda de ropa con una firma cultural reconocible.

La promesa comercial será: **prendas con identidad visual propia, hechas para ser usadas, combinadas y compradas sin fricción**. La cultura sustenta la diferencia; el producto sostiene la conversión.

## 2. Audiencia prioritaria

La primera audiencia son personas en Brasil que compran ropa online, valoran diseño independiente, buscan piezas con personalidad y necesitan información clara sobre precio, talla, entrega y cambio. La comunicación debe ser inclusiva, directa y útil; no debe exigir que el visitante conozca previamente la historia de la marca.

## 3. Principios de branding

| Principio | Aplicación |
|---|---|
| Producto primero | La primera pantalla conecta colección con compra; el storytelling nunca bloquea el catálogo. |
| Cultura sin disfraz | Referencias de xilogravura y territorio aparecen como códigos gráficos propios, no como decoración folclórica genérica. |
| Humano y verificable | No se inventan testimonios, reviews, materiales, stock, tallas o claims de sostenibilidad. |
| Sistema vivo | El sistema visual funciona en prendas, tarjetas, redes, checkout, email y packaging sin depender de un layout único. |
| Valor claro | Precio, disponibilidad, variante, medidas, entrega y política de cambios se exponen cerca de la decisión. |
| Agente-legible | Productos tienen nombres descriptivos, datos estructurados, alt text y metadatos consistentes para búsqueda y asistentes. |

## 4. Dirección visual nueva

La dirección se llamará **“Traço Vivo / Corte Digital”**. No reutiliza el papel crema, el bloque turquesa ni la composición heredada del front anterior. Se construye con una base de negro carbón y blanco cálido, un color de acento rojo urucum y un azul nocturno profundo, junto con una textura de línea original generada para 2026. La tipografía combina una grotesca variable para navegación y una display de alto contraste para campañas cortas; no se usa la pareja tipográfica anterior como eje.

El código gráfico será una línea irregular controlada, como gesto de corte, aplicada en bordes, separadores, etiquetas y microanimaciones. No se utilizarán imágenes o ilustraciones descargadas de marcas de referencia. Los activos principales serán fotografías/editoriales generados específicamente para esta reconstrucción, con documentación de origen.

## 5. Arquitectura comercial

La nueva navegación será: **Novidades, Camisetas, Quimonos, Bolsas, Acessórios, Coleções, Guia de tamanhos, Ajuda**. La Home tendrá una campaña breve, un rail de novedades, grid de categorías, listado completo y un bloque de confianza. Cada tarjeta mostrará imagen, nombre, precio, estado y acceso al detalle.

La ruta de producto será obligatoria y tendrá galería, título, precio, descripción útil, variantes como botones, disponibilidad, guía de medidas, composición sólo si Shopify la ofrece, entrega/cambios y añadir al carrito. No se mostrarán ratings ni reviews sin datos reales.

El checkout seguirá en Shopify. PIX, tarjeta y cuotas dependerán de la configuración del titular en Shopify; la interfaz no prometerá medios no configurados. El mantenimiento diario seguirá siendo editar productos, imágenes, precios, variantes y stock desde Shopify.

## 6. Arquitectura técnica fullstack

Se conserva Shopify como fuente de verdad del catálogo y checkout, pero se reorganiza el código en componentes y rutas claras. El servidor mantiene tRPC y PVC-U para validación, trazabilidad, sanitización y límites. Se añade un contrato de catálogo resiliente con timeout, retry acotado y estado de error visible; nunca se reemplaza un fallo de red por productos falsos.

La separación prevista es: `storefront shell`, `navigation`, `campaign`, `catalog`, `product-card`, `product-detail`, `size-guide`, `cart`, `trust-block`, `seo`, `analytics-consent` y `error-state`. El cliente no necesitará tocar código para actualizar el catálogo.

## 7. Criterios de aceptación

La reconstrucción no se considera lista si: parece un libro o blog; no ofrece detalle de producto; oculta tallas; inventa datos; no funciona con catálogo vacío; rompe carrito/checkout; carece de labels y foco; o introduce activos con licencia incierta. La versión debe pasar TypeScript, tests Vitest, build, revisión visual desktop/mobile y revisión de errores de red de Shopify.

## Referencias

La estrategia se basa en el estudio 2026 guardado en `RESEARCH-2026-FINDINGS.md`, con referencias a Shopify, McKinsey/BoF, U.S. Department of Commerce, The Branding Journal, FARM Rio, Osklen y SSENSE.
