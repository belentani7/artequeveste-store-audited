# Como contribuir

## Fluxo

1. Crie uma branch com prefixo `feat/`, `fix/`, `docs/` ou `chore/`.
2. Commits pequenos e com mensagem no imperativo (`fix: corrige cache do HTML`).
3. Abra um Pull Request descrevendo **o que muda, por que e como foi verificado**.
4. O PR só está pronto quando `pnpm verify` passa localmente (é o mesmo gate do CI).

## Antes de abrir o PR

```bash
pnpm verify        # check + test + build
pnpm format        # prettier
```

Se a mudança toca a loja visualmente, rode também o smoke de navegador com o servidor ligado:

```bash
pnpm dev                       # em outro terminal
pnpm validate:routes           # requires playwright chromium installed
```

## Regras do projeto (não negociáveis)

1. **Nenhum dado inventado no front.** Produto, preço, desconto, estoque, tamanho, medida, prazo,
   frete, avaliação ou selo só aparecem se vierem do Shopify/metafields do titular. Quando falta,
   a interface diz o que falta.
2. **Um único seam de commerce**: apenas `server/_core/shopify*.ts` conhece formas do Shopify.
   Qualquer `edges`/`node` ou `gid://` no frontend é bug — há teste que falha se vazar.
3. **Todas as rotas passam pelo `StorefrontLayout`.** Não duplique cabeçalho, carrinho, consentimento
   ou rodapé em páginas.
4. **Um controle sem destino não entra.** Botão que não faz nada, link para âncora inexistente ou
   busca decorativa são defeitos, não placeholders.
5. **Texto em pt-BR, tom direto, sem promessa jurídica.** Políticas descrevem processo; prazos e
   dados legais são do checkout/titular.
6. **Acessibilidade mínima**: controle com `aria-label`/`aria-pressed` quando o rótulo não é óbvio,
   foco visível, diálogo com `aria-modal` + foco preso + `Escape`, imagens com `alt` real (ou
   `aria-hidden` quando decorativas) e animação respeitando `prefers-reduced-motion`.
7. **Segurança por padrão**: nada de inline script novo (a CSP de produção não permite), nenhuma
   chave em código, validação zod em toda entrada de procedimento.
8. **Performance**: rota nova entra por `lazy()`; dependência nova precisa de justificativa no PR
   (o projeto hoje tem 25 dependências de runtime — manter assim é parte do design).

## Reportar problemas

Um relato útil traz: passos para reproduzir, ambiente (navegador/região), comportamento esperado e
observado, e a linha de log ou o `X-Trace-Id` da resposta, quando houver.
