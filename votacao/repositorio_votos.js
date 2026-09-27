// Acesso à tabela votos no SQLite. O objeto de banco (com query, queryAll e
// exec, como bd/bd_utils.js) é recebido pelo construtor, e não importado aqui,
// para que os testes possam usar um banco em memória.
class RepositorioVotosSQLite {
  constructor(bd) {
    this.bd = bd;
  }

  pergunta_existe(id_pergunta) {
    const linha = this.bd.query('select id_pergunta from perguntas where id_pergunta = ?', [id_pergunta]);
    return linha !== undefined;
  }

  // Retorna 1, -1 ou null quando o usuário ainda não votou na pergunta.
  buscar_voto(id_pergunta, id_usuario) {
    const linha = this.bd.query('select valor from votos where id_pergunta = ? and id_usuario = ?',
                                [id_pergunta, id_usuario]);
    return linha ? linha.valor : null;
  }

  inserir(id_pergunta, id_usuario, valor) {
    this.bd.exec('insert into votos (id_pergunta, id_usuario, valor) values (?, ?, ?)',
                 [id_pergunta, id_usuario, valor]);
  }

  atualizar(id_pergunta, id_usuario, valor) {
    this.bd.exec('update votos set valor = ? where id_pergunta = ? and id_usuario = ?',
                 [valor, id_pergunta, id_usuario]);
  }

  remover(id_pergunta, id_usuario) {
    this.bd.exec('delete from votos where id_pergunta = ? and id_usuario = ?', [id_pergunta, id_usuario]);
  }

  placar(id_pergunta) {
    const linha = this.bd.query('select coalesce(sum(valor), 0) as placar from votos where id_pergunta = ?',
                                [id_pergunta]);
    return linha.placar;
  }

  // Placar de todas as perguntas com pelo menos um voto, em uma única consulta:
  // { id_pergunta: placar }.
  placares() {
    const linhas = this.bd.queryAll('select id_pergunta, sum(valor) as placar from votos group by id_pergunta', []);
    const placares = {};
    linhas.forEach(linha => placares[linha.id_pergunta] = linha.placar);
    return placares;
  }

  // Votos de um usuário em todas as perguntas: { id_pergunta: valor }.
  votos_do_usuario(id_usuario) {
    const linhas = this.bd.queryAll('select id_pergunta, valor from votos where id_usuario = ?', [id_usuario]);
    const votos = {};
    linhas.forEach(linha => votos[linha.id_pergunta] = linha.valor);
    return votos;
  }
}

module.exports = RepositorioVotosSQLite;
