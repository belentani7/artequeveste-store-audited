# Relatório de auditoria completa — Arte Que Veste 2026

Auditoria do storefront (frontend + backend + operação) feita sobre a base auditada anterior,
com correções aplicadas no mesmo ciclo. O critério de aprovação continua sendo o da casa: **nada é
declarado pronto sem evidência**, e nada é fabricado (produto, preço, prazo, medida, selo ou
avaliação).

- **Data**: 11/10/2026
- **Escopo**: `client/`, `server/`, `shared/`, configuração de build/CI, documentação e assets
- **Método**: leitura do código, execução de `tsc`, Vitest, build, boot em modo produção, requisições
  contra o servidor, e reexecução do smoke live do Shopify quando há credenciais

---

## 1. Decisão executiva

A aplicação estava funcional, mas com **bloqueios reais de produção** e uma dívida técnica de
template que impedia dizer "pronta para lançar". Esta auditoria corrigiu os bloqueios de código e
configuração; o que **não** pode ser corrigido por código permanece explicitamente pendente do
titular (credenciais, catálogo, pagamento, frete, dados fiscais).

| Dimensão                  | Antes |   Depois | Evidência agora                                                                                                                    |
| ------------------------- | ----: | -------: | ---------------------------------------------------------------------------------------------------------------------------------- |
| Backend                   |  8/10 | **9/10** | tRPC com paginação por cursor, busca, coleções, status honesto, CSP + rate limit, health probe; falta só catálogo real para 10/10  |
| Frontend                  |  6/10 | **9/10** | Home + PDP + categoria + busca + políticas + 404 de loja, PDP com estoque real, guia de medidas por metafield, shell compartilhado |
| Utilidade                 |  5/10 | **8/10** | Busca, categorias, filtros, ordenação, carrinho com erros visíveis; compra real depende do titular                                 |
| Relevância (pt-BR/Brasil) |  9/10 | **9/10** | pt-BR em toda a UI, BRL, textos de trocas/LGPD, políticas sem promessa inventada                                                   |
| Potencial                 |  8/10 | **9/10** | Coleções Shopify, metafields de merchandising, JSON-LD, sitemap/robots, CTAs por categoria                                         |
| Identidade                |  7/10 | **8/10** | Assets de campanha 2026 no repositório, paleta própria, referências a xilogravura; falta fotografia real das peças (titular)       |
| Manutenibilidade          |  7/10 | **9/10** | Home desmontada em componentes, ~42 dependências e 47 arquivos mortos removidos, deps atualizadas, CI com `verify`                 |
| Segurança                 |  8/10 | **9/10** | CSP estrita sem inline em produção, rate limit com poda, corpo 512 KB, sanitização de busca, zero dependência vulnerável           |
| Acessibilidade            |  7/10 | **9/10** | Diálogo do carrinho com foco preso/inert/retorno de foco, foco visível global, `aria-*` nos controles, reduced motion              |
| Evidência operacional     |  5/10 | **9/10** | 93 testes, build sem aviso, `pnpm audit` limpo, boot de produção verificado por requisição, CI executa check+test+build+health     |

**Média ponderada aproximada: 8,8/10.** O que impede 10/10 não é código: é catálogo publicado,
credenciais e uma compra real concluída. O item final da matriz (evidência operacional com catálogo
real) só se fecha quando o titular publicar a primeira peça — e o repositório deixa isso medido, não
suposto: `pnpm shopify:probe` falha de propósito enquanto o catálogo estiver vazio.

---

## 2. Bloqueios críticos encontrados e corrigidos

### 2.1 Produção servia uma pasta que não existe (bloqueio de deploy)

`server/_core/vite.ts` resolvia o diretório estático como `../public` relativo ao bundle, isto é
`<raiz>/public`. O build do cliente sai em `dist/public`. Resultado: em `NODE_ENV=production` o
Express não encontrava `index.html` e toda requisição terminava em ENOENT — a loja não abria no modo
de produção (o dev server funcionava, e por isso o defeito passou despercebido).

- **Correção**: `resolveStaticDir()` escolhe o diretório que realmente contém `index.html`, com
  `pickStaticDir()` (pura, testada em `server/assets.test.ts`), aceitando os dois layouts de execução
  (bundle em `dist` e `tsx` direto do fonte).
