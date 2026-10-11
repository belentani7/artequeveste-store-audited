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

## Bundle final (gzip entre parênteses)

| Arquivo                                               | Tamanho                                          |
| ----------------------------------------------------- | ------------------------------------------------ |
| `index.html`                                          | 2,48 kB (1,04 kB)                                |
| `index-*.js` (app)                                    | 47,92 kB (14,59 kB)                              |
| `react-*.js`                                          | 194,27 kB (60,74 kB)                             |
| `vendor-*.js`                                         | 139,21 kB (42,03 kB)                             |
| `data-*.js` (tRPC/query/superjson)                    | 96,77 kB (26,67 kB)                              |
| `gsap-*.js` (carregado sob demanda)                   | 70,55 kB (27,84 kB)                              |
| `radix-*.js`                                          | 19,84 kB (7,22 kB)                               |
| `icons-*.js`                                          | 8,30 kB (2,03 kB)                                |
| Rotas lazy: PDP / categoria / busca / políticas / 404 | 13,3 / 7,4 / 5,4 / 4,5 / 3,2 kB                  |
| `index-*.css`                                         | 41,99 kB (11,73 kB)                              |
| Fontes                                                | woff2 latin (DM Serif 24,7 kB + Manrope 24,8 kB) |

A Home carrega react + vendor + data + icons + radix ≈ **139 kB gzip**; PDP, busca, categoria e
políticas só baixam quando visitadas, e o GSAP só quando há animação permitida.

## O que foi validado funcionalmente (sem catálogo real)

- Estado de lançamento (catálogo vazio) e estado de erro de catálogo, ambos com marca e caminho de recuperação.
- Filtro de categoria, ordenação, paginação por "ver mais" (cursor do backend).
- Busca com termo vazio, com resultados e sem resultados (incluindo o caso "loja não conectada").
- 404 de rota e rota de categoria inexistente.
- Carrinho: criar/add/atualizar/remover/erro, fila de escrita, foco preso, Escape, clique fora, `inert`.
- Consentimento: nenhum script antes do opt-in, persistência versionada, revogação por storage.
- SEO: title/description/canonical/robots e JSON-LD idempotentes por rota.

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
