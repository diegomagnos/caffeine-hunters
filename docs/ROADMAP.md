# Roadmap incremental

## Status e limites

Este é um plano proposto de entregas, sem datas ou autorização automática para implementação. As [21 decisões aprovadas](BUSINESS_RULES.md#as-21-decisões-aprovadas) definem a visão funcional; o sequenciamento não remove requisitos das fases posteriores. Cada tarefa exige escopo aprovado, branch própria e Pull Request com revisão humana. Não realizar merge automático.

A etapa atual é exclusivamente documental. Não instalar dependências, gerar aplicação, criar banco ou configurar infraestrutura nesta consolidação. Preservar Next.js, React, TypeScript, Tailwind CSS, PostgreSQL e evolução PWA como stack sugerida, com detalhes técnicos sujeitos a revisão.

## Fundação e MVP proposto

| Etapa | Entrega planejada | Critério para revisão e conclusão |
| --- | --- | --- |
| 0 — Consolidação atual | README, produto, 21 regras aprovadas, arquitetura e roadmap consistentes | Decisões, propostas e pendências separadas; revisão de conteúdo/links/diff; nenhuma implementação |
| 1 — Fundação e autenticação | Aprovar arquitetura, versões, solução de autenticação, acesso a dados; base técnica, configuração e CI | Instalação reproduzível com lockfile, build/tipos/checks iniciais reais; ambientes documentados e nenhum segredo no Git |
| 2 — Grupos privados e permissões | Criador original, vários administradores, promoção, regras auditadas, ingresso e saída com decisão sobre obrigações (1–4) | Mecanismo de ingresso e permissões restantes definidos; testes de isolamento, vigência, entrada elegível apenas no próximo ciclo e saída sem bloquear por pendência |
| 3 — Ciclos, contribuições e cadastro manual | Regras versionadas, obrigações, prazos e contribuições independentes; nome/marca/quantidade obrigatórios e atributos opcionais (11–12 no recorte manual) | Definir calendário/fuso, entrega, exceções e cumprimento da obrigação; testar integridade, histórico e contribuições distintas mesmo com café repetido; sem exigir catálogo global para registrar manualmente |
| 4 — Avaliações e médias internas | Cinco características e nota geral direta de 1 a 5 estrelas; bloqueio de visibilidade, edição auditada, avaliação própria, encerramento automático e registro de ausências (5–10) | Aprovar escala/obrigatoriedade sensorial, precisão e validade restante; testes de cálculo, autorização no servidor, concorrência com prazo e Sem avaliações; ausência sem zero ou penalidade automática |
| 5 — Política de inadimplência e regularização | Aplicar penalidades por contribuição conforme regras aprovadas e liberar após regularização; eventual ranking privado no recorte aprovado | Definir gatilhos, tolerância, autoridade, recursos e alcance; testar bloqueio no servidor e preservação de notas anteriores; definir ranking privado antes de entregá-lo |

O núcleo priorizado está nas etapas 1–4. A etapa 5 poderá ser entregue junto à 4; **não liberar avaliações para usuários reais sem validar a política de penalidades aplicável**, conforme o planejamento anterior. Não tratar pendência de critérios como autorização para inventá-los.

## Fases posteriores — visão completa preservada

| Etapa | Entrega planejada | Dependências e critérios |
| --- | --- | --- |
| 6 — Catálogo compartilhado e vínculos | Produto global separado de Contribuição privada; busca inicial, detecção de duplicatas e vinculação híbrida com correção auditada (11–13) | Aprovar identidade de versões/lotes/torras, critérios de correspondência exata e fluxo de publicação de novos Produtos; testar confirmação de ambiguidades e independência das avaliações; propor migração de registros manuais sem mesclar contribuições |
| 7 — Assistência por IA e pesquisa externa | Foto opcional, leitura da embalagem, pesquisa na internet, sugestões com incertezas/fontes, imagem com direitos de uso e confirmação humana (12) | Aprovar fornecedores, custos, limites e tratamento das imagens; testes de falha, abuso, consumo e idempotência; cadastro manual funciona sem IA |
| 8 — Correções colaborativas e moderação global | Sugestões de qualquer usuário autenticado, validação antes de publicar, justificativa/fontes/histórico e moderadores geridos pela administração da plataforma (14–15) | Aprovar validação/contestação e permissões restantes; testar correções não validadas e moderador sem acesso a grupo privado; alterações globais das fases 6–7 não dispensam validação e esta capacidade pode ser antecipada em entrega conjunta |
| 9 — Médias globais autorizadas | Opção desativada por padrão, autorização/revogação por administradores do grupo, agregação com peso igual por avaliação e repetições válidas (16–18) | Definir campos, escopo temporal, proteção contra inferência e interação com visibilidade; testes de média por avaliação, revisões sem duplicação, revogação, cache e trabalhos concorrentes; sem notas individuais ou identidades públicas |
| 10 — Rankings estatísticos completos | Fórmula bayesiana, média real/contagem/pontuação distintas, `m` dinâmico, ranking geral, filtros, categorias, popularidade e mais avaliados (19–21) | Aprovar fórmula operacional de `m`, referência `C`, limites e periodicidade, recortes, desempates, inclusão e métrica de popularidade; testar recálculo, estabilidade e autorizações em todos os rankings; pode ser subdividida sem inventar popularidade |
| 11 — PWA e preparação operacional | Manifesto, instalação compatível, política de cache e revisão operacional | HTTPS/PWA e acessibilidade verificados; nenhum cache privado indevido; backups/restauração e observabilidade testados; pode acompanhar entregas anteriores sem habilitar escrita offline automaticamente |

Responsividade, segurança, autorização, acessibilidade, auditoria e testes acompanham todas as etapas. O catálogo não autoriza exposição de grupos. A entrega pública depende das salvaguardas da etapa 9, mesmo se os cálculos de ranking forem desenvolvidos antes. As fases de catálogo, IA e moderação podem ser repartidas ou agrupadas após revisão, sem publicar correções não validadas.

## Decisões necessárias por dependência

- Antes da fundação: autenticação, versões, acesso a dados, ambiente, hospedagem e escopo técnico.
- Antes dos grupos: convites/aprovação, remoção de administradores, transferência de titularidade, permissões restantes, retenção/exclusão e dados pessoais.
- Antes dos ciclos e avaliações: calendário, entrega, validade, características sensoriais, precisão e política aplicável de inadimplência; encerramento automático e participação no próximo ciclo já estão aprovados.
- Antes do catálogo: identidade de Produtos, exatidão dos vínculos, duplicatas, novos cadastros e correções.
- Antes da IA: custos, fornecedores, orçamento/cotas, fontes e licenças, privacidade e tratamento de falhas.
- Antes da moderação: fluxo exato de validação, contestação e conflitos de interesse.
- Antes da publicação: dados permitidos, recortes temporais, inferência, interação com avaliação prévia e revogação consistente.
- Antes dos rankings completos: `C`, `m` operacional, estabilidade/frequência, elegibilidade, desempates e popularidade.

As pendências estão detalhadas em [Produto](PRODUCT.md#questões-abertas), [Regras de negócio](BUSINESS_RULES.md#questões-abertas-e-impacto) e [Arquitetura](ARCHITECTURE.md#decisões-pendentes). Nenhum valor de `m`, periodicidade ou métrica ilustrativa deve ser promovido a decisão sem aprovação.

## Fora do compromisso inicial

Pagamentos, logística, rede social aberta, recomendações de cafés por IA, notificações push e escrita offline/sincronização exigem análise e aprovação próprias. A assistência por IA ao cadastro está aprovada na visão completa e planejada na etapa 7; não se confunde com recomendações.

## Evidência por Pull Request

Apresentar problema, escopo, arquivos alterados, decisões e pendências, validações reais e limitações. Mudanças documentais exigem revisão de conteúdo, links e diff; software futuro exige verificações proporcionais, conforme [Arquitetura](ARCHITECTURE.md#plano-de-testes-para-implementação-futura). Aguardar revisão e integração exclusivamente humanas.