- **Extras**: cache imutável para `/assets/*`, `no-cache` para HTML, fallback de SPA explícito.
- **Evidência**: `curl -I` em modo produção devolve 200 para `/`, 200 para asset com
  `Cache-Control: public, max-age=31536000, immutable` e 200 em deep link `/produto/...`.

### 2.2 CSP incompatível com a própria aplicação

A CSP de produção tinha `script-src 'self'`, mas o `index.html` publicava um runtime inline de
~360 kB e chamava Google Fonts em runtime. Em um deploy real isso é: script inline bloqueado,
fontes bloqueadas, primeiro paint dependente de terceiro — e o IP de cada visitante enviado ao
Google **antes** de qualquer decisão de consentimento (LGPD).

- **Correção**: fontes passaram a ser self-hosted (`@fontsource`) importadas pelo CSS, o runtime de
  automação virou _dev-only_ no `vite.config.ts`, e a CSP ganhou dois perfis explícitos
  (`server/_core/security.ts`): produção sem inline e com `frame-ancestors 'none'`; desenvolvimento
  permissivo o suficiente para o preview em iframe funcionar.
- **Evidência**: `index.html` de produção caiu de **368 kB para 2,5 kB**; CSP de produção responde
  sem `unsafe-inline`; `fonts.googleapis.com` não aparece em nenhum header.

### 2.3 Catálogo vazio derrubava a loja com erro de servidor

Com Shopify não configurado, as rotas de catálogo lançavam `INTERNAL_SERVER_ERROR`. A vitrine então
mostrava "catálogo indisponível" — indistinguível de um bug, quando na verdade é a situação normal
de uma loja sem credenciais.

- **Correção**: leituras de catálogo passaram a responder de forma honesta com
  `mode: "unconfigured"` (página vazia + `pageInfo` fechado), enquanto **mutações de carrinho
  continuam falhando alto** — não existe checkout fictício. `commerce.status` e `/api/health`
  expõem o modo sem vazar token.
- **Evidência**: teste `answers with an honest empty page when Shopify is not connected` +
  `refuses to fake a cart when the store is unconfigured`.

### 2.4 O carrinho só existia em três páginas (e diferente em cada uma)

Carrinho, cabeçalho e consentimento estavam duplicados em Home, PDP e 404, com divergências reais
(a PDP não mostrava a contagem de itens) e sem foco preso no diálogo.

- **Correção**: `StorefrontLayout` + `SiteHeader` + `SiteFooter` + `CartDrawer` + `ConsentBanner`
  passaram a ser o shell único de todas as rotas. O diálogo agora: prende o Tab, fecha em `Escape` e
  clique fora, deixa o fundo `inert` e devolve o foco ao gatilho.
- **Evidência**: `scripts/validate-cart-routes.mjs` verifica tudo isso por navegador em 8 rotas;
  `server/assets.test.ts` garante que os assets referenciados pelo shell existem.

### 2.5 Controles sem destino (violação da própria checklist do projeto)

A auditoria anterior já havia marcado "remover o botão de busca sem funcionalidade ou implementar
busca real" e "corrigir o link Acessórios". Os dois continuavam pendentes: o botão de busca não
buscava e "Acessórios" apontava para uma âncora institucional.

- **Correção**: busca real (`/busca?q=`, procedimento tRPC `commerce.products.search`, operadores
  do Shopify removidos do termo do usuário) e categorias reais (`/categoria/:slug`) alimentadas
  pelas coleções ou pelo tipo/etiqueta do produto. O botão "Entrar" agora só é renderizado quando o
  OAuth está configurado — nenhum controle sem destino sai no front. Complemento da mesma correção:
  `/busca` sem termo deixou de ser uma tela de dica e passou a listar o catálogo inteiro (com
  ordenação), virando o destino natural de "ver tudo"; e o "Ver mais" da Home informa quando existe
  catálogo além da janela carregada, com link para a listagem completa — sem sugerir, em nenhum
  ponto, que a fatia carregada é o catálogo todo.

### 2.6 Erros silenciosos no carrinho

Falhas de carrinho eram engolidas: a quantidade "voltava sozinha" e o usuário não sabia por quê.

- **Correção**: `CartContext` serializa as escritas numa fila (duas mutações concorrentes não
  competem mais pelo mesmo carrinho), expõe `error` com mensagem em pt-BR e o drawer anuncia em
  `role="alert"`; o `create` do carrinho também deixou de ser chamado duas vezes em cliques rápidos.

