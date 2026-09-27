const express = require('express');
const { ErroVotacao } = require('./regras_voto.js');

// Rotas HTTP da votação. Só convertem a requisição em chamada ao serviço e o
// resultado, ou o erro, em resposta JSON.
function criar_rotas_votacao(servico) {
  const rotas = express.Router();

  rotas.post('/perguntas/:id_pergunta/votos', (req, res) => {
    try {
      const id_pergunta = Number(req.params.id_pergunta);
      const resultado = servico.votar(id_pergunta, req.body.id_usuario, req.body.valor);
      res.json({
        id_pergunta: id_pergunta,
        placar: resultado.placar,
        voto_usuario: resultado.voto_usuario
      });
    }
    catch(erro) {
      const status = erro instanceof ErroVotacao ? erro.status : 500;
      res.status(status).json({ erro: erro.message });
    }
  });

  return rotas;
}

module.exports = criar_rotas_votacao;
