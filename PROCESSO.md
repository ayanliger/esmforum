# Processo de desenvolvimento: Kanban

Quadro no GitHub Projects: https://github.com/users/ayanliger/projects/3

## 1. Processo escolhido

O desenvolvimento das extensões do ESM Forum segue o Kanban. O Kanban não prescreve papéis nem eventos: organiza o trabalho em um quadro com as etapas do fluxo, limita quantos itens podem estar em cada etapa ao mesmo tempo (limite de WIP, work in progress) e faz o trabalho ser puxado pela etapa seguinte quando ela tem capacidade livre, em vez de empurrado pela anterior. Não há sprints de duração fixa. Um item começa quando há espaço na etapa e termina quando cumpre a política da última coluna, e o planejamento acontece de forma contínua, reordenando o backlog sempre que chega uma demanda nova.

As características que pesaram na escolha foram as seguintes.

- Equipe de uma pessoa. O Scrum define três papéis (Product Owner, Scrum Master e desenvolvedores) e quatro eventos (planejamento, daily, revisão e retrospectiva). Com um único desenvolvedor, os três papéis recaem sobre a mesma pessoa, e a daily vira uma conversa consigo mesmo. O Kanban não depende de papéis, então nada no processo fica sem sentido.
- Trabalho heterogêneo e sequencial. O projeto mistura documentação (processo, histórias, diagramas UML, análises), uma implementação de código e propostas de padrões e arquitetura. Esses itens têm tamanhos muito diferentes e não se encaixam bem em sprints de mesma duração com estimativa em story points. No Kanban cada item atravessa o fluxo no seu próprio ritmo.
- Demanda que chega em etapas. O cliente e a disciplina liberam as tarefas em três partes, com prazos nas semanas 3, 6 e 9. No Kanban esses prazos funcionam como datas de entrega sobre um fluxo contínuo, e as tarefas novas entram no backlog sem precisar esperar o fim de uma sprint.
- Risco principal de quem trabalha sozinho. Sem uma equipe cobrando o término, o risco é começar várias funcionalidades e não terminar nenhuma. O limite de WIP ataca diretamente esse problema: com a coluna de implementação cheia, só se puxa um item novo quando outro sai dela.

O Scrum seria a escolha adequada com uma equipe de quatro ou cinco pessoas e um cliente disponível para revisar incrementos a cada duas semanas, porque aí os eventos sincronizam pessoas diferentes. Aqui não há o que sincronizar.

Do XP aproveitam-se as práticas de engenharia, independentes do processo de gestão: design simples (documentado em `DESIGN_SIMPLES.md`), testes automatizados com Jest para o código novo, commits pequenos e frequentes e revisão antes de concluir cada item. A programação em pares está planejada em `PAIR_PROGRAMMING.md`.

## 2. Estrutura do quadro

As colunas seguem as etapas do quadro Kanban descrito no capítulo 2 do livro Engenharia de Software Moderna. Cada coluna tem uma política explícita: um item só passa para a coluna seguinte quando cumpre a política da coluna em que está.

| Coluna | Limite de WIP | Política para sair da coluna |
|--------|---------------|------------------------------|
| Backlog | sem limite | Item priorizado e com descrição suficiente para ser especificado. |
| Especificação | 2 | História de usuário escrita, critérios de aceitação definidos e, se for o caso, diagramas UML feitos. |
| Implementação | 1 | Código escrito, testes automatizados passando e documentação atualizada. |
| Revisão | 1 | Diff revisado com a lista de verificação abaixo e critérios de aceitação conferidos no sistema rodando. |
| Concluído | sem limite | Commit integrado à branch `main` do fork. |

O limite 1 em Implementação e em Revisão corresponde a uma pessoa trabalhando: ter dois itens sendo implementados ao mesmo tempo significa alternar de contexto, não ganhar produtividade. Especificação aceita 2 para que, enquanto um item está sendo implementado, o próximo já possa ser detalhado.

A lista de verificação da coluna Revisão, usada no lugar da revisão feita por um colega:

- os critérios de aceitação da história foram conferidos um a um no sistema rodando;
- `npm test` passa sem falhas;
- não há código comentado, `console.log` de depuração nem arquivo alterado sem relação com o item;
- mensagens de erro e textos da interface estão em português.

## 3. Cards e priorização

O quadro começa com cinco cards, um por funcionalidade pedida pelo cliente, ordenados na coluna Backlog do mais prioritário para o menos prioritário. Cada card é uma issue do fork do backend (#1 a #5), e o quadro tem um campo numérico Prioridade preenchido de 1 a 5, além da ordem na coluna. A prioridade combina três critérios: valor para quem usa o fórum, esforço estimado e dependência de outras funcionalidades.

| Prioridade | Card | Valor | Esforço | Depende de |
|------------|------|-------|---------|------------|
| 1 | Sistema de votação em perguntas (upvote/downvote) | Alto | Baixo | nada |
| 2 | Busca de perguntas por palavra-chave | Alto | Baixo | nada |
| 3 | Categorização de perguntas com tags | Médio | Médio | nada (aumenta o valor da busca) |
| 4 | Perfil de usuário com histórico de perguntas e respostas | Médio | Alto | identificação de usuários |
| 5 | Notificação de novas respostas às suas perguntas | Médio | Alto | perfil de usuário |

A votação vem primeiro porque é o que diferencia um fórum de perguntas e respostas de uma lista de mensagens: é a comunidade que indica quais perguntas são úteis, e esse sinal passa a ordenar a lista da página principal. O esforço é baixo (uma tabela de votos, duas rotas e dois botões) e não depende de nada que ainda não exista. Enquanto não houver autenticação, o voto é associado ao `id_usuario` enviado na requisição, do mesmo modo que o cadastro de pergunta já grava `id_usuario = 1`.

A busca por palavra-chave vem em seguida. O valor cresce com o número de perguntas cadastradas, e o esforço é uma consulta com `LIKE` e um campo de texto no frontend. Ela fica atrás da votação porque, com o volume atual de perguntas, a lista inteira ainda cabe em uma tela.

A categorização por tags exige uma relação muitos-para-muitos entre perguntas e tags e uma forma de escolher tags na interface, o que dá mais trabalho do que a busca. Feita depois da busca, a categorização permite estender a busca com um filtro por tag sem retrabalho.

O perfil de usuário e a notificação ficam por último porque dependem de algo que o sistema ainda não tem: saber quem é o usuário. O perfil exige uma tabela de usuários e algum tipo de identificação. A notificação exige, além disso, saber quem é o autor de cada pergunta e ter um canal de envio. Implementá-las antes das três primeiras atrasaria as funcionalidades de maior valor para construir infraestrutura.

## 4. Uso do quadro ao longo do projeto

As tarefas da disciplina (documentos das partes 1, 2 e 3) também entram no quadro como cards, com a mesma política de colunas, para que o limite de WIP valha para todo o trabalho e não só para o código. O backlog é reordenado sempre que uma nova parte do projeto é liberada, e a issue de cada funcionalidade concluída recebe um comentário com os commits que a implementaram.
