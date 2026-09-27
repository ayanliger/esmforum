# Planejamento de Pair Programming

O projeto é individual. Este documento descreve como a programação em pares seria aplicada ao desenvolvimento das extensões do ESM Forum se houvesse um par, e registra no final o que foi feito no lugar dela.

Na programação em pares, duas pessoas trabalham no mesmo código ao mesmo tempo. O driver controla o teclado e escreve o código. O navigator acompanha cada linha, pensa no próximo passo, aponta erros e confere se o que está sendo escrito atende aos critérios de aceitação. Os papéis são trocados com frequência para que as duas pessoas conheçam todo o código e nenhuma fique só observando.

## 1. Estratégia

### 1.1 O que é feito em par

Nem todo card do quadro precisa de pareamento. O critério é o risco: faz-se em par o trabalho em que um erro custa caro ou em que uma decisão de design afeta outras funcionalidades.

| Trabalho | Em par | Motivo |
|----------|--------|--------|
| Implementação da votação (tabela, modelo, rotas, testes) | Sim | Primeira mudança no esquema do banco e primeira funcionalidade nova; as decisões aqui viram o modelo para as seguintes. |
| Busca e tags, se implementadas | Sim | Alteram consultas usadas pela página principal. |
| Diagramas de sequência e de classes | Sim, em sessão curta | Os diagramas definem a interface entre frontend e backend. |
| Histórias de usuário e caso de uso | Não, com revisão do par depois | Texto se revisa bem de forma assíncrona. |
| Ajustes visuais no React | Não | Baixo risco e fácil de verificar no navegador. |

### 1.2 Formato das sessões

Cada sessão dura cerca de 2 horas, divididas em blocos de 25 minutos com 5 minutos de pausa entre eles (técnica Pomodoro). Os blocos servem também para a troca de papéis.

1. Início (10 minutos): os dois leem o card no quadro Kanban, relembram os critérios de aceitação e combinam qual parte será feita na sessão.
2. Blocos de trabalho: desenvolvimento em ping-pong com testes, descrito abaixo.
3. Fim (10 minutos): `npm test`, commit do que foi concluído, atualização do card no quadro e anotação do ponto de parada para a próxima sessão.

### 1.3 Rotação de papéis

A rotação segue o ping-pong, que combina pareamento com desenvolvimento orientado a testes:

1. A pessoa A (driver) escreve um teste Jest que falha. B é navigator.
2. B assume o teclado e escreve o código mínimo que faz o teste passar. A passa a ser navigator.
3. B escreve o próximo teste que falha, e o ciclo continua com os papéis invertidos.

Se um ciclo se estender (um teste difícil de fazer passar), a troca acontece de qualquer forma ao fim do bloco de 25 minutos, para que ninguém fique mais de meia hora sem digitar ou sem revisar. As sessões se alternam também no início: quem começou como driver em uma sessão começa como navigator na seguinte.

Exemplo de sequência para a votação:

| Ciclo | Driver | Teste escrito | Código que o faz passar |
|-------|--------|---------------|-------------------------|
| 1 | A | votar positivo em uma pergunta soma 1 ao placar | tabela `votos` e função `votar` |
| 2 | B | votar negativo subtrai 1 | tratamento do valor -1 |
| 3 | A | o mesmo usuário votando duas vezes igual não altera o placar | verificação de voto existente |
| 4 | B | trocar de positivo para negativo altera o placar em -2 | atualização do voto existente |
| 5 | A | voto com valor diferente de 1 e -1 é rejeitado | validação do valor |
| 6 | B | a listagem de perguntas traz o campo `votos` | soma dos votos em `listar_perguntas` |

## 2. Ferramentas

- VS Code Live Share: o navigator entra no editor do driver pela extensão Live Share, com cursor próprio, acesso ao terminal compartilhado e às portas 5000 e 3000 encaminhadas. Assim os dois veem o backend e o frontend rodando sem instalar nada na máquina do navigator. Na troca de papéis não é preciso trocar de máquina: o navigator passa a editar e o antigo driver acompanha.
- Discord: canal de voz durante toda a sessão. Se o Live Share falhar, o driver compartilha a tela pelo próprio Discord e o navigator acompanha só pela imagem.
- Git e GitHub: cada card é desenvolvido em uma branch própria, criada a partir de `main`. O commit do fim da sessão é feito por quem estiver como driver naquele momento, e o card só vai para Concluído depois do merge em `main`.
- GitHub Projects: o quadro Kanban descrito em `PROCESSO.md` mostra em que card cada sessão está trabalhando.
- Timer de Pomodoro: qualquer timer compartilhado (o do próprio celular basta) marca a troca de papéis.

## 3. Adaptação ao trabalho individual

Sem um par, duas funções do navigator são cobertas de outra forma. A revisão linha a linha é substituída pela coluna Revisão do quadro, em que todo item passa por uma lista de verificação antes de ser concluído (ver `PROCESSO.md`). O hábito de verbalizar a próxima decisão é mantido escrevendo, antes de cada bloco, o teste que se pretende fazer passar, o que reproduz o ritmo do ping-pong com uma pessoa só. Nenhuma das duas substitui o que a programação em pares traz de mais útil, que é uma segunda pessoa questionando as decisões enquanto elas são tomadas.
