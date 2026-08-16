# Perfil PVC-U aplicado à Arte Que Veste

## Objetivo

A Arte Que Veste usa um perfil proporcional do PVC-U Ω-Max. O objetivo é validar dados, proteger acessos, versionar o cliente, rastrear solicitações e explicar falhas sem transformar uma loja simples em uma plataforma de engenharia excessiva.

## Esferas aplicadas

| Esfera | Aplicação na loja |
|---|---|
| 1 — Estrutural | Schemas Zod para entradas comerciais e envelope de validação |
| 2 — Semântica | Validação de título, preço, disponibilidade e transições de interface |
| 3 — Estado | Estados idle, loading, success e error com transições permitidas |
| 4 — Segurança | Sanitização de texto, autenticação existente, CSP, clickjacking e limite básico de requisições |
| 5 — Protocolo | `X-Client-Version`, `Accept-Version`, `X-Trace-Id` e `X-PVCU-Version` |
| 6 — Integridade | HTTPS do ambiente, IDs de validação e proibição de credenciais no pacote |
| 7 — Privacidade | Consentimento mínimo no cliente e analytics não essencial desativado por padrão |

## Validation Envelope

Cada validação interna pode produzir um envelope com `validationStatus`, `validationId`, `traceId`, `profile`, `version`, `codes` e `timestamp`. Isso permite identificar o que foi validado sem registrar dados pessoais desnecessários.

## Códigos adotados

`PVC-1xx` identifica falhas estruturais; `PVC-2xx`, regras de negócio; `PVC-3xx`, transições de estado; `PVC-4xx`, segurança ou excesso de requisições; `PVC-5xx`, incompatibilidade de versão; `PVC-6xx`, integridade ou autenticação; e `PVC-7xx`, privacidade e consentimento.

## O que não foi aplicado

Criptografia homomórfica, QKD, simulação multiversal, limite de Landauer, reescrita de axiomas, MLOps e integração com LLM não fazem parte da loja porque não há necessidade comercial ou técnica para eles. Aplicá-los criaria custo, dependências e manutenção sem benefício proporcional.

## Limitações honestas

O limite básico de requisições em memória protege o ambiente atual, mas não substitui um rate limiter distribuído em escala. O CSP é compatível com o runtime atual e deve ser revisado se novos provedores externos forem adicionados. Pagamento, frete e dados fiscais continuam sujeitos às contas e autorizações do titular.


## Integração efetiva no runtime

O perfil PVC-U está integrado ao middleware base do tRPC. Cada procedimento público, protegido ou administrativo gera um `X-Validation-Envelope` no response quando existe resposta HTTP, preservando o payload de negócio para não quebrar a vitrine. O envelope registra `traceId`, status, versão, perfil, horário e códigos.

Os endpoints comerciais aplicam sanitização e limites aos identificadores de produto, coleção e linhas do carrinho. O cliente transmite `X-Client-Version`, `Accept-Version`, `X-Trace-Id` e `X-Consent` em cada chamada tRPC.

Os testes executados incluem quatro testes do perfil PVC-U e cinco testes de comércio, totalizando nove testes aprovados.
