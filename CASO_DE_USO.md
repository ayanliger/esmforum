# Caso de Uso: Votar em Pergunta

Detalha a História 1 de `HISTORIAS.md`. O diagrama de sequência correspondente está em `diagramas/diagrama_sequencia.png`.

**Nome:** Votar em pergunta

**Atores:**

- Usuário do fórum (ator principal), que usa o sistema pelo navegador.
- Sistema ESM Forum, composto pelo frontend React e pelo backend Express com banco SQLite.

**Pré-condições:**

- O backend e o frontend estão em execução.
- O usuário está na página principal, que exibe a tabela de perguntas com o placar de cada uma.
- O usuário é identificado por um `id_usuario`. Como o sistema ainda não tem login, o frontend usa um identificador fixo (1), assim como no cadastro de perguntas.

**Fluxo Principal (primeiro voto do usuário na pergunta):**

1. O usuário clica no botão de voto positivo ou de voto negativo de uma pergunta.
2. O frontend envia ao backend `POST /perguntas/{id_pergunta}/votos` com `id_usuario` e `valor` (+1 ou -1).
3. O sistema verifica que o valor é +1 ou -1.
4. O sistema verifica que a pergunta existe.
5. O sistema consulta o voto atual do usuário nessa pergunta e verifica que ele ainda não votou.
6. O sistema registra o voto no banco de dados.
7. O sistema recalcula o placar da pergunta (soma de todos os votos).
8. O sistema responde com o novo placar e o voto atual do usuário.
9. O frontend atualiza o placar na linha da pergunta e destaca o botão correspondente ao voto do usuário.

**Fluxo Alternativo A: usuário repete o mesmo voto (cancelamento)**

- 5a. O sistema encontra um voto do usuário nessa pergunta com o mesmo valor do voto recebido.
- 5b. O sistema remove o voto existente.
- 5c. Retorna ao passo 7, e no passo 9 nenhum botão fica destacado.

**Fluxo Alternativo B: usuário troca o voto**

- 5a. O sistema encontra um voto do usuário nessa pergunta com o valor oposto ao recebido.
- 5b. O sistema altera o valor do voto existente, sem criar um novo registro.
- 5c. Retorna ao passo 7. O placar varia 2 pontos em relação ao valor anterior.

**Fluxo de Exceção C: valor inválido**

- 3a. O valor recebido não é +1 nem -1.
- 3b. O sistema responde com status 400 e a mensagem "Valor de voto inválido: use 1 ou -1".
- 3c. O caso de uso termina sem alteração no banco.

**Fluxo de Exceção D: pergunta inexistente**

- 4a. Não existe pergunta com o `id_pergunta` informado (por exemplo, foi removida diretamente no banco depois que a página carregou).
- 4b. O sistema responde com status 404 e a mensagem "Pergunta não encontrada".
- 4c. O frontend exibe a mensagem ao usuário e o placar da linha não muda.

**Fluxo de Exceção E: backend indisponível**

- 2a. O frontend não recebe resposta do backend.
- 2b. O frontend mantém o placar anterior e exibe a mensagem "Não foi possível registrar o voto. Tente novamente."

**Pós-condições:**

- Em caso de sucesso, existe no máximo um registro de voto para o par (usuário, pergunta), com valor +1 ou -1, ou nenhum registro se o voto foi cancelado.
- O placar exibido para a pergunta é igual à soma dos valores dos votos dela no banco.
- Em caso de exceção, o banco fica como estava antes do clique.

**Regras de negócio:**

- RN1. Um usuário tem no máximo um voto por pergunta, garantido também no banco por uma restrição `UNIQUE(id_pergunta, id_usuario)`.
- RN2. O placar de uma pergunta é a soma dos valores dos seus votos e pode ser negativo.
- RN3. Na página principal, as perguntas são ordenadas por placar decrescente e, em caso de empate, pela ordem de cadastro.
