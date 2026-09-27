# Instalação e execução do ESM Forum

Este documento registra como o ambiente de desenvolvimento foi configurado para o projeto final de ES1, incluindo os problemas encontrados com versões recentes do Node.js e como foram resolvidos.

Repositórios usados:

- backend (fork de `jeffsantos/esmforum`): LINK_FORK_BACKEND
- frontend (fork de `jeffsantos/esmforum-react`): LINK_FORK_FRONTEND

## 1. Ambiente

| Item | Versão |
|------|--------|
| Sistema | Arch Linux no WSL 2 (Windows 11) |
| Node.js | 26.7.0 |
| npm | 12.0.2 |
| Python (usado pelo node-gyp) | 3.14 |
| SQLite (linha de comando) | 3.x, só para recriar o banco |
| Git e GitHub CLI (`gh`) | versões do repositório oficial do Arch |

No Arch, os pacotes necessários são instalados com:

```bash
sudo pacman -S nodejs npm sqlite git github-cli base-devel python
```

O grupo `base-devel` traz `make` e `g++`, necessários para compilar o `better-sqlite3`, que é um módulo nativo.

## 2. Fork e clone

Os forks foram criados na conta pessoal a partir dos dois repositórios originais. Depois, cada fork foi clonado e o repositório original foi registrado como `upstream`, para permitir trazer atualizações:

```bash
git clone https://github.com/ayanliger/esmforum.git
git clone https://github.com/ayanliger/esmforum-react.git

cd esmforum
git remote add upstream https://github.com/jeffsantos/esmforum.git
cd ../esmforum-react
git remote add upstream https://github.com/jeffsantos/esmforum-react.git
```

## 3. Backend

### 3.1 Problemas com o `package.json` original

Seguindo o `docs/instalacao.md` do repositório original (`npm install` e `node server.js`), o servidor não subiu. Foram três problemas encadeados:

1. O npm 12 não executa mais scripts de instalação de dependências sem aprovação explícita. O `better-sqlite3` precisa do script de instalação para compilar o módulo nativo, então o `npm install` terminava sem erro, mas `node server.js` falhava com `Could not locate the bindings file`.
2. Com o script aprovado, a versão fixada no projeto (`better-sqlite3` 11.0.0) não compila no Node 26. Os cabeçalhos do V8 distribuídos com essa versão do Node exigem C++20 (`error: #error "C++20 or later required."`), e o `better-sqlite3` 11 é compilado com um padrão anterior da linguagem.
3. O projeto declarava também o pacote `sqlite3`, que o código não usa (o único `require` de banco está em `bd/bd_utils.js` e é do `better-sqlite3`). Esse pacote traz o `node-gyp` 8 como dependência, e essa versão do `node-gyp` importa o módulo `distutils`, removido do Python a partir da versão 3.12. Como o npm usa o `node-gyp` do projeto quando ele existe, a compilação do `better-sqlite3` também falhava por causa dele.

As correções aplicadas no fork foram:

```bash
npm uninstall sqlite3                        # dependência sem uso
npm install-scripts approve better-sqlite3   # permite compilar o módulo nativo
npm install better-sqlite3@13                # versão compatível com Node 26
```

O `package.json` resultante fica com `better-sqlite3` 13, `express` 4 e a seção `allowScripts` aprovando só o `better-sqlite3`. O `better-sqlite3` 13 exige Node 22 ou superior, então o workflow de integração contínua (`.github/workflows/node.js.yml`) foi atualizado de Node 18 para Node 22.

### 3.2 Instalação a partir do fork

Com as correções já no fork, a instalação se resume a:

```bash
cd esmforum
npm install
```

A compilação do `better-sqlite3` leva poucos segundos. O aviso sobre scripts bloqueados não deve mencionar o `better-sqlite3`; se mencionar, o `package.json` não está com a seção `allowScripts`.

### 3.3 Execução e verificação

```bash
node server.js
```

A saída esperada é `ESM Forum rodando em 5000`. Em outro terminal, os endpoints podem ser testados com `curl`:

```bash
curl http://localhost:5000/
curl http://localhost:5000/respostas/1
curl -X POST http://localhost:5000/perguntas \
     -H 'Content-Type: application/json' -d '{"pergunta": "Quanto é 2 + 2?"}'
```

O primeiro comando devolve a lista de perguntas em JSON, e o terceiro devolve o identificador da pergunta criada, por exemplo `{"id_pergunta":7}`.

### 3.4 Testes

```bash
npm test
```

Resultado obtido: 2 suítes e 3 testes passando. Os testes de `testes/modelo.test.js` usam o banco `bd/esmforum-teste.db` e apagam os dados dele a cada execução, portanto o arquivo aparece como modificado no `git status` depois de rodar os testes. Para descartar essa alteração, usa-se `git checkout bd/esmforum-teste.db`.

### 3.5 Recriar o banco

O banco que vem no repositório já tem perguntas de exemplo. Para começar com o banco vazio:

```bash
cd bd
sh criar_bd.sh
```

O script apaga `esmforum.db` e o recria a partir de `schema.sql`, usando o `sqlite3` de linha de comando.

## 4. Frontend

O frontend não precisou de nenhuma alteração para rodar no Node 26.

```bash
cd esmforum-react
npm install
npm start
```

A instalação levou cerca de 2 minutos. O npm avisa que bloqueou os scripts de `core-js` e `core-js-pure`, que apenas imprimem uma mensagem de divulgação do projeto e podem ser ignorados. O `npm start` abre o servidor de desenvolvimento em `http://localhost:3000`, com um aviso do ESLint em `src/pages/Resposta.js` (dependência ausente em `useEffect`) que não impede a execução.

O frontend chama o backend em `http://localhost:5000`, então o backend precisa estar rodando antes. No WSL 2, as portas abertas em `localhost` dentro do Linux ficam acessíveis pelo navegador do Windows no mesmo endereço, sem configuração extra.

## 5. Verificação da configuração

Com os dois servidores rodando, a página `http://localhost:3000` exibe a tabela de perguntas vinda do backend. O cadastro de uma pergunta pelo formulário da página principal aparece na tabela e em `curl http://localhost:5000/`, e o link de número de respostas abre a página da pergunta, onde é possível cadastrar uma resposta.
