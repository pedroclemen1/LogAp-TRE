# Autenticação e autorização

## Contas e primeiro acesso

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

## Convites

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

## Matriz de permissões

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

## Tokens e respostas de erro

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

O limitador atual guarda contadores apenas na instância da API e atende ao
piloto de instância única. Suas limitações e a migração necessária para Redis e
proteção de edge antes de escalar estão em `deploy-render.md`.

Novos fluxos que exigem decisão do cliente devem sempre receber um código
específico. Algumas regras operacionais antigas ainda usam
`BUSINESS_RULE_VIOLATION` e preservam a mensagem como detalhe; a evolução desses
códigos deve ser feita junto com os catálogos PT/EN para não romper o contrato
visual existente.

## Dois healthchecks

`/actuator/health` permanece público, sem detalhes, porque o Render não possui
um JWT de usuário para promover ou reiniciar uma instância. `/api/health`
continua autenticado e valida o caminho usado pelas demais rotas da aplicação.
