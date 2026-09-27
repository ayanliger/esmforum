# Histórias de Usuário

As três histórias abaixo detalham as funcionalidades de maior prioridade do quadro Kanban (issues #1, #2 e #3 do fork). Perfil de usuário e notificação ficaram de fora desta etapa porque dependem de identificação de usuários, que o sistema ainda não tem (ver `PROCESSO.md`).

O ESM Forum atual não tem login: toda pergunta é gravada com `id_usuario = 1`. Nas histórias, "usuário" é quem usa o fórum pelo navegador. Enquanto não houver autenticação, o frontend envia um `id_usuario` fixo nas requisições, do mesmo modo que o cadastro de perguntas já faz.

## História 1: Votação em perguntas

**Como** usuário do fórum,
**eu quero** votar a favor ou contra uma pergunta,
**para** que as perguntas mais úteis fiquem em destaque para toda a comunidade.

**Critérios de Aceitação:**

- [ ] Cada linha da tabela de perguntas exibe o placar da pergunta (soma dos votos, podendo ser negativo) e dois botões: voto positivo e voto negativo.
- [ ] O voto positivo soma 1 ao placar e o negativo subtrai 1, e o placar atualizado aparece na mesma linha sem recarregar a página.
- [ ] Cada usuário tem no máximo um voto por pergunta: clicar de novo no mesmo botão cancela o voto, e clicar no botão oposto troca o voto (o placar varia 2 pontos).
- [ ] Ao carregar a página principal, as perguntas aparecem ordenadas pelo placar, do maior para o menor; em caso de empate, pela ordem de cadastro.
- [ ] Um voto em pergunta inexistente ou com valor diferente de +1 e -1 é recusado pela API com status 404 ou 400 e uma mensagem de erro, sem alterar nenhum placar.

## História 2: Busca por palavra-chave

**Como** usuário do fórum,
**eu quero** buscar perguntas por uma palavra-chave,
**para** descobrir se a minha dúvida já foi perguntada e respondida antes de publicar uma pergunta repetida.

**Critérios de Aceitação:**

- [ ] A página principal tem um campo de busca acima da tabela; ao enviar um termo, a tabela passa a exibir apenas as perguntas cujo texto contém esse termo.
- [ ] A busca não diferencia maiúsculas de minúsculas ("Python", "python" e "PYTHON" trazem o mesmo resultado).
- [ ] Espaços no início e no fim do termo são ignorados, e um termo vazio volta a exibir a lista completa.
- [ ] Quando nenhuma pergunta contém o termo, a página exibe a mensagem "Nenhuma pergunta encontrada para" seguida do termo, no lugar da tabela vazia.
- [ ] O número de respostas e o placar de votos continuam aparecendo nas perguntas encontradas.

## História 3: Categorização com tags

**Como** autor de uma pergunta,
**eu quero** classificar minha pergunta com tags de assunto,
**para** que ela seja encontrada por quem se interessa por aquele assunto.

**Critérios de Aceitação:**

- [ ] Ao cadastrar uma pergunta, é possível marcar de uma a três tags de uma lista fixa: tecnologia, carreira, dúvidas-gerais, banco-de-dados e testes.
- [ ] Uma pergunta cadastrada sem tag recebe automaticamente a tag dúvidas-gerais, e as perguntas que já existiam antes da funcionalidade também.
- [ ] As tags aparecem ao lado do texto da pergunta na tabela da página principal e na página de respostas.
- [ ] Clicar em uma tag filtra a tabela para mostrar só as perguntas com aquela tag, com a opção de remover o filtro.
- [ ] O usuário não cria tags novas pela interface, o que evita variações da mesma tag (como "carreira" e "Carreira").

## Priorização

Ordem de prioridade, simulando a decisão do Product Owner:

1. Votação em perguntas
2. Busca por palavra-chave
3. Categorização com tags

A votação vem primeiro porque é a funcionalidade que transforma a lista de mensagens em um fórum de perguntas e respostas: a comunidade passa a indicar o que é útil, e essa indicação ordena a página principal para todos os usuários, em todas as visitas. Ela também tem o menor esforço das três (uma tabela, uma rota e dois botões) e não depende de nenhuma outra.

A busca vem em segundo lugar. O benefício dela é evitar perguntas repetidas, e esse benefício cresce com o tamanho do fórum. Com poucas dezenas de perguntas, a lista cabe em uma tela e a busca ajuda menos do que a votação. O esforço também é baixo (uma consulta com `LIKE` e um campo de texto).

As tags ficam por último porque exigem mais trabalho (tabela de tags, relação muitos-para-muitos com perguntas, seleção na interface e migração das perguntas antigas) e porque boa parte do valor delas aparece junto com a busca: filtrar por tag é uma forma de busca. Implementadas depois da busca, reaproveitam a tela de resultados já pronta.
