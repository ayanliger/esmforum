const express = require('express')
const modelo = require('./modelo.js');
const bd = require('./bd/bd_utils.js');
const RepositorioVotosSQLite = require('./votacao/repositorio_votos.js');
const ServicoVotacao = require('./votacao/servico_votacao.js');
const regras = require('./votacao/regras_voto.js');
const criar_rotas_votacao = require('./votacao/rotas_votacao.js');

// Único ponto em que se escolhem as implementações concretas da votação.
const repositorio_votos = new RepositorioVotosSQLite(bd);
const servico_votacao = new ServicoVotacao(repositorio_votos, [
  new regras.RegraUsuarioInformado(),
  new regras.RegraValorValido(),
  new regras.RegraPerguntaExistente(repositorio_votos)
]);

const app = express()
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.get('/', (req, res) => {
  try {
    const perguntas = modelo.listar_perguntas();
    const id_usuario = Number(req.query.id_usuario) || null;
    res.send(servico_votacao.ordenar_por_placar(perguntas, id_usuario));
  }
  catch(erro) {
    res.status(500).json(erro.message); 
  }
});

app.post('/perguntas', (req, res) => {
  try {
    const id_pergunta = modelo.cadastrar_pergunta(req.body.pergunta);
    res.json({id_pergunta: id_pergunta});
  }
  catch(erro) {
    res.status(500).json(erro.message); 
  } 
});

app.get('/respostas/:id_pergunta', (req, res) => {
  const id_pergunta = req.params.id_pergunta;
  const pergunta = modelo.get_pergunta(id_pergunta);
  const respostas = modelo.get_respostas(id_pergunta);
  try {
    res.json({
      pergunta: pergunta,
      respostas: respostas
    });
  }
  catch(erro) {
    res.status(500).json(erro.message); 
  } 
});

app.post('/respostas', (req, res) => {
  try {
    const id_pergunta = req.body.id_pergunta;
    const resposta = req.body.resposta;
    const id_resposta = modelo.cadastrar_resposta(id_pergunta, resposta);
    res.json({id_resposta: id_resposta});
  }
  catch(erro) {
    res.status(500).json(erro.message); 
  } 
});

app.use(criar_rotas_votacao(servico_votacao));

// espera e trata requisições de clientes
const port = 5000;
app.listen(port, 'localhost', () => {
  console.log(`ESM Forum rodando em ${port}`)
});