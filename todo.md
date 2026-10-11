# Arte Que Veste — pendências e histórico

O estado atual da loja, com evidência de verificação, está em
[`RELATORIO-AUDITORIA-2026.md`](./RELATORIO-AUDITORIA-2026.md).

## Aberto (depende do titular)

- [ ] Publicar o primeiro produto no Shopify com foto, preço, variante de tamanho e estoque.
- [ ] Configurar `SHOPIFY_STORE_DOMAIN` e `SHOPIFY_STOREFRONT_API_ACCESS_TOKEN` no ambiente de produção.
- [ ] Ativar pagamento (PIX/cartão) e frete no Shopify e concluir uma compra de teste.
- [ ] Cadastrar dados fiscais (CNPJ/razão social), endereço de expedição em Recife/PE e canal de atendimento.
- [ ] Cadastrar metafields `aqv.*` (tabela de medidas, composição, cuidados) das peças.
- [ ] Criar coleções `camisetas`, `quimonos`, `bolsas`, `acessorios` (opcional: define a curadoria por categoria).
- [ ] Substituir os assets de campanha por fotografia real das peças quando houver ensaio.
- [ ] Se login de cliente for desejado: configurar OAuth + banco e revalidar o botão "Entrar".

## Concluído

Ver [`RELATORIO-AUDITORIA-2026.md`](./RELATORIO-AUDITORIA-2026.md) para a auditoria completa desta
rodada (bloqueios de produção corrigidos, páginas novas, dependências e arquivos mortos removidos,
testes e verificação). As rodadas anteriores — reconstrução visual, entrega editorial, manual,
perfil PVC-U e validações de preview — continuam registradas em `STATUS-*.md`,
`FRONTEND-REFINEMENT-2026.md`, `AUDITORIA-10X10.md` e `manual-arte-que-veste-2026.md`.
