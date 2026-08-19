# Refinamiento frontend — Arte Que Veste 2026

## Dirección visual

La interfaz utiliza una base de papel cálido, tinta carbón, rojo cinabrio y azul polvo, con amarillo de señal y oliva reservados para futuras cápsulas. La textura deja de depender de imágenes inciertas: se compone con grano SVG inline, líneas de registro, tramas diagonales y marcos de corte. La tipografía combina **DM Serif Display** para gesto editorial de moda y **Manrope** para navegación, precio y conversión.

## Motion GSAP

GSAP se carga bajo demanda. La Home aplica entrada secuencial al hero, clip reveal de la imagen principal, reveals por `IntersectionObserver`, stagger de tarjetas y hover de categorías. `prefers-reduced-motion: reduce` evita la inicialización de animaciones y el CSS global reduce transiciones y scroll suave.

## Revisión de accesibilidad

La revisión estática confirma etiquetas `aria-label` en controles de menú, carrito, login, cantidades y añadir al carrito; `focus-visible` con contraste rojo y offset; botones reales para acciones; enlaces para navegación; texto alternativo en imágenes de campaña; y diálogo identificado para consentimiento. La 404 usa botón semántico, foco visible y retorno directo a la tienda. No se modificó el backend comercial. Debe repetirse una prueba manual de teclado con catálogo real cuando Shopify publique productos.

## Rutas

La Home y la PDP comparten papel, tinta, marca y cabecera; la 404 fue reescrita para eliminar el tema verde heredado y usar tokens 2026. La PDP sin producto conserva el shell de marca y muestra un estado de preparación, no una pantalla rota.

## Performance

El build final genera una entrada de aplicación aproximada de 64 kB, una PDP lazy aproximada de 20 kB y un vendor compartido aproximado de 735 kB. El vendor grande queda justificado y documentado porque contiene dependencias compartidas del shell y se entrega como chunk cacheable; no se oculta el warning de Vite. El criterio de aceptación para esta etapa es: build estable, Home sin PDP/GSAP en el entry, PDP lazy y ausencia de errores de runtime por el refinamiento. La siguiente optimización recomendada es dividir el vendor por familia de librería y medir LCP/INP con catálogo real.

## Revalidação final após decisão de assets

Após retirar o asset externo não verificado, a revisão foi repetida: não há mudança em controles ou foco; os únicos visuais externos restantes são os assets 2026 persistentes documentados em `ASSETS-2026.md`. A Home mantém foco visível, botões semânticos, labels de menu/carrinho, alt text da campanha, consentimento identificado e fallback global para reduced motion. TypeScript e build continuam aprovados; o warning de vendor ~735 kB permanece documentado como critério de otimização futura, não como falha de compilação.
