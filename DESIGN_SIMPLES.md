# Design Simples (YAGNI) no backend do ESM Forum

O enunciado cita `routes/perguntas.js` e `routes/respostas.js`, mas a versão atual do repositório não tem pasta `routes/`. As rotas de perguntas e de respostas ficam todas em `server.js`, e as funções que elas chamam ficam em `modelo.js`, com o acesso ao SQLite isolado em `bd/bd_utils.js`. A análise abaixo usa esses três arquivos, que somam cerca de 130 linhas.

O princípio YAGNI (You Aren't Gonna Need It) diz que não se implementa algo antes de haver uma necessidade concreta para ele. O ESM Forum hoje atende a quatro necessidades: listar perguntas, cadastrar pergunta, ver as respostas de uma pergunta e cadastrar resposta. A pergunta que orienta a análise é se cada trecho do código serve a uma dessas quatro operações.

## 1. Aspectos que seguem o design simples

### 1.1 Um endpoint por operação, sem camadas extras

Cada uma das quatro operações corresponde a exatamente uma rota em `server.js`, e cada rota chama uma ou duas funções do modelo. Não há classes de controlador, roteadores separados por recurso, middlewares de validação nem camada de serviço entre a rota e o modelo.

```js
// server.js
app.post('/perguntas', (req, res) => {
  try {
    const id_pergunta = modelo.cadastrar_pergunta(req.body.pergunta);
    res.json({id_pergunta: id_pergunta});
  }
  catch(erro) {
    res.status(500).json(erro.message);
  }
});
```

Com quatro endpoints, dividir em `routes/perguntas.js` e `routes/respostas.js` só acrescentaria arquivos e `require`s sem reduzir a dificuldade de leitura. A divisão passa a fazer sentido quando o número de rotas crescer, por exemplo com as rotas de votação e de busca propostas para este projeto.

### 1.2 Modelo como funções, não como classes

`modelo.js` exporta funções simples (`listar_perguntas`, `cadastrar_pergunta`, `get_respostas` etc.) que recebem valores primitivos e devolvem as linhas do banco como objetos JavaScript. Não existem classes `Pergunta` ou `Resposta` com getters, setters e validações, porque nenhuma operação atual precisa de comportamento associado a esses dados: eles saem do banco e vão direto para o JSON da resposta HTTP.

```js
// modelo.js
function get_respostas(id_pergunta) {
  return bd.queryAll('select * from respostas where id_pergunta = ?', [id_pergunta]);
}
```

### 1.3 SQL direto em vez de ORM

`bd/bd_utils.js` é um invólucro de três funções (`query`, `queryAll` e `exec`) sobre o `better-sqlite3`. O esquema tem duas tabelas e as consultas são de uma linha, então um ORM traria configuração, mapeamento de entidades e migrações para resolver um problema que não existe.

```js
// bd/bd_utils.js
function queryAll(query, params) {
  return bd.prepare(query).all(params);
}
```

### 1.4 Usuário fixo em vez de um sistema de autenticação

O esquema já tem a coluna `id_usuario` em `perguntas`, mas o cadastro grava sempre o valor 1. Não há tabela de usuários, login, sessão nem token. Como nenhuma funcionalidade atual depende de saber quem perguntou, a autenticação ficou de fora. Ela só vai ser necessária com as funcionalidades de perfil de usuário e de notificação, e é nesse momento que deve ser construída.

```js
// modelo.js
function cadastrar_pergunta(texto) {
  const params = [texto, 1];
  ...
}
```

### 1.5 Contagem de respostas calculada na leitura

`num_respostas` não é uma coluna da tabela `perguntas`. O valor é calculado a cada listagem com `count(*)`. Guardar um contador exigiria atualizá-lo em todo cadastro de resposta e mantê-lo consistente com a tabela `respostas`, custo que não se justifica com o volume de dados de um fórum didático.

### 1.6 CORS em cinco linhas

Em vez de instalar o pacote `cors`, o servidor define os três cabeçalhos necessários para o frontend React (que roda em outra porta) em um middleware próprio. É o mínimo para o navegador aceitar as requisições.

```js
// server.js
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
```

A lista de métodos inclui `PUT` e `DELETE`, que nenhum endpoint usa. É um pequeno excesso, mas inofensivo.

### 1.7 Ponto de troca do banco só para os testes

`modelo.reconfig_bd(mock_bd)` e `bd.reconfig(nome)` permitem que os testes troquem o banco real por um mock ou por `esmforum-teste.db`. É a menor alteração que torna o modelo testável: não há contêiner de injeção de dependências nem interface de repositório, só uma função que substitui a variável `bd`.

## 2. Oportunidades de simplificação

### 2.1 Dependência declarada e não usada

O `package.json` original declarava `better-sqlite3` e `sqlite3`, mas apenas o primeiro é importado (em `bd/bd_utils.js`). O `sqlite3` era baixado e compilado em toda instalação sem ser usado, e foi ele que trouxe o `node-gyp` 8, que falha no Python 3.12 ou superior (detalhes em `INSTALACAO.md`). A dependência foi removida neste fork.

### 2.2 Contagem de respostas com uma consulta por pergunta

`listar_perguntas` busca todas as perguntas e depois executa um `count(*)` para cada uma, ou seja, N + 1 consultas para N perguntas.

```js
// modelo.js (atual)
function listar_perguntas() {
  const perguntas = bd.queryAll('select * from perguntas', []);
  perguntas.forEach(pergunta => pergunta['num_respostas'] = get_num_respostas(pergunta['id_pergunta']));
  return perguntas;
}
```

Uma única consulta com `LEFT JOIN` e `GROUP BY` devolve o mesmo resultado, dispensa a função auxiliar `get_num_respostas` e o acesso por `resultado['count(*)']`:

```js
// proposta
function listar_perguntas() {
  return bd.queryAll(
    `select p.*, count(r.id_resposta) as num_respostas
       from perguntas p left join respostas r on r.id_pergunta = p.id_pergunta
      group by p.id_pergunta`, []);
}
```

A mudança não foi aplicada agora porque o teste de unidade `testes/listar_perguntas.test.js` simula exatamente as N chamadas a `bd.query`. Para aplicá-la, seria preciso ajustar esse teste junto.

### 2.3 Chamadas ao modelo fora do `try`

Na rota `GET /respostas/:id_pergunta`, as chamadas ao modelo acontecem antes do bloco `try`, e dentro dele só fica o `res.json`, que praticamente não falha. Um erro de banco nessa rota não passa pelo `catch` e cai no tratador padrão do Express, que responde com HTML em vez de JSON.

```js
// server.js (atual)
app.get('/respostas/:id_pergunta', (req, res) => {
  const id_pergunta = req.params.id_pergunta;
  const pergunta = modelo.get_pergunta(id_pergunta);
  const respostas = modelo.get_respostas(id_pergunta);
  try {
    res.json({ pergunta: pergunta, respostas: respostas });
  }
  ...
```

A correção é mover as duas chamadas para dentro do `try`, deixando a rota igual às outras três.

### 2.4 Comentário desatualizado sobre o formato de retorno

O comentário acima de `listar_perguntas` descreve `texto: int`, quando o campo é texto. Comentários que descrevem a estrutura de dados precisam acompanhar o código, ou é melhor removê-los.

### 2.5 URL do backend repetida no frontend

No repositório `esmforum-react`, o endereço `http://localhost:5000` aparece em quatro chamadas `fetch`, distribuídas entre `Pergunta.js` e `Resposta.js`. Uma constante em um único arquivo evita ter de alterar quatro pontos quando a porta ou o host mudarem. Não se trata de criar uma camada de serviços HTTP, só de nomear o valor repetido.

## 3. Implicação para as novas funcionalidades

As extensões pedidas pelo cliente devem seguir o mesmo critério de só construir o que uma operação concreta exige. A votação, por exemplo, precisa de uma tabela de votos e de duas rotas. Ela não justifica criar um sistema genérico de reações, e a autenticação continua fora do escopo enquanto o perfil de usuário não for priorizado.