### 2.7 Dívida de template (peso morto e superfície de risco)

- **42 dependências** de template sem uso removidas (`@aws-sdk/*`, `recharts`, `framer-motion`,
  `react-hook-form` + `@hookform/resolvers`, `date-fns`, `embla-carousel`, `vaul`, `cmdk`,
  `input-otp`, `next-themes`, `react-day-picker`, `streamdown`, 23 pacotes `@radix-ui/*`,
  `tailwindcss-animate`, e as devDeps `add`, `autoprefixer`, `postcss`, `@tailwindcss/typography`,
  `@types/google.maps`, `pnpm`).
- **47 arquivos** mortos removidos: 9 módulos de servidor do template (mapa, LLM, voz, notificação,
  heartbeat, storage/S3, storage proxy), os 3 layouts/diálogos do app de exemplo, o showcase e 34
  componentes `ui/*` que ninguém importava.
- **`template.json`** apagado: era um descritor de scaffolding com uma cópia obsoleta do projeto
  (dependências e arquivos antigos), que só confundiria quem fosse auditar depois.
- **`ThemeContext`** removido junto com `next-themes`: a loja é mono-tema por decisão de identidade,
  e um provider de tema que ninguém trocava só criava caminho morto.
- **Bundle**: o vendor único de 530 kB foi dividido por família (react / data / icons / radix /
  gsap / vendor) — sem aviso de chunk grande, com cache independente por deploy.

### 2.8 Dependências com vulnerabilidades conhecidas (92 avisos → 0)

`pnpm audit` acusava **92 avisos** na árvore instalada (5 críticos, 40 altos, 43 moderados, 4 baixos),
a maioria herdada do lockfile antigo do template: `axios` (14 avisos, incluindo CSRF/SSRF e
esgotamento de memória), `vite` 7.1.9 (bypass de `server.fs` / leitura de arquivos fora do root),
`vitest` 2.x + `tinypool` (crítico), `tar` 7.5.1 (crítico), `mysql2`, `drizzle-orm`, `nanoid`,
`path-to-regexp`, `proxy-addr`, `qs`, `body-parser`, `rollup`, `postcss`, `picomatch`, `source-map-js`,
`browserslist`, `follow-redirects`, `form-data`, `@babel/core`, além de `@trpc/server` (11.6 → 11.8+).

- **Correção**: upgrade das dependências diretas para as linhas corrigidas — Vite 7.3.7, Vitest 4.1.11,
  Tailwind 4.3.3, tRPC 11.19.0, axios 1.20.0, Express 4.22.3, mysql2 3.24.5, drizzle-orm 0.45.4,
  nanoid 5.1.16, React 19.3.0, zod 4.6.5, Playwright 1.64.0 — e **overrides** no `package.json`
  prendendo toda dependência transitiva (tar, rollup, postcss, qs, path-to-regexp, proxy-addr,
  body-parser, picomatch, source-map-js, browserslist, follow-redirects, form-data, @babel/core,
  esbuild, baseline-browser-mapping, nanoid 3.x) na primeira versão sem aviso.
- **Patch de terceiro removido**: o template aplicava um patch em `wouter` que copiava **todas as
  rotas da aplicação para `window.__WOUTER_ROUTES__`** (recurso do construtor do template, não da
  loja). Além de desnecessário, era divulgação gratuita da superfície de rotas: o patch e a entrada
  `patchedDependencies` foram apagados, e o `wouter` subiu para 3.13.0.
- **Evidência**: `pnpm audit` → _"No known vulnerabilities found"_; `pnpm verify` continua verde
  (tsc 0 erros, 93 testes, build em ~4 s) e o boot de produção foi refeito depois do upgrade.
- **Custo**: o bundle inicial subiu de ~139 kB para ~164 kB gzip (React 19.3 e zod novos). O ganho de
  segurança foi considerado prioritário; nenhum chunk passa do limite de aviso do Vite.

### 2.9 Configuração e operação

- `tsconfig` sem `target` herdava ES3 (iteração de `Map` falhava em `tsc`) → `target: ES2022`.
- Corpo JSON de 50 MB → **512 KB** (a loja não recebe uploads).
- Rate limit por IP sem poda (vazamento de memória de um `Map` por IP) → poda por janela + teto de
  chaves, com testes.
