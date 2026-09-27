const ServicoVotacao = require('../votacao/servico_votacao.js');
const regras = require('../votacao/regras_voto.js');

// Repositório em memória com os mesmos métodos de RepositorioVotosSQLite.
// Como o serviço só depende desses métodos, pode ser testado sem banco.
class RepositorioVotosEmMemoria {
  constructor(ids_perguntas) {
    this.ids_perguntas = ids_perguntas;
    this.votos = [];
  }

  pergunta_existe(id_pergunta) {
    return this.ids_perguntas.includes(id_pergunta);
  }

  buscar_voto(id_pergunta, id_usuario) {
    const voto = this.votos.find(v => v.id_pergunta === id_pergunta && v.id_usuario === id_usuario);
    return voto ? voto.valor : null;
  }

  inserir(id_pergunta, id_usuario, valor) {
    this.votos.push({ id_pergunta: id_pergunta, id_usuario: id_usuario, valor: valor });
  }

  atualizar(id_pergunta, id_usuario, valor) {
    this.votos.find(v => v.id_pergunta === id_pergunta && v.id_usuario === id_usuario).valor = valor;
  }

  remover(id_pergunta, id_usuario) {
    this.votos = this.votos.filter(v => !(v.id_pergunta === id_pergunta && v.id_usuario === id_usuario));
  }

  placar(id_pergunta) {
    return this.votos.filter(v => v.id_pergunta === id_pergunta).reduce((soma, v) => soma + v.valor, 0);
  }

  placares() {
    const placares = {};
    this.votos.forEach(v => placares[v.id_pergunta] = (placares[v.id_pergunta] || 0) + v.valor);
    return placares;
  }

  votos_do_usuario(id_usuario) {
    const votos = {};
    this.votos.filter(v => v.id_usuario === id_usuario).forEach(v => votos[v.id_pergunta] = v.valor);
    return votos;
  }
}

let repositorio;
let servico;

beforeEach(() => {
  repositorio = new RepositorioVotosEmMemoria([1, 2, 3]);
  servico = new ServicoVotacao(repositorio, [
    new regras.RegraUsuarioInformado(),
    new regras.RegraValorValido(),
    new regras.RegraPerguntaExistente(repositorio)
  ]);
});

test('Voto positivo soma 1 ao placar', () => {
  expect(servico.votar(1, 10, 1)).toEqual({ placar: 1, voto_usuario: 1 });
});

test('Voto negativo subtrai 1 do placar', () => {
  expect(servico.votar(1, 10, -1)).toEqual({ placar: -1, voto_usuario: -1 });
});

test('Repetir o mesmo voto cancela o voto', () => {
  servico.votar(1, 10, 1);
  expect(servico.votar(1, 10, 1)).toEqual({ placar: 0, voto_usuario: 0 });
  expect(repositorio.buscar_voto(1, 10)).toBe(null);
});

test('Votar no sentido oposto troca o voto e altera o placar em 2', () => {
  servico.votar(1, 11, 1);
  servico.votar(1, 10, 1);
  expect(servico.votar(1, 10, -1)).toEqual({ placar: 0, voto_usuario: -1 });
  expect(repositorio.votos.length).toBe(2);
});

test('Valor inválido é recusado com status 400 e não altera o placar', () => {
  expect(() => servico.votar(1, 10, 2)).toThrow('Valor de voto inválido');
  try {
    servico.votar(1, 10, '1');
  }
  catch(erro) {
    expect(erro.status).toBe(400);
  }
  expect(repositorio.placar(1)).toBe(0);
});

test('Voto em pergunta inexistente é recusado com status 404', () => {
  expect(() => servico.votar(99, 10, 1)).toThrow('Pergunta não encontrada');
  try {
    servico.votar(99, 10, 1);
  }
  catch(erro) {
    expect(erro.status).toBe(404);
  }
});

test('Voto sem usuário é recusado com status 400', () => {
  expect(() => servico.votar(1, undefined, 1)).toThrow('Usuário não informado');
});

test('Ordena perguntas pelo placar, mantendo a ordem de cadastro nos empates', () => {
  servico.votar(2, 10, 1);
  servico.votar(3, 10, -1);
  const perguntas = [{ id_pergunta: 1 }, { id_pergunta: 2 }, { id_pergunta: 3 }, { id_pergunta: 4 }];
  const ordenadas = servico.ordenar_por_placar(perguntas, 10);
  expect(ordenadas.map(p => p.id_pergunta)).toEqual([2, 1, 4, 3]);
  expect(ordenadas.map(p => p.placar)).toEqual([1, 0, 0, -1]);
  expect(ordenadas[0].voto_usuario).toBe(1);
  expect(ordenadas[1].voto_usuario).toBe(0);
});

test('Nova regra é incluída sem alterar o serviço', () => {
  class RegraUsuarioBloqueado {
    verificar(voto) {
      if (voto.id_usuario === 666) {
        throw new regras.ErroVotacao('Usuário bloqueado', 403);
      }
    }
  }
  const servico_com_bloqueio = new ServicoVotacao(repositorio, [new RegraUsuarioBloqueado()]);
  expect(() => servico_com_bloqueio.votar(1, 666, 1)).toThrow('Usuário bloqueado');
  expect(servico_com_bloqueio.votar(1, 10, 1).placar).toBe(1);
});
