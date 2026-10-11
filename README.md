# Arte Que Veste — loja (storefront fullstack)

Loja de roupas autorais brasileiras construída sobre **Shopify Storefront API** (catálogo, carrinho e
checkout) com um frontend React próprio. O backend é Express + tRPC; o catálogo vem sempre do
Shopify do titular — **nada é inventado**: sem catálogo publicado, a loja entra em modo de
lançamento (vitrine de marca, catálogo vazio, sem erro).

> Estado honesto desta entrega: a aplicação está tecnicamente pronta e verificada (tipos, testes e
> build), mas **não é uma loja que já vende**: faltam credenciais de Shopify, produtos publicados e
> ativações do titular (pagamento, frete, dados fiscais). Ver
> [`RELATORIO-AUDITORIA-2026.md`](./RELATORIO-AUDITORIA-2026.md).

## Sumário

- [Stack](#stack)
- [Como rodar](#como-rodar)
- [Rotas](#rotas)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Arquitetura](#arquitetura)
- [Configuração no Shopify (o que o titular precisa publicar)](#configuração-no-shopify-o-que-o-titular-precisa-publicar)
- [Verificação](#verificação)
- [Deploy](#deploy)
- [Acessibilidade, privacidade e segurança](#acessibilidade-privacidade-e-segurança)
- [Documentação do repositório](#documentação-do-repositório)
- [Licença](#licença)

## Stack

| Camada     | Tecnologia                                                                   |
| ---------- | ---------------------------------------------------------------------------- |
| Frontend   | React 19, Vite 7, Tailwind CSS 4, wouter (router), GSAP (motion sob demanda) |
| Backend    | Node 20+, Express 4, tRPC 11, zod 4, superjson                               |
| Commerce   | Shopify Storefront API `2025-04` (somente Storefront token)                  |
| Testes     | Vitest 4 (node + jsdom) + Playwright (smoke de rotas, opcional)              |
| Tipografia | Self-hosted via `@fontsource` (DM Serif Display + Manrope)                   |

## Como rodar

```bash
corepack enable            # usa a versão de pnpm declarada em package.json
pnpm install --frozen-lockfile
cp .env.example .env       # preencha só o que for usar
pnpm dev                   # http://localhost:3000
```

Sem nenhuma variável configurada a loja já sobe: o catálogo aparece vazio com a mensagem de
lançamento, o carrinho responde com um erro claro (não dá para inventar checkout) e `/api/health`
reporta `mode: "unconfigured"`.

Comandos disponíveis:

```bash
pnpm dev            # servidor de desenvolvimento (Vite em middleware + HMR)
pnpm check          # tsc --noEmit
pnpm test           # vitest run
pnpm build          # build do cliente (dist/public) + servidor (dist/index.js)
pnpm start          # NODE_ENV=production node dist/index.js
pnpm verify         # check + test + build (mesmo gate do CI)
pnpm shopify:probe  # imprime o catálogo normalizado da Storefront API real
pnpm validate:routes# smoke de navegador nas rotas (requer Playwright instalado)
pnpm db:push        # migrations (opcional: só para o login de cliente)
pnpm audit          # nenhuma vulnerabilidade conhecida hoje
```

## Rotas

| Rota                | Descrição                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                 | Home: hero de campanha, novidades, categorias, campanha, catálogo com filtro/ordenação e estados de lançamento/erro                                    |
| `/produto/:handle`  | PDP: galeria, seletor de variante com estoque real, guia de tamanhos (metafields), guia de preço e desconto real                                       |
| `/categoria/:slug`  | Catálogo por categoria (`camisetas`, `quimonos`, `bolsas`, `acessorios`); usa a coleção Shopify de mesmo handle quando existe, senão filtra o catálogo |
| `/busca`            | Busca no catálogo (`?q=`), com ordenação e estado vazio orientado                                                                                      |
| `/trocas`           | Política de trocas e devoluções                                                                                                                        |
| `/privacidade`      | Privacidade e LGPD (consentimento, analítica opcional, direitos)                                                                                       |
| `/404` (e fallback) | 404 de loja: sugestões de categoria, busca e cabeçalho com carrinho                                                                                    |

Rotas de API: `GET /api/health` (liveness/readiness), `/api/trpc/*` (tRPC), `/api/oauth/callback`
(opcional, quando o login está configurado).

## Variáveis de ambiente

Ver [`.env.example`](./.env.example). Resumo:

| Variável                                                                                 | Necessária? | Efeito                                                    |
| ---------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------- |
| `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_API_ACCESS_TOKEN`                            | Para vender | Liga o catálogo/carrinho/checkout reais                   |
| `PORT`, `NODE_ENV`                                                                       | Não         | Porta (3000) e perfil de segurança/cache                  |
| `VITE_OAUTH_PORTAL_URL`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `JWT_SECRET`, `DATABASE_URL` | Não         | Login de cliente; sem eles o botão "Entrar" não é exibido |
| `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID`                                   | Não         | Analítica; só carrega **após** consentimento explícito    |

## Arquitetura

```text
client/                     SPA (Vite)
  index.html                shell mínimo + og/twitter + noscript
  public/                   robots.txt, sitemap.xml, assets de campanha 2026
  src/
    pages/                  Home, ProductDetail, CategoryPage, SearchPage, PolicyPage, NotFound
    components/commerce/    SiteHeader, SiteFooter, ProductCard, CartDrawer,
                            ConsentBanner, StorefrontLayout (+ estado de lançamento)
    contexts/CartContext    carrinho (tRPC), fila de escrita, erros visíveis
    lib/                    format (dinheiro), seo (title/canonical/JSON-LD), consent (LGPD)
server/
  _core/
    shopify.ts              transporte GraphQL + fragmentos + capacidades
    shopifyNormalize.ts     *seam*: único lugar que conhece formas do Shopify
    security.ts             CSP (prod/dev) + rate limit
    vite.ts                 dev (middleware) e produção (static + cache)
    oauth.ts, sdk.ts, db.ts autenticação opcional do titular
  routers/                  commerce (catálogo, coleções, carrinho), system (health)
shared/
  commerce/types.ts         tipos agnósticos de backend (Money, Product, Cart, …)
  storefrontRules.ts        categorias, variante comprável, ordenação, desconto
  pvcu.ts                   versão de cliente, trace id, envelope de validação
```

Princípios que a auditoria fixou:

1. **Um seam só**: nenhum `edges`/`node` do GraphQL chega ao frontend (`shopifyNormalize.ts`, coberto por teste).
2. **Sem dado inventado**: preço, tamanho, estoque, desconto, tabela de medidas e políticas vêm do
   titular (Shopify/metafields) ou não aparecem.
3. **Falha é visível e explicada**: estados de lançamento, catálogo indisponível, 404 de loja e
   erros de carrinho têm texto em pt-BR e caminho de recuperação.
4. **Um shell para todas as rotas**: header com carrinho, consentimento e rodapé vivem em
   `StorefrontLayout`, não duplicados por página.
5. **Segurança por padrão**: CSP estrita em produção, sem inline scripts, rate limit por IP,
   nenhum token no cliente, `X-Client-Version` recusando clientes desatualizados.

## Configuração no Shopify (o que o titular precisa publicar)

1. **Storefront token**: Shopify → Configurações → Apps e canais de venda → Desenvolver apps →
   criar app → _Storefront API_ → copiar o token (o token de Admin **não** é usado aqui).
2. **Produtos**: título, descrição, preço, imagens, variantes de tamanho e estoque.
   - A peça aparece na Home/categoria/busca automaticamente.
   - A categoria vem de `productType` (ex.: `Camisetas`, `Quimonos`, `Bolsas`, `Acessórios`) ou da
     etiqueta `aqv:categoria:<slug>`.
3. **Metafields opcionais** (namespace `aqv`, expostos para a Storefront API):
   | Chave               | Tipo                                     | Onde aparece            |
   | ------------------- | ---------------------------------------- | ----------------------- |
   | `size_chart`        | JSON `[{"Tamanho":"P","Busto":"96 cm"}]` | Guia de tamanhos da PDP |
   | `composition`       | texto                                    | PDP (Composição)        |
   | `care_instructions` | texto                                    | PDP (Cuidados)          |
   | `measurements`      | texto                                    | PDP (Medidas da peça)   |
   | `fit_notes`         | texto                                    | PDP (Ajuste)            |
   | `model_info`        | texto                                    | PDP (Sobre a modelo)    |
4. **Coleções** (opcional, recomendado): crie coleções com handle `camisetas`, `quimonos`, `bolsas`,
   `acessorios` para controlar ordem e curadoria. Sem elas, `/categoria/<slug>` filtra o catálogo.
5. **Pagamento, frete e checkout**: configurados no Shopify; a loja exibe "calculado no checkout" e
   nunca promete prazo, frete grátis ou parcelamento sem juros.

Depois de publicar, rode `pnpm shopify:probe` para confirmar que o catálogo está utilizável
(título + imagem + preço > 0).

## Verificação

| Controle                          | Resultado atual                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm check` (TypeScript estrito) | ✅ sem erros                                                                        |
| `pnpm test` (Vitest)              | ✅ 91 testes passam, 1 skip (smoke live sem credenciais)                            |
| `pnpm build`                      | ✅ cliente + servidor; sem aviso de chunk > 500 kB                                  |
| Servidor de produção              | ✅ `pnpm start` serve HTML, assets com cache imutável e deep links                  |
| `/api/health`                     | ✅ `mode`, `apiVersion`, `uptime`, versões                                          |
| Storefront Shopify (live)         | ⏳ depende do titular publicar catálogo (o probe falha de propósito enquanto vazio) |
| Compra real                       | ⏳ depende de pagamento/frete ativos no Shopify                                     |

Detalhes, evidências e o que ainda depende do titular: [`RELATORIO-AUDITORIA-2026.md`](./RELATORIO-AUDITORIA-2026.md).

## Deploy

```bash
pnpm build
NODE_ENV=production PORT=3000 pnpm start
```

- `NODE_ENV=production` ativa CSP estrita (sem inline), HSTS, `X-Frame-Options: DENY` e cache
  imutável para `/assets/*`.
- O servidor serve a SPA com fallback para `index.html`, então deep links (`/produto/<handle>`)
  funcionam em refresh direto.
- Configure as variáveis de ambiente no provedor; nunca comite `.env`.

## Acessibilidade, privacidade e segurança

- **Acessibilidade**: skip visual de foco em todos os controles, `aria-label`/`aria-pressed`/
  `aria-expanded` nos controles de menu, busca, carrinho e variantes, diálogo do carrinho com foco
  preso, `Escape`, clique fora, fundo `inert` e retorno de foco ao gatilho, `prefers-reduced-motion`
  desliga as animações GSAP e o scroll suave, tabelas de medidas com `caption`/`th` e imagens com
  `alt` real ou `aria-hidden`.
- **Privacidade (LGPD)**: nenhuma analítica antes do consentimento, escolha versionada e revogável,
  páginas de política publicadas. Fontes são self-hosted (nenhuma requisição a terceiros no
  carregamento inicial).
- **Segurança**: CSP, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP, rate limit por IP
  (120 req/min) com poda de memória, corpo JSON limitado a 512 KB, validação zod em todas as
  entradas e sanitização do termo de busca. Ver [`SECURITY.md`](./SECURITY.md).

## Documentação do repositório

| Documento                                                                                                                    | Conteúdo                                                        |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [`RELATORIO-AUDITORIA-2026.md`](./RELATORIO-AUDITORIA-2026.md)                                                               | Auditoria completa: achados, correções, verificação e bloqueios |
| [`VALIDATION-2026.md`](./VALIDATION-2026.md)                                                                                 | Resultados técnicos e escopo validado                           |
| [`ASSETS-2026.md`](./ASSETS-2026.md)                                                                                         | Origem/licença dos assets visuais                               |
| [`PVCU-ARTE-QUE-VESTE.md`](./PVCU-ARTE-QUE-VESTE.md)                                                                         | Perfil de validação (PVC-U) aplicado à loja                     |
| [`CHECKLIST-LANCAMENTO-RECIFE.md`](./CHECKLIST-LANCAMENTO-RECIFE.md)                                                         | Passo a passo de lançamento para o titular                      |
| [`manual-arte-que-veste-2026.md`](./manual-arte-que-veste-2026.md)                                                           | Manual editorial/comercial (entrega ao cliente)                 |
| [`entrega-cliente/`](./entrega-cliente), [`entrega-editorial-arte-que-veste-2026/`](./entrega-editorial-arte-que-veste-2026) | Pacotes de entrega (PDF + editáveis)                            |

## Licença

MIT — ver [`LICENSE`](./LICENSE). Marcas, textos e direção de arte são da Arte Que Veste / Pedro Belentani.
