# Validação Arte Que Veste — 2026

> Documento vivo. A leitura completa da auditoria (achados, correções e pendências) está em
> [`RELATORIO-AUDITORIA-2026.md`](./RELATORIO-AUDITORIA-2026.md).

## Aprovado nesta rodada

| Controle           | Comando                                  | Resultado                                                                                         |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| TypeScript estrito | `pnpm check`                             | Aprovado, 0 erros                                                                                 |
| Testes             | `pnpm test`                              | **91 aprovados**, 1 skip (smoke live sem credenciais)                                             |
| Build              | `pnpm build`                             | Aprovado; cliente + servidor, **sem** aviso de chunk > 500 kB                                     |
| Boot de produção   | `NODE_ENV=production node dist/index.js` | HTML servido (2,5 kB), assets com cache imutável, deep link `/produto/*` responde 200             |
| Health             | `GET /api/health`                        | 200 com `mode`, `apiVersion`, versões, uptime                                                     |
| CSP                | `curl -I` em produção                    | `script-src 'self'` sem inline; `frame-ancestors 'none'`; HSTS                                    |
| Rate limit         | teste unitário                           | 120 req/min por IP, poda e teto de chaves cobertos                                                |
| Dev/preview        | servidor de desenvolvimento              | Módulos transformados sem erro (`main`, `App`, `Home`, `CartDrawer`, `consent`); tRPC respondendo |
| Dependências       | `pnpm audit`                             | **Sem vulnerabilidades conhecidas** (eram 92 avisos, 5 críticos, antes do upgrade)                |

## Bundle final (gzip entre parênteses)

| Arquivo                                               | Tamanho                                          |
| ----------------------------------------------------- | ------------------------------------------------ |
| `index.html`                                          | 2,42 kB (1,05 kB)                                |
| `index-*.js` (app)                                    | 46,97 kB (14,39 kB)                              |
| `react-*.js`                                          | 217,07 kB (67,50 kB)                             |
| `vendor-*.js`                                         | 170,24 kB (51,40 kB)                             |
| `data-*.js` (tRPC/query/superjson)                    | 84,12 kB (24,33 kB)                              |
| `gsap-*.js` (carregado sob demanda)                   | 68,48 kB (26,80 kB)                              |
| `radix-*.js`                                          | 19,38 kB (7,09 kB)                               |
| `icons-*.js`                                          | 4,41 kB (1,85 kB)                                |
| Rotas lazy: PDP / categoria / busca / políticas / 404 | 13,0 / 7,2 / 5,2 / 4,4 / 3,1 kB                  |
| `index-*.css`                                         | 41,22 kB (11,44 kB)                              |
| Fontes                                                | woff2 latin (DM Serif 24,7 kB + Manrope 24,8 kB) |

Os números são do build após o upgrade de segurança (React 19.3, zod 4.6, Vite 7.3.7, Vitest 4.1.11).
A Home carrega react + vendor + data + icons + radix ≈ **152 kB gzip**; PDP, busca, categoria e
políticas só baixam quando visitadas, e o GSAP só quando há animação permitida. Nenhum chunk passa do
limite de aviso do Vite (> 500 kB).

## O que foi validado funcionalmente (sem catálogo real)

- Estado de lançamento (catálogo vazio) e estado de erro de catálogo, ambos com marca e caminho de recuperação.
- Filtro de categoria, ordenação, paginação por "ver mais" (cursor do backend).
- Busca com termo vazio, com resultados e sem resultados (incluindo o caso "loja não conectada").
- 404 de rota e rota de categoria inexistente.
- Carrinho: criar/add/atualizar/remover/erro, fila de escrita, foco preso, Escape, clique fora, `inert`.
- Consentimento: nenhum script antes do opt-in, persistência versionada, revogação por storage.
- SEO: title/description/canonical/robots e JSON-LD idempotentes por rota.

## Dependências e supply chain

- `pnpm audit` limpo: **0 vulnerabilidades conhecidas** (eram 92, com 5 críticos, na árvore herdada
  do template).
- Dependências diretas nas linhas corrigidas: Vite 7.3.7, Vitest 4.1.11, Tailwind 4.3.3, tRPC 11.19,
  axios 1.20, Express 4.22.3, mysql2 3.24.5, drizzle-orm 0.45.4, nanoid 5.1.16, React 19.3, zod 4.6.5.
- `pnpm.overrides` fixa as transitivas sensíveis (tar, rollup, postcss, qs, path-to-regexp,
  proxy-addr, body-parser, picomatch, source-map-js, browserslist, follow-redirects, form-data,
  @babel/core, esbuild, baseline-browser-mapping, nanoid 3.x) na primeira versão sem aviso — revisar
  a cada atualização de lockfile.
- O patch de terceiro em `wouter` (que copiava as rotas do app para `window.__WOUTER_ROUTES__`) foi
  removido; `patches/` não existe mais.
- CI instala com `--frozen-lockfile`; `pnpm audit` deve entrar como passo manual antes de cada
  entrega (não é gate do CI para não derrubar build por aviso novo de transitiva).

## Dependências externas ainda não exercitadas

| Item                                                      | Por que                                               | Como fechar                                            |
| --------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| Produto real do Shopify (título, imagem, preço, variante) | Catálogo do titular vazio                             | Publicar peça → `pnpm shopify:probe`                   |
| Checkout real (PIX/cartão, frete, prazo)                  | Depende de ativação financeira e logística do titular | Concluir uma compra de teste                           |
| Dados fiscais e endereço de devolução                     | Dados do titular                                      | Preencher e publicar nas políticas                     |
| Tabela de medidas por peça                                | Metafield `aqv.size_chart` não publicado              | Cadastrar metafield; a PDP passa a renderizar a tabela |
| Login de cliente                                          | OAuth/banco não configurados                          | Configurar variáveis; o botão volta a aparecer         |

## Decisão de entrega

A loja está **tecnicamente pronta e verificada** para que o titular publique produtos. Ela não é
apresentada como loja que vende: nenhum produto, preço, estoque, avaliação, testemunho, medida,
prazo ou selo foi fabricado, e cada ausência tem um estado explícito na interface.
