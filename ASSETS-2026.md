# Assets visuais — Arte Que Veste 2026

## Regra de origem

Todo asset usado pela loja está **dentro do repositório**, em `client/public/`, e foi gerado para
este projeto. Não há dependência de storage externo, de CDN de terceiro nem de arquivo que não
esteja versionado. Nenhum asset de loja de referência foi copiado.

| Arquivo                                               | Uso na loja                                               | Origem                                                                                     | Licença de uso                       |
| ----------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ |
| `client/public/campaign/aqv-2026-campaign-hero.jpg`   | Hero da Home, bloco de campanha, card social (`og:image`) | Imagem gerada para a campanha 2026 com a paleta da marca (papel/tinta/cinábrio/azul polvo) | Projeto Arte Que Veste (uso próprio) |
| `client/public/campaign/aqv-2026-material-detail.jpg` | Bloco "Detalhe de matéria" da Home                        | Estudo macro de trama de tecido, gerado para o projeto                                     | Projeto Arte Que Veste (uso próprio) |

As imagens são **campanha conceitual de marca** (tecido, forma, matéria) e não devem ser lidas como
foto de produto, estoque ou catálogo. A vitrine diferencia os dois estados:

- imagens de campanha → apenas em blocos de marca (hero e campanha);
- imagem de peça → somente `product.images` vindo do Shopify, com `alt` real ou o estado
  "Imagem em preparação" quando o titular ainda não subiu foto.

## Imagens que **não** são usadas (e por quê)

| Item                                                      | Motivo                                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Imagem extraída do PDF editorial (rodada anterior)        | Não é foto da peça nem asset de vitrine; foi removida da loja em rodada anterior e não voltou                |
| Banco de imagens externo pesquisado em rodadas anteriores | Página individual e licença não verificáveis → fora do front                                                 |
| Texturas geradas que falharam                             | Substituídas por texturas CSS determinísticas (`aqv-texture-cut`, gradientes) em vez de placeholder quebrado |

## Tipografia

Fontes são self-hosted via `@fontsource` (`@fontsource/dm-serif-display`,
`@fontsource-variable/manrope`), importadas em `client/src/index.css` e empacotadas no build. Não há
requisição a `fonts.googleapis.com` em nenhum momento — o que também remove o envio de IP a
terceiros antes de qualquer consentimento (LGPD) e simplifica a CSP.

## Padrões e componentes

Os elementos gráficos (granulado SVG inline no `body::before`, molduras de corte, linhas de
registro, trama diagonal, molduras com sombra deslocada) são CSS próprio. Os componentes Radix
remanescentes (`tooltip`, `sonner`) são bibliotecas MIT; os demais primitivos de UI do template
foram removidos na auditoria por não estarem em uso — para reintroduzir um, use `components.json`
com a CLI do shadcn, que já aponta para `client/src/index.css` e os aliases do projeto.
