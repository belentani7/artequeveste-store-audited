# Segurança — Arte Que Veste

> **Documento histórico?** Não. Este é um documento vivo; o estado atual da loja está em
> [`RELATORIO-AUDITORIA-2026.md`](./RELATORIO-AUDITORIA-2026.md).

## Reportar uma vulnerabilidade

Não abra issue pública. Use o canal privado de segurança do GitHub (aba **Security** deste
repositório) ou o contato indicado no checkout/atendimento da loja. Descreva o cenário, o impacto e
um passo a passo de reprodução; responda com um meio de contato para retorno.

## Modelo de ameaça desta aplicação

A loja é **pública por natureza**: não há login obrigatório, não armazena dados de pagamento e não
processa cartão. O que precisa ser protegido é (1) o token da Storefront API do titular, (2) a
integridade do catálogo exibido e (3) a disponibilidade do serviço.

### O que a aplicação faz

| Controle             | Onde                                                             | Detalhe                                                                                                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSP                  | `server/_core/security.ts`                                       | Produção: `script-src 'self'` (sem inline), `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `upgrade-insecure-requests`. Desenvolvimento: perfil permissivo apenas para o preview em iframe                                |
| Headers              | `server/_core/index.ts`                                          | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (câmera/microfone/geolocalização negados), `Cross-Origin-Opener-Policy: same-origin`, HSTS e `X-Frame-Options: DENY` em produção |
| Rate limit           | `server/_core/security.ts`                                       | 120 requisições/minuto por IP em `/api/*`, com poda de memória e teto de chaves; `Retry-After` e `X-RateLimit-*` na resposta                                                                                                                 |
| Tamanho de corpo     | `server/_core/index.ts`                                          | `express.json`/`urlencoded` limitados a 512 KB (a loja não recebe upload)                                                                                                                                                                    |
| Validação de entrada | `server/routers/commerce.ts`                                     | zod em todos os procedimentos; IDs/handles saneados; o termo de busca tem operadores do Shopify (`: * ( ) " - ...`) removidos antes de chegar ao `query`                                                                                     |
| Gate de versão       | `server/_core/index.ts`                                          | `X-Client-Version` divergente → `426` com envelope PVC-U (evita telemetria/mutações de cliente antigo)                                                                                                                                       |
| Token                | `server/_core/shopify.ts`                                        | Storefront token lido de variável de ambiente, usado apenas no servidor; o cliente nunca o vê (não existe `VITE_SHOPIFY_*`)                                                                                                                  |
| Erros                | `server/_core/shopify.ts`, `client/src/contexts/CartContext.tsx` | Erro técnico fica no log do servidor; o cliente recebe mensagem em pt-BR sem detalhe interno                                                                                                                                                 |

### O que a aplicação **não** faz (por decisão)

- Não usa o token de Admin do Shopify: nenhuma escrita no catálogo pela aplicação.
- Não guarda dados de cartão, CPF ou endereço: isso acontece no checkout do Shopify.
- Não cria endpoint de upload, de arquivos ou de proxy de storage.
- Não roda webhook próprio de pedido: notificações de pedido pertencem ao Shopify/apps oficiais.
- Não coleta analytics antes do consentimento explícito (LGPD).

### Segredos

- Nunca comite `.env`. O `.env.example` lista apenas nomes de variáveis.
- `JWT_SECRET`, `DATABASE_URL` e credenciais OAuth só são necessárias se o login de cliente for
  ativado; sem elas o botão "Entrar" não é exibido e nada mais muda.
- Rotação: se um token de Storefront vazar, revogue-o no app do Shopify e gere outro — com
  `SHOPIFY_STORE_DOMAIN` + token você tem acesso de leitura ao catálogo e escrita apenas de carrinho.

## Dependências

A auditoria removeu ~42 dependências de template sem uso (incluindo SDKs de S3, formulários e
bibliotecas de gráficos) e depois atualizou tudo o que tinha aviso aberto: `pnpm audit` passou de
**92 avisos (5 críticos)** para **"No known vulnerabilities found"**. As correções vieram de upgrade
das dependências diretas (Vite 7.3.7, Vitest 4.1.11, tRPC 11.19, axios 1.20, Express 4.22.3, mysql2
3.24.5, drizzle-orm 0.45.4, nanoid 5.1.16, React 19.3) e de `pnpm.overrides` prendendo as
transitivas (tar, rollup, postcss, qs, path-to-regexp, proxy-addr, body-parser, picomatch,
source-map-js, browserslist, follow-redirects, form-data, @babel/core, esbuild) em versões corrigidas.
Um patch aplicado pelo template ao `wouter` — que publicava todas as rotas da aplicação em
`window.__WOUTER_ROUTES__` — foi removido junto com a pasta `patches/`.

O CI instala com `--frozen-lockfile` e roda `check`, `test`, `build` e um smoke do servidor de
produção. Antes de cada entrega rode `pnpm audit`; antes de adicionar uma dependência: verifique
licença, manutenção e se ela não pode ser substituída por código do projeto (a loja hoje tem 25
dependências de runtime e 19 de desenvolvimento).
