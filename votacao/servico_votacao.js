// Regras de negócio da votação em perguntas. Não contém SQL nem trata HTTP:
// o repositório e a lista de regras de validação chegam pelo construtor.
class ServicoVotacao {
  constructor(repositorio, regras) {
    this.repositorio = repositorio;
    this.regras = regras;
  }

  // Registra, cancela ou troca o voto do usuário na pergunta.
  // Retorna o placar atualizado e o voto que ficou registrado (1, -1 ou 0).
  votar(id_pergunta, id_usuario, valor) {
    const voto = { id_pergunta: id_pergunta, id_usuario: id_usuario, valor: valor };
    this.regras.forEach(regra => regra.verificar(voto));

    const voto_atual = this.repositorio.buscar_voto(id_pergunta, id_usuario);
    let voto_usuario = valor;
    if (voto_atual === null) {
      this.repositorio.inserir(id_pergunta, id_usuario, valor);
    }
    else if (voto_atual === valor) {
      this.repositorio.remover(id_pergunta, id_usuario);
      voto_usuario = 0;
    }
    else {
      this.repositorio.atualizar(id_pergunta, id_usuario, valor);
    }

    return { placar: this.repositorio.placar(id_pergunta), voto_usuario: voto_usuario };
  }

  // Acrescenta placar e voto do usuário a cada pergunta e ordena pelo placar.
  // Array.sort é estável, então perguntas empatadas mantêm a ordem de cadastro.
  ordenar_por_placar(perguntas, id_usuario) {
    const placares = this.repositorio.placares();
    const votos = id_usuario ? this.repositorio.votos_do_usuario(id_usuario) : {};
    perguntas.forEach(pergunta => {
      pergunta.placar = placares[pergunta.id_pergunta] || 0;
      pergunta.voto_usuario = votos[pergunta.id_pergunta] || 0;
    });
    return perguntas.sort((a, b) => b.placar - a.placar);
  }
}

module.exports = ServicoVotacao;
