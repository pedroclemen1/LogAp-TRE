# Decisões técnicas

Decisões de implementação da API que não são evidentes no código: o modelo de
contas e permissões, o contrato estável de erros e a auditoria de consultas.

As decisões de schema, migrations e índices ficam em
[`decisoes-de-banco.md`](decisoes-de-banco.md). A divisão de módulos fica em
[`arquitetura.md`](arquitetura.md).

## Autenticação e autorização

### Contas e primeiro acesso

Produção não carrega `db/seed` e não oferece cadastro público. A primeira conta
é criada pelo bootstrap a partir dos secrets do ambiente; as demais entram por
convite individual emitido por um gestor.

O bootstrap é um caso de uso de provisionamento, não uma migration e não um
endpoint. Ele adquire um `pg_advisory_xact_lock`, verifica novamente o banco
dentro da transação e segue estas regras:

1. qualquer gestor existente torna a execução um no-op;
2. usuários existentes sem gestor causam falha segura;
3. banco vazio só recebe o gestor quando o bootstrap está habilitado;
4. no perfil `prod`, banco vazio com bootstrap desabilitado impede o startup;
5. uma execução posterior nunca altera e-mail, nome ou senha.

A conta inicial recebe `troca_senha_obrigatoria=true`. O login sinaliza esse
estado, e o filtro de segurança bloqueia as demais rotas até `PATCH
/api/auth/password` concluir a troca. Assim, remover o secret do Render não
depende de conservar a senha temporária.

Cada usuário possui uma versão de credenciais incluída no JWT. A troca de senha
incrementa essa versão e devolve um token novo; qualquer token anterior deixa
de autenticar imediatamente, inclusive um token obtido com a senha temporária.

### Convites

`POST /api/auth/invitations` exige `GESTOR` e devolve um link para entrega
manual. O token possui 256 bits gerados por `SecureRandom`; o banco armazena
somente SHA-256 do token. O convite expira, é de uso único e uma nova emissão
para o mesmo e-mail revoga a anterior.

Validação e aceite são públicos porque o próprio token é a credencial
temporária. Isso não equivale a cadastro aberto: sem um token emitido por um
gestor não é possível criar a conta.

`InvitationDeliveryPort` é a porta para integrar um provedor de e-mail. As
implementações são acionadas apenas depois do commit da transação; portanto um
e-mail nunca anuncia um convite que foi revertido no banco. Enquanto não houver
provedor configurado, o gestor copia o `activationUrl` retornado pela API.
Esse link deve ser tratado como credencial secreta: não deve ser enviado a
canais públicos, registrado em tickets nem mantido em logs. Para entrega
automática em produção, a porta deve ser implementada com outbox, retry e
sanitização de falhas antes de deixar de retornar o link ao gestor.

Convites usados, revogados e expirados são preservados no piloto para auditoria.
Antes de operação prolongada, deve ser definida uma retenção e uma limpeza
agendada que nunca remova convites ainda utilizáveis.

### Matriz de permissões

| Operação | OPERADOR | GESTOR |
| --- | ---: | ---: |
| Consultar dashboard e módulos operacionais | sim | sim |
| Executar fluxos de viagens, manutenções e romaneios | sim | sim |
| Alterar cadastro de veículos | não | sim |
| Alterar cadastro de motoristas | não | sim |
| Alterar catálogo de serviços de manutenção | não | sim |
| Emitir convite de usuário | não | sim |
| Trocar a própria senha | sim | sim |

As permissões administrativas usam method security. O papel do token não é
aceito como fonte definitiva: a cada requisição o filtro carrega o usuário
ativo no banco. Desativação e alteração de perfil passam a valer sem esperar o
JWT expirar.

### Tokens e respostas de erro

JWT é stateless, assinado com HS256 e enviado no header `Authorization`. O
segredo é obrigatório em produção e sua rotação encerra todas as sessões. A
API inclui um `code` estável em `ApiError`; o frontend traduz pelo código e
mantém `message` apenas para compatibilidade e diagnóstico.

Tokens emitidos antes da introdução da versão de credenciais não possuem a
claim exigida e são recusados. Esse comportamento é deliberado: o deploy da
mudança encerra sessões antigas em vez de manter um caminho legado inseguro.

Códigos relevantes:

| Código | HTTP | Significado |
| --- | ---: | --- |
| `AUTHENTICATION_REQUIRED` | 401 | token ausente, inválido ou expirado |
| `ACCESS_DENIED` | 403 | perfil sem permissão |
| `PASSWORD_CHANGE_REQUIRED` | 403 | senha temporária ainda não trocada |
| `INVALID_CURRENT_PASSWORD` | 422 | senha atual incorreta |
| `WEAK_PASSWORD` | 422 | política de senha não atendida |
| `PASSWORD_REUSE` | 422 | nova senha igual à atual |
| `LOGIN_RATE_LIMIT_EXCEEDED` | 429 | limite temporário de tentativas de login |
| `INVITATION_INVALID_OR_EXPIRED` | 410 | convite indisponível |
| `EMAIL_ALREADY_REGISTERED` | 409 | e-mail já possui conta |
| `VALIDATION_ERROR` | 400 | erro de campos da requisição |
| `MALFORMED_REQUEST` | 400 | JSON ausente ou inválido |
| `INVALID_PARAMETER` | 400 | parâmetro incompatível com o contrato |
| `DATA_CONFLICT` | 409 | conflito com restrição persistida |

