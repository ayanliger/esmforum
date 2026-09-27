// Regras que um voto precisa cumprir antes de ser registrado. Cada regra tem
// um método verificar(voto) que lança ErroVotacao quando o voto é recusado.
// Uma regra nova entra na lista montada em server.js, sem alterar ServicoVotacao.

// Erro de regra de negócio da votação, com o status HTTP que a rota deve usar.
class ErroVotacao extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

class RegraUsuarioInformado {
  verificar(voto) {
    if (!Number.isInteger(voto.id_usuario)) {
      throw new ErroVotacao('Usuário não informado', 400);
    }
  }
}

class RegraValorValido {
  verificar(voto) {
    if (voto.valor !== 1 && voto.valor !== -1) {
      throw new ErroVotacao('Valor de voto inválido: use 1 ou -1', 400);
    }
  }
}

class RegraPerguntaExistente {
  constructor(repositorio) {
    this.repositorio = repositorio;
  }

  verificar(voto) {
    if (!this.repositorio.pergunta_existe(voto.id_pergunta)) {
      throw new ErroVotacao('Pergunta não encontrada', 404);
    }
  }
}

exports.ErroVotacao = ErroVotacao;
exports.RegraUsuarioInformado = RegraUsuarioInformado;
exports.RegraValorValido = RegraValorValido;
exports.RegraPerguntaExistente = RegraPerguntaExistente;
