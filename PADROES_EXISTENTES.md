# Padrões de projeto existentes

O ESM Forum não declara nenhum padrão de projeto e não tem classes no código original. Mesmo assim, alguns padrões aparecem na forma como os módulos e as bibliotecas usadas se organizam. A lista abaixo indica, para cada um, onde está, o quanto a implementação corresponde ao padrão e o que poderia melhorar. Os padrões introduzidos na votação estão no final, separados dos que já existiam.

| Padrão | Onde | Implementação |
|--------|------|---------------|
| Facade | `bd/bd_utils.js` | completa |
| Singleton | `bd/bd_utils.js` (conexão) | parcial |
| Chain of Responsibility | middlewares do Express em `server.js` | completa (fornecida pelo Express) |
| Observer | estado e eventos dos componentes React | completa (fornecida pelo React) |
| Composite | árvore de componentes React | completa (fornecida pelo React) |
| MVC (arquitetural) | `server.js`, `modelo.js`, frontend React | parcial |

## 1. Facade: `bd/bd_utils.js`

A Facade oferece uma interface simples para um subsistema mais complexo. O `better-sqlite3` trabalha com objetos `Database` e `Statement`: prepara-se o comando e depois se escolhe entre `get`, `all` e `run`, conforme o resultado esperado. `bd_utils.js` esconde esse fluxo atrás de três funções que recebem o SQL e os parâmetros:

```js
function query(query, params)    { return bd.prepare(query).get(params); }
function queryAll(query, params) { return bd.prepare(query).all(params); }
function exec(statement, params) { return bd.prepare(statement).run(params); }
```

O modelo usa só essas funções e nunca vê um `Statement`. A implementação está completa para o que o sistema precisa. Uma melhoria seria esconder também o resultado de `exec`: hoje `cadastrar_pergunta` lê `result.lastInsertRowid`, que é um campo específico do `better-sqlite3`, então parte do subsistema ainda vaza pela fachada.

## 2. Singleton: a conexão com o banco

O Singleton garante uma única instância de um recurso e um ponto global de acesso a ela. Em Node.js, um módulo é executado uma vez e fica em cache, então todo `require('./bd/bd_utils.js')` recebe o mesmo módulo e, portanto, a mesma conexão `bd`, criada na primeira importação:

```js
// bd/bd_utils.js
var bd = new Database('./bd/esmforum.db');
```

A implementação é parcial, e os problemas são os mesmos que tornam o Singleton criticado. A instância é criada na importação, com caminho fixo, sem possibilidade de configurar o banco antes. A função `reconfig(nome)` substitui a instância única para todos os usuários do módulo de uma vez, o que os testes usam, mas que também significa estado global mutável. A melhoria proposta em `ANALISE_SOLID.md` (seção 2.2) é criar a conexão uma vez em `server.js` e passá-la a quem precisa, mantendo a instância única sem o acesso global.

## 3. Chain of Responsibility: middlewares do Express

Na Chain of Responsibility, uma requisição passa por uma sequência de tratadores, e cada um decide se a trata, se a modifica ou se a repassa ao próximo. É o modelo de middlewares do Express. Em `server.js`, a requisição passa primeiro por `express.json()`, que converte o corpo em objeto, depois pelo middleware de CORS e só então chega à rota:

```js
// server.js
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  ...
  next();   // repassa ao próximo tratador da cadeia
});
```

O padrão está completo porque é fornecido pelo framework. O projeto poderia usá-lo mais: o bloco `try/catch` repetido nas quatro rotas poderia virar um único middleware de erro no fim da cadeia (`app.use((erro, req, res, next) => ...)`), mas, com quatro rotas, isso fica no limite do que `DESIGN_SIMPLES.md` recomenda não antecipar.

## 4. Observer: estado e eventos no React

No Observer, um objeto observado notifica os observadores quando muda. No frontend, isso acontece de duas formas. A primeira é o estado criado com `React.useState`: quando `setListaPerguntas` é chamado, o React notifica o componente e o renderiza de novo. A segunda são os tratadores de evento, em que o componente se registra para ser avisado de um clique ou de uma digitação:

```js
// esmforum-react, src/pages/Pergunta.js
const [listaPerguntas, setListaPerguntas] = React.useState([]);
...
<Form.Control as="textarea" value={texto} onChange={handleChange}/>
<Button id="btn-pergunta" onClick={handleClick}>Enviar</Button>
```

A implementação é do React e está completa. No backend não há nenhum uso do padrão, e ele é o candidato natural para a notificação de novas respostas (ver `PADROES_PROPOSTOS.md`).

## 5. Composite: árvore de componentes React

O Composite trata objetos individuais e composições desses objetos da mesma forma. Os componentes React formam uma árvore em que um componente pode conter outros, e todos são usados do mesmo jeito, como elementos JSX: `Menu` contém a página atual, `Pergunta` contém `TabelaPerguntas`, que contém `TabelaPrincipal` e `NovaPergunta`, e `TabelaPrincipal` contém uma `LinhaTabela` por pergunta. O padrão está completo. Um ponto a melhorar é que `TabelaPerguntas`, `TabelaPrincipal` e `LinhaTabela` são definidos dentro da função `Pergunta`, então são recriados a cada renderização, e o React desmonta e monta de novo toda a tabela quando o estado muda. Declará-los fora de `Pergunta`, como já é feito com `NovaPergunta`, mantém a mesma composição sem esse custo.

## 6. MVC

O próprio repositório, em `docs/arquitetura.md`, descreve o sistema como uma variação do MVC: a Visão é o frontend React, o Controlador é `server.js` e o Modelo é `modelo.js`. É um padrão arquitetural, não um padrão de projeto do catálogo GoF, e a implementação é parcial porque o Modelo também faz o acesso a dados. A análise completa está em `ARQUITETURA.md`.

## 7. Padrões introduzidos com a votação

A implementação da votação (`IMPLEMENTACAO_SOLID.md`) acrescentou dois padrões que não existiam:

- Repository, em `votacao/repositorio_votos.js`: uma classe que representa a coleção de votos e esconde o SQL, de modo que o serviço trabalha com `buscar_voto`, `inserir` e `placar` sem saber como os dados são guardados. Não é um padrão GoF, mas é o padrão usual para separar domínio de persistência.
- Strategy, em `votacao/regras_voto.js`: cada regra de validação é uma estratégia com a mesma interface (`verificar(voto)`), e o serviço recebe a lista de estratégias sem conhecer as classes concretas.