### Limitação de tentativas de login

Cinco credenciais inválidas em quinze minutos bloqueiam novas tentativas para a
mesma combinação de identidade e endereço remoto até o fim da janela. A resposta
é HTTP `429` com `Retry-After`. Um login válido limpa imediatamente as falhas
daquela combinação.

O mapa guarda somente uma chave HMAC de e-mail normalizado mais endereço
remoto, com segredo aleatório que existe apenas durante a vida do processo:
e-mails e endereços em texto puro não ficam no limitador nem nos logs. Ao
atingir o teto de identidades, a janela ainda não bloqueada com expiração mais
próxima é despejada antes da inclusão — bloqueios ativos são preservados, de
modo que o teto de memória não cria bloqueio global nem permite que um churn
barato apague uma proteção ativa.

A chave composta evita que um atacante em uma origem bloqueie o acesso legítimo
da mesma conta a partir de outra. Em contrapartida, uma botnet que troque de
endereço obtém uma janela nova.

Duas limitações deliberadas do piloto:

1. **Os contadores vivem na memória de cada instância.** São perdidos em
   reinicialização e não são compartilhados entre réplicas. Antes de escalar
   horizontalmente, o armazenamento precisa migrar para Redis ou outro
   mecanismo distribuído com incremento atômico e expiração. Aumentar o número
   de instâncias mantendo o limitador local faria cada réplica aplicar uma
   janela independente.
2. **`forward-headers-strategy=framework` confia no proxy.** É o que faz
   `getRemoteAddr()` refletir o cliente encaminhado. Isso pressupõe um proxy
   confiável que remova ou sobrescreva `Forwarded` e `X-Forwarded-*` enviados
   pelo cliente. Exposta diretamente à internet, a aplicação permitiria trocar
   a chave do limitador.

Antes de abrir cadastro público ou receber tráfego relevante, acrescente limites
por origem, proteção no edge/WAF e monitoração de falhas.

Novos fluxos que exigem decisão do cliente devem sempre receber um código
específico. Algumas regras operacionais antigas ainda usam
`BUSINESS_RULE_VIOLATION` e preservam a mensagem como detalhe; a evolução desses
códigos deve ser feita junto com os catálogos PT/EN para não romper o contrato
visual existente.

### Dois healthchecks

`/actuator/health` permanece público, sem detalhes, porque o Render não possui
um JWT de usuário para promover ou reiniciar uma instância. `/api/health`
continua autenticado e valida o caminho usado pelas demais rotas da aplicação.

## Auditoria de consultas N+1

### Critério

Uma consulta N+1 acontece quando a quantidade de SQL cresce junto com a
quantidade de linhas retornadas, normalmente pela inicialização repetida de uma
associação `LAZY`.

A revisão combinou inspeção dos relacionamentos JPA com testes de orçamento de
consultas usando `Hibernate Statistics`. Os testes criam cinco registros,
consultam uma página com três itens e falham se o Hibernate fizer uma consulta
adicional por linha.

### Fluxos revisados

| Fluxo | Estratégia | Limite de statements |
|---|---|---:|
| Lista de viagens | página com `veiculo`/`motorista` via `JOIN FETCH` + cidades em lote | 3 |
| Candidatos a romaneio | página de viagens + trechos em lote + IDs de romaneio em lote | 4 |
| Lista de manutenções | página de IDs + `EntityGraph` para veículo, itens e catálogo | 3 |
| Lista simples de veículos | IDs em uso, IDs em manutenção e veículos | 3 |
| Lista de motoristas | IDs em uso e motoristas | 2 |
| Romaneios emitidos | página de IDs + documento/itens em lote | 3 |
| Detalhe da viagem | viagem, trechos e eventos | 3 |
| Dashboard | consultas agregadas fixas; não percorre entidades JPA | quantidade constante |

O `count` da paginação está incluído nos limites. Em páginas finais o Spring
pode omiti-lo, então os testes usam mais registros que o tamanho da página.

### Problema corrigido

A criação e a edição de uma manutenção chamavam `findById` uma vez para cada
serviço solicitado. O catálogo agora recebe todos os IDs e executa um único
`findAllById`, validando em memória serviços ausentes ou inativos. Inserts dos
itens continuam naturalmente proporcionais à quantidade gravada; o problema
eliminado foi a multiplicação de `SELECT`s.

### Proteção contra regressão

Os limites estão em `NPlusOneQueryIT`. Um novo campo de DTO que atravesse uma
associação não carregada fará o número de statements ultrapassar o orçamento e
quebrará a suíte antes de chegar à produção.
