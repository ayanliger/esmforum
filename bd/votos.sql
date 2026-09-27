-- Cria a tabela da votação em bancos que já existiam antes dela.
-- Uso: sqlite3 bd/esmforum.db < bd/votos.sql
create table if not exists votos (
  id_voto           integer      unique  not null  primary key  autoincrement,
  id_pergunta       integer      not null,
  id_usuario        integer      not null,
  valor             integer      not null  check (valor in (1, -1)),
  unique (id_pergunta, id_usuario)
);
