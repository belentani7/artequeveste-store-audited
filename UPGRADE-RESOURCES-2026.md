# Upgrade de recursos frontend — Arte Que Veste

## Criterio de incorporación

La actualización solo incorpora dependencias y assets con licencia verificable, mantenimiento razonable y utilidad directa para una tienda Shopify de ropa. Las referencias de terceros se estudian como patrones; no se copia una plantilla completa ni una identidad de marca.

## Recursos evaluados

| Área | Recurso | Resultado | Aplicación prevista |
|---|---|---|---|
| Componentes Tailwind | [Preline UI](https://preline.co/) | Biblioteca open source con componentes gratuitos y bloques Pro separados | Usar patrones gratuitos de drawer, tabs, filtros y estados; mantener markup propio |
| Componentes Tailwind | [FlyonUI](https://flyonui.com/) | Biblioteca open source con clases semánticas y plugins; requiere revisar cada componente | Considerar solo patrones compatibles con Tailwind 4 y sin introducir JS innecesario |
| Componentes Tailwind | [ReadymadeUI](https://readymadeui.com/) | El sitio declara componentes MIT; verificar cada bloque antes de copiar | Usar como referencia para navegación, cards, filtros y formularios |
| Iconos | [Tabler Icons](https://github.com/tabler/tabler-icons) | MIT, SVG y React disponibles | Preferir iconos Tabler para estados de tienda si el set actual no cubre el caso |
| Imágenes | [Unsplash Fashion](https://unsplash.com/s/photos/fashion) | Licencia de Unsplash; verificar página individual y evitar presentar imágenes editoriales como producto | Solo campaña/ambiente, nunca catálogo real |
| Imágenes | [Pexels Fashion](https://www.pexels.com/search/fashion/) | Uso gratuito según Pexels; verificar página individual | Solo si la licencia individual queda registrada antes de subir el asset |
| Imágenes ecommerce | [Shopify Burst](https://www.shopify.com/stock-photos) | Recurso de stock orientado a ecommerce; verificar foto individual | Apoyo visual opcional, no reemplaza fotografía de producto real |

## Decisión de sistema

Se conservará la identidad Arte Que Veste: wordmark dominante, paleta papel/tinta/cinabrio/azul, texturas CSS propias, fotografía de campaña 2026 ya validada y GSAP bajo demanda. Los widgets que se actualicen serán: navegación móvil, filtros de categoría, tarjetas de producto, mini-cart, consentimiento, estados vacío/error, PDP y 404. No se añadirán reseñas, ratings ni testimonios inventados.

## Límites de licencia

La búsqueda visual anterior encontró un resultado de Pexels sin página individual verificada; fue retirado y no se reutilizará. Ninguna imagen externa se incorporará al runtime hasta registrar URL individual, licencia y destino de uso. Las imágenes de productos deben proceder del Shopify del titular.

## Revisão final de acessibilidade do upgrade

A Home mantém foco visível global, CTA de compra disponível em touch/mobile, filtros de categoria com `aria-pressed`, consentimento e carrinho com `role="dialog"` e `aria-modal`, além de labels para menu e carrinho. A PDP passou a expor `aria-pressed` na galeria e `aria-expanded`/`aria-controls` no guia de tamanhos. A 404 recebeu header, carrinho, navegação e foco consistente. O motion continua condicionado a `prefers-reduced-motion`. TypeScript, build e 13 testes focados passaram; o smoke test live continua bloqueado porque o Shopify ainda não possui produto publicado.

### Correção de fluxo entre rotas

O carrinho foi extraído para `client/src/components/commerce/CartDrawer.tsx` e montado na Home, PDP (estado carregado, loading e error) e 404. Assim, o botão de carrinho não aponta mais para um diálogo ausente fora da Home. A validação visual em mobile confirmou header, estados e composição coerentes nas rotas PDP/404; a suíte interna passou com 13 testes.

### Validação interativa do carrinho

O teste automatizado de navegador percorreu `/produto/exemplo-inexistente` e `/rota-que-nao-existe`. Nas duas rotas, o carrinho abriu pelo botão do header, recebeu foco no botão de fechamento, fechou com `Escape` e fechou com clique fora do painel. O CartDrawer compartilhado permanece montado nos estados loading/error da PDP e na 404.

### Loading real da PDP

Uma captura automatizada com atraso controlado de rede Shopify confirmou o estado real `Preparando a peça` antes da resposta da PDP, com o botão `Abrir carrinho` visível no header durante o loading. A captura foi salva temporariamente em `/tmp/artequeveste-pdp-loading-2026.png`; o arquivo não é um asset de produção.
