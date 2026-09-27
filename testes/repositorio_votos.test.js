const fs = require('fs');
const bd = require('../bd/bd_utils.js');
const RepositorioVotosSQLite = require('../votacao/repositorio_votos.js');

const repositorio = new RepositorioVotosSQLite(bd);

// Cada teste usa um banco em memória criado a partir de schema.sql. Assim este
// arquivo não disputa o esmforum-teste.db com modelo.test.js, que o Jest pode
// executar ao mesmo tempo em outro processo.
beforeEach(() => {
  bd.reconfig(':memory:');
  const comandos = fs.readFileSync('./bd/schema.sql', 'utf8').split(';');
  comandos.filter(comando => comando.trim() !== '').forEach(comando => bd.exec(comando, []));
  bd.exec('insert into perguntas (texto, id_usuario) values (?, ?)', ['Pergunta 1', 1]);
  bd.exec('insert into perguntas (texto, id_usuario) values (?, ?)', ['Pergunta 2', 1]);
});

test('Verifica se a pergunta existe', () => {
  expect(repositorio.pergunta_existe(1)).toBe(true);
  expect(repositorio.pergunta_existe(99)).toBe(false);
});

test('Insere, atualiza e remove o voto de um usuário', () => {
  expect(repositorio.buscar_voto(1, 10)).toBe(null);
  repositorio.inserir(1, 10, 1);
  expect(repositorio.buscar_voto(1, 10)).toBe(1);
  repositorio.atualizar(1, 10, -1);
  expect(repositorio.buscar_voto(1, 10)).toBe(-1);
  repositorio.remover(1, 10);
  expect(repositorio.buscar_voto(1, 10)).toBe(null);
});

test('Calcula o placar como soma dos votos', () => {
  expect(repositorio.placar(1)).toBe(0);
  repositorio.inserir(1, 10, 1);
  repositorio.inserir(1, 11, 1);
  repositorio.inserir(1, 12, -1);
  expect(repositorio.placar(1)).toBe(1);
});

test('Banco recusa segundo voto do mesmo usuário na mesma pergunta', () => {
  repositorio.inserir(1, 10, 1);
  expect(() => repositorio.inserir(1, 10, -1)).toThrow();
});

test('Banco recusa valor diferente de 1 e -1', () => {
  expect(() => repositorio.inserir(1, 10, 2)).toThrow();
});

test('Lista placares e votos do usuário de todas as perguntas', () => {
  repositorio.inserir(1, 10, 1);
  repositorio.inserir(1, 11, 1);
  repositorio.inserir(2, 10, -1);
  expect(repositorio.placares()).toEqual({ 1: 2, 2: -1 });
  expect(repositorio.votos_do_usuario(10)).toEqual({ 1: 1, 2: -1 });
});