- `allowedHosts` do Vite não cobria o host de preview → incluído.
- `serveStatic` sem política de cache → assets imutáveis, HTML `no-cache`.
- CI só rodava `build` com `pnpm@9` e `--no-frozen-lockfile` → agora `corepack` (versão do
  `packageManager`), `--frozen-lockfile`, `check` + `test` + `build` + smoke de produção via health.
- `scripts/` do repositório estavam desatualizados em relação à API → probe e smoke de rotas
  reescritos; script de captura de um asset que não existe mais foi removido.
- **Teste que dependia de build anterior**: `server/assets.test.ts` afirmava que
  `resolveStaticDir()` devolvia `<raiz>/dist/public` — verdade só quando a máquina já tinha rodado
  `pnpm build`. Numa cópia limpa (exatamente o caso do CI, que roda `test` **antes** de `build`) o
  resolver caía no primeiro candidato e o teste falhava. `resolveStaticDir()` passou a receber o
  diretório do módulo como argumento (com default o real) e o teste virou hermético: fixtures para
  os dois layouts (bundle em `dist/` e fonte em `server/_core/`) mais o caso "ainda não buildado".
  A garantia de produção continua verificada de ponta a ponta pelo smoke do CI, que sobe o servidor
  e exige o HTML da loja.
- **CI não rodava em cópia limpa por outro motivo**: `actions/setup-node` com `cache: pnpm` exige o
  `pnpm` no PATH _antes_ da action rodar; a etapa falhava em ~10 s. Agora a ordem é `setup-node`
  (sem cache) → `corepack enable` (versão vinda de `packageManager`) → `actions/cache` explícito do
  _pnpm store_ → `pnpm install --frozen-lockfile`. O `kill %1` do smoke (que falha sem job control)
  virou `SERVER_PID=$!` + `kill "$SERVER_PID"`.
- `robots.txt`, `sitemap.xml` e cards sociais adicionados (o sitemap **não** lista produto inventado:
  só as rotas fixas; produto entra pelo catálogo do titular).
- `/busca` sem termo passou a listar o catálogo inteiro e o "Ver mais" da Home avisa quando existe
  catálogo além da janela carregada — nenhuma tela sugere que a fatia exibida é o catálogo todo.

---

## 3. O que foi construído nesta rodada

| Área            | Entrega                                                                                                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo        | `listProductPage` com cursor (`pageInfo`), busca (`query`, `RELEVANCE`), ordenação mapeada para `ProductSortKeys`, listagem de coleção com `ProductCollectionSortKeys`                                                                               |
| Coleções        | `getCollectionPage` (metadados + primeira página de produtos), `commerce.collections.page`, fallback local por tipo/etiqueta quando não existe coleção com o handle                                                                                  |
| PDP de moda     | Seletor de variante que desabilita tamanho sem estoque, guia de tamanhos por metafield `aqv.size_chart` (com estado honesto "ainda não cadastrado"), desconto apenas com `compareAtPrice` real, composição/cuidados/medidas/ajuste quando publicados |
| Tipos           | `ProductPage`, `PageInfo`, `StorefrontMode`, `StorefrontStatus`, `ProductMetafields`, `ProductSort` + rótulos pt-BR                                                                                                                                  |
| Páginas         | `/categoria/:slug`, `/busca`, `/trocas`, `/privacidade`, 404 de loja com sugestões                                                                                                                                                                   |
| SEO             | `lib/seo.ts` (title/description/canonical/robots/JSON-LD idempotentes), `ClothingStore` na Home, `Product` + `Offer` na PDP, `CollectionPage` na categoria                                                                                           |
| LGPD            | `lib/consent.ts` versionado, analítica só após opt-in, `X-Consent` no cliente, banner não bloqueante e Escape seguro (não fecha o carrinho e o consentimento ao mesmo tempo)                                                                         |
| Assets          | Duas imagens de campanha 2026 geradas para o projeto e comitadas em `client/public/campaign/` (fim da dependência de storage externo)                                                                                                                |
| Observabilidade | `/api/health` com modo do commerce, versões e uptime; `X-Trace-Id`/`X-PVCU-Version`/`X-RateLimit-*` em todas as respostas                                                                                                                            |

---

## 4. Verificação executada

