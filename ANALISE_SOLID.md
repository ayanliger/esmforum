# Análise SOLID do backend original

O enunciado pede a análise de `routes/` e `models/`, pastas que não existem nesta versão do ESM Forum. Os papéis equivalentes estão em `server.js` (rotas), `modelo.js` (modelo) e `bd/bd_utils.js` (acesso ao SQLite). A análise considera esses três arquivos como estavam antes da implementação da votação.

Os princípios SOLID foram formulados para classes, e o backend não tem nenhuma: cada arquivo é um módulo CommonJS que exporta funções. A análise aplica os princípios aos módulos, tratando o conjunto de funções exportadas como a interface do módulo.

## 1. Trechos que seguem os princípios

### 1.1 SRP: rotas separadas do acesso a dados

`server.js` não contém SQL, e `modelo.js` não conhece HTTP. Cada rota lê a requisição, chama uma função do modelo e devolve JSON:

```js
// server.js
app.post('/respostas', (req, res) => {
  try {
    const id_pergunta = req.body.id_pergunta;
    const resposta = req.body.resposta;
    const id_resposta = modelo.cadastrar_resposta(id_pergunta, resposta);
    res.json({id_resposta: id_resposta});
  }
  ...
```

Uma mudança no formato da API (nome de um campo no JSON, código de status) altera só `server.js`. Uma mudança no esquema do banco altera só `modelo.js`. São dois motivos de mudança distintos em dois módulos distintos, que é o que o Princípio da Responsabilidade Única pede.

### 1.2 SRP: `bd_utils.js` é o único módulo que conhece o driver do banco

```js
// bd/bd_utils.js
const Database = require('better-sqlite3');
var bd = new Database('./bd/esmforum.db');

function query(query, params) {
  return bd.prepare(query).get(params);
}
```

Só este arquivo importa `better-sqlite3` e chama `prepare`, `get`, `all` e `run`. A atualização do `better-sqlite3` da versão 11 para a 13, feita na configuração do ambiente (ver `INSTALACAO.md`), não exigiu alterar nenhuma linha de `modelo.js` nem de `server.js`. Trocar o SQLite por outro banco também ficaria restrito a esse arquivo, desde que o SQL continuasse compatível.

### 1.3 ISP: interface de banco pequena

`bd_utils.js` expõe três funções (`query`, `queryAll` e `exec`), e não o objeto `Database` inteiro do `better-sqlite3`, que tem dezenas de métodos (transações, backup, funções definidas pelo usuário etc.). O Princípio da Segregação de Interfaces diz que um cliente não deve depender de métodos que não usa, e o modelo depende apenas dessas três operações.

O efeito aparece no teste `testes/listar_perguntas.test.js`, que substitui o banco por um objeto que implementa só as duas funções usadas por `listar_perguntas`:

```js
// testes/listar_perguntas.test.js
var mock_bd = {};
mock_bd.queryAll = jest.fn().mockReturnValue([ ... ]);
mock_bd.query = jest.fn().mockReturnValue({ 'count(*)': 0 }) ...
modelo.reconfig_bd(mock_bd);
```

Com uma interface maior, o mock precisaria simular métodos que o código testado nem chama.

## 2. Trechos que violam os princípios

### 2.1 SRP: `modelo.js` mistura regra de negócio e SQL

`modelo.js` concentra duas responsabilidades. A primeira é o acesso a dados: as consultas SQL e os nomes de tabelas e colunas. A segunda são as regras do fórum, por exemplo quem é o autor de uma pergunta e como se conta o número de respostas.

```js
// modelo.js
function cadastrar_pergunta(texto) {
  const params = [texto, 1];
  const result = bd.exec('INSERT INTO perguntas (texto, id_usuario) VALUES(?, ?) RETURNING id_pergunta', params);
  return result.lastInsertRowid;
}
```

Na mesma função estão a regra "toda pergunta pertence ao usuário 1" e o comando `INSERT`. Quando o fórum tiver login, essa regra muda. Quando o esquema mudar, o SQL muda. As duas mudanças caem no mesmo arquivo e na mesma função, e as novas funcionalidades pedidas (votação, busca, tags, perfil) acrescentariam ainda mais regras e consultas a esse módulo, que cresceria sem divisão.

Melhoria: separar um repositório, que contém apenas o SQL, de um serviço, que contém apenas as regras e recebe o repositório. Foi o que se fez na votação (`votacao/repositorio_votos.js` e `votacao/servico_votacao.js`, ver `IMPLEMENTACAO_SOLID.md`), e a mesma divisão pode ser aplicada a perguntas e respostas.

### 2.2 DIP: dependências concretas carregadas na importação

O Princípio da Inversão de Dependências diz que módulos de alto nível não devem depender de módulos de baixo nível, e que os dois devem depender de abstrações. No ESM Forum, cada módulo importa diretamente a implementação concreta de que precisa, e a importação já cria o recurso:

```js
// modelo.js
var bd = require('./bd/bd_utils.js');

// bd/bd_utils.js
var bd = new Database('./bd/esmforum.db');
```

Importar `modelo.js` importa `bd_utils.js`, que abre imediatamente o arquivo `bd/esmforum.db`, com um caminho relativo fixo. Isso acontece inclusive nos testes, que só depois trocam o banco com `reconfig_bd` ou `reconfig`. Essas funções existem justamente para contornar a dependência fixa, mas funcionam alterando uma variável global do módulo: todo código que usa `modelo.js` no mesmo processo passa a usar o banco trocado, e um teste que esqueça de chamar `reconfig` apaga dados do banco real. O `server.js` tem o mesmo problema em relação a `modelo.js`.

Melhoria: receber a dependência de fora em vez de importá-la. Na votação, o repositório recebe o banco no construtor, o serviço recebe o repositório, e todas as instâncias concretas são criadas em um único ponto, no início de `server.js`:

```js
// server.js (depois da votação)
const repositorio_votos = new RepositorioVotosSQLite(bd);
const servico_votacao = new ServicoVotacao(repositorio_votos, [ ... ]);
```

Para o restante do sistema, a correção seria transformar `bd_utils.js` em uma função que recebe o caminho do banco e devolve o objeto com `query`, `queryAll` e `exec`, e fazer o modelo receber esse objeto, eliminando `reconfig_bd`.