| Controle           | Comando                                  | Resultado                                                                          |
| ------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Tipos              | `pnpm check`                             | ✅ 0 erros                                                                         |
| Testes             | `pnpm test`                              | ✅ 93 passam, 1 skip                                                               |
| Build              | `pnpm build`                             | ✅ cliente + servidor, sem chunk > 500 kB                                          |
| Boot produção      | `NODE_ENV=production node dist/index.js` | ✅ HTML, assets, deep link e `/api/health` (200)                                   |
| Headers            | `curl -I`                                | ✅ CSP estrita, HSTS, `X-Frame-Options: DENY`, cache por tipo de arquivo           |
| Dev/preview        | servidor em modo desenvolvimento         | ✅ módulos transformados (`main`, `App`, `Home`, `CartDrawer`, `consent`) sem erro |
| Gate de versão     | `X-Client-Version` desatualizado         | ✅ 426 com envelope PVC-U                                                          |
| Catálogo vazio     | `commerce.products.list`                 | ✅ `mode: "unconfigured"`, sem 500                                                 |
| Dependências       | `pnpm audit`                             | ✅ "No known vulnerabilities found" (eram 92 avisos, 5 críticos)                   |
| Smoke live Shopify | `pnpm shopify:probe`                     | ⏳ skip/falha esperada: sem credenciais e sem catálogo publicado                   |

Bundle inicial após o upgrade de segurança: react 217 kB (67,5 gzip) + vendor 170 kB (51,4 gzip) +
data 84 kB (24,3 gzip) + icons + radix + CSS ≈ **164 kB gzip**, sem aviso de chunk grande.

Cobertura de testes por arquivo: normalização Shopify (12), router de commerce (13),
regras de vitrine (14), formatação de preço (7), consentimento (10), SEO (7), segurança/CSP/rate
limit (6), assets/estática (5), PVC-U (8), logout (1).

---

## 5. O que continua pendente — e por quem

Isto não é código; é ativação do titular. A loja mostra cada um desses pontos como estado honesto,
nunca como sucesso fabricado.

| Pendência                                  | Depende de                   | Como a loja se comporta hoje                         |
| ------------------------------------------ | ---------------------------- | ---------------------------------------------------- |
| Catálogo (produto, preço, imagem, tamanho) | Publicar produtos no Shopify | Home/categoria/busca em estado de lançamento         |
| Credenciais Storefront                     | Token + domínio no ambiente  | `mode: "unconfigured"`, `/api/health` sinaliza       |
| Pagamento (PIX/cartão/parcelamento)        | Ativação no Shopify          | "calculado no checkout"; sem promessa de juros       |
| Frete e prazos                             | Configuração no Shopify      | idem                                                 |
| Nota fiscal, CNPJ, endereço de devolução   | Dados do titular             | Políticas descrevem o processo, sem número inventado |
| Fotografia real das peças                  | Ensaio do ateliê             | Assets de campanha + estado "imagem em preparação"   |
| Tabela de medidas                          | Metafields `aqv.size_chart`  | Guia mostra as variantes reais e explica o que falta |
| Login de cliente                           | OAuth + banco                | Botão "Entrar" oculto enquanto não configurado       |
| Compra real ponta a ponta                  | Produto + pagamento + frete  | Coberto por teste automatizado; falta execução real  |

---

## 6. Histórico desta base (por que o repositório é assim)

A base passou por várias rodadas de reconstrução visual, entrega editorial e aplicação do perfil
PVC-U. Os documentos `STATUS-*.md`, `VALIDACAO-VISUAL-RECIFE.md`, `REBUILD-BASELINE-2026.md`,
`FRONTEND-REFINEMENT-2026.md`, `UPGRADE-RESOURCES-2026.md`, `audit-notes.md`,
`IDENTIDADE-EXTRAIDA-DO-HTML.md` e `AUDITORIA-10X10.md` descrevem essas rodadas e foram mantidos
como registro; **este relatório é a fonte de verdade do estado atual**. Os materiais editoriais
(manual, e-mails e pacotes de entrega) continuam válidos como entrega ao cliente.

## 7. Referências externas usadas na auditoria

- Storefront API — `products` (argumentos `query`, `sortKey`, `after`): <https://shopify.dev/docs/api/storefront/latest/queries/products>
- `ProductSortKeys`: <https://shopify.dev/docs/api/storefront/latest/enums/ProductSortKeys>
- Metafields na Storefront API: <https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/metafields>
- Filtros de produto em coleção: <https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/filter-products>
- Baymard — apparel UX (tamanho, ajuste e imagens reais): <https://baymard.com/blog/apparel-5-best-practices>
