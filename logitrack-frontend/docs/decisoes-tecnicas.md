# Decisões técnicas

## Next como Backend for Frontend

O navegador não chama a API Spring diretamente. O Next recebe a requisição, lê o JWT do cookie
`HttpOnly` e envia `Authorization: Bearer` ao backend. Isso evita `localStorage`, centraliza erros e
permite que as páginas sejam renderizadas no servidor.

A alternativa seria uma SPA convencional, com o React chamando a API e guardando o token no
navegador. Ela foi descartada pelo modelo de ameaça: se o JavaScript precisa montar o header
`Authorization`, o token tem de estar em algum lugar que o JavaScript leia — e aí qualquer XSS, seja
por dependência comprometida ou por injeção de conteúdo, consegue **extrair a credencial** e usá-la
depois, de outro lugar. Com o token em cookie `HttpOnly`, um XSS ainda age dentro da aba aberta, mas
não leva a sessão embora.

O BFF trouxe outros três ganhos que reforçam a escolha: permite provar à API que a chamada vem do
frontend confiável, por segredo compartilhado que nunca chega ao navegador; permite que a API fique
em rede privada, sem exposição pública; e elimina CORS da aplicação, já que o navegador conversa
apenas com a mesma origem.

O custo é real e assumido: um serviço a mais para publicar, um salto extra de rede, e o fato de as
chamadas à API não aparecerem na aba Network do navegador, o que muda o lugar onde se depura. Há
ainda uma consequência específica: como todo login parte do servidor Next, a API veria todas as
tentativas vindo de um mesmo endereço — por isso o frontend envia um identificador anônimo de
navegador, para que a limitação de tentativas continue isolando quem erra a senha.

O proxy verifica a presença do cookie para decidir a navegação. Um segundo cookie `HttpOnly`, sem
credencial, marca a troca obrigatória da senha inicial e limita a navegação a `/alterar-senha`.
A assinatura, expiração, perfil e situação do usuário continuam sendo validados pelo Spring. Um
`401` limpa a sessão antes de voltar ao login, evitando ciclos de redirecionamento.

Em produção, o cookie usa `Secure`, `HttpOnly`, `SameSite=Lax` e o mesmo prazo do JWT.

O logout remove o cookie, o que encerra a sessão do navegador, mas não revoga um token que já tenha
sido copiado — consequência direta de o JWT ser stateless. Revogação imediata exigiria manter estado
no servidor, por lista de `jti` ou sessão persistida, e isso troca a simplicidade do stateless por
uma consulta a cada requisição. A troca só se justifica se invalidação instantânea virar requisito;
hoje a mitigação é a expiração curta do token e o versionamento de credenciais, que invalida sessões
anteriores na troca de senha.

Ao trocar a senha, a API invalida a credencial anterior e devolve um novo `LoginResponse`. A Server
Action substitui o JWT e sua expiração diretamente no cookie `HttpOnly` antes do redirecionamento e
só então remove o marcador de troca obrigatória. O token novo nunca é serializado para um componente
client nem fica disponível ao JavaScript do navegador.

### Claims do JWT lidas apenas para apresentação

O servidor Next decodifica o payload do JWT para dois usos visuais: a inicial do avatar, a partir do
`sub`, e a decisão de exibir o menu administrativo, a partir do perfil.

Essa leitura **não é autorização** e não substitui verificação de assinatura. Quem valida assinatura,
expiração e o perfil atual do usuário é o backend, que recarrega a role do banco a cada requisição.
Uma requisição forjada continua recebendo `403`.

Essa mesma leitura orienta a experiência das páginas de frota, motoristas e catálogo de serviços.
O Server Component converte o perfil em uma capacidade booleana: o gestor recebe os controles de
mutação e o operador mantém busca, filtros, exportação e consulta. Os componentes não conhecem os
nomes dos perfis, e uma requisição forjada continua sujeita ao RBAC da API Spring.

## Configuração da API

`API_BASE_URL` é obrigatória em produção e aceita apenas HTTP/HTTPS. Em desenvolvimento existe o
fallback `http://localhost:8080`. `API_REQUEST_TIMEOUT_MS` impede que uma chamada ao backend deixe
uma renderização pendurada indefinidamente.

Chamadas públicas e autenticadas compartilham o mesmo cliente para manter parsing de resposta,
tratamento de `204`, timeout e erros consistentes.

## Internacionalização

`next-intl` carrega o catálogo definido pelo cookie de preferência. Português e inglês têm de
conter as mesmas chaves e variáveis ICU. Essa regra é um teste Vitest, em vez de um script isolado,
para que `npm test` seja a única entrada da suíte automatizada.

Texto de interface nunca é escrito direto no componente: vai para o catálogo.

Dado criado pelo usuário, ao contrário, **nunca é traduzido** — o nome de um serviço cadastrado pela
operação aparece exatamente como foi digitado. A única exceção é um conjunto fechado de nomes que
acompanham a massa de demonstração (`troca de oleo`, `revisao de freios`, `alinhamento`, `troca de
pneus`): eles têm chave de tradução correspondente, para que a demonstração em inglês não exiba
rótulos em português. O mapeamento é explícito e por nome normalizado, não uma heurística que possa
alcançar dado real.

## Tema

As cores semânticas ficam em `globals.css`. O tema escuro redefine tokens no elemento `<html>`,
evitando variantes `dark:` espalhadas por toda a aplicação. Um script mínimo no layout aplica a
preferência antes da hidratação para impedir o flash do tema incorreto.

## Datas sem fuso

O backend fornece `LocalDate` e `LocalDateTime`, que representam horário de parede e não um instante.
Esses valores são separados e formatados sem aplicar o fuso do processo. Apenas datas com offset,
como a expiração do login, são convertidas diretamente para `Date`.

Essa distinção evita que um horário salvo como 05:21 apareça como 02:21 quando o container estiver
em UTC.

## Erros e resiliência

O cliente converte respostas da API em `ApiRequestError`, `UnauthorizedError` ou `NotFoundError`.
Páginas usam um error boundary comum. Alertas de manutenção são complementares e usam fallback:
uma falha nessa consulta não deve impedir o restante da aplicação de abrir.

A tradução de erro tem duas vias, em `shared/api/api-error-localization.ts`: o campo estável `code`
do `ApiError`, preferido, e o casamento exato da mensagem em português, herdado dos fluxos anteriores.
São 9 códigos contra 90 mensagens literais.

A via por `code` é a que se quer, porque desacopla a tradução do texto devolvido pela API. Enquanto
existirem mensagens casadas literalmente, mudar o texto de um erro no backend quebra a tradução em
silêncio — por isso toda regra nova recebe um código próprio.

## Validação de entrada

A validação acontece em três camadas, com propósitos diferentes:

| Camada | Propósito | Protege? |
|---|---|---|
| Atributos do input (`min`, `max`, `maxLength`, `inputMode`) | impedir digitar o valor errado | não — o DevTools os remove |
| Server Action | erro por campo antes de gastar uma chamada à API | não — Server Action é endpoint HTTP e pode ser chamada direto |
| Bean Validation e regras de domínio no backend | **a autoridade** | sim |

As duas primeiras existem pela experiência: descobrir o limite depois de preencher o formulário
inteiro é pior do que não conseguir digitá-lo. Nenhuma delas dispensa a terceira.

Dois casos merecem nota:

**Dígitos apenas.** `inputMode="numeric"` é dica de teclado mobile e não impede letras no desktop.
Onde o campo é numérico por natureza — CNPJ, CNH — a limpeza acontece no evento de entrada, o que
também cobre colagem e arraste, e a Server Action normaliza antes de enviar.

**Janela de datas.** Os limites `min`/`max` dos campos de data replicam a janela aceita pelo backend,
e os valores precisam ser iguais nos dois lados: divergir produz o pior cenário, com o input aceitando
o que o servidor recusa. Ver `shared/lib/date-window.ts`.

## Exportações e documentos

CSV e SpreadsheetML compartilham serialização, escaping e neutralização de valores iniciados por
`=`, `+`, `-` ou `@`, reduzindo risco de fórmula executável ao abrir uma planilha.

Romaneios aceitam CSV e SpreadsheetML (`.xls` XML), formatos que o próprio sistema consegue gerar e
interpretar sem uma biblioteca pesada. `.xlsx` não é aceito porque é um pacote ZIP e exigiria outro
parser. O usuário recebe modelos nos formatos suportados.

O PDF é criado no navegador a partir da folha visível. `html2canvas-pro` é necessário porque entende
as funções de cor geradas pelo Tailwind 4; `jspdf` monta o arquivo. Ambos são importados somente no
clique de download para não aumentar o carregamento inicial.

## Cadastro por convite

O cadastro público permanece fechado. Um gestor gera um link individual em `/usuarios`; perfil e
e-mail ficam fixados no convite, que possui expiração e uso único. O destinatário abre `/convite`,
onde o Next valida o token no backend antes de mostrar o formulário. Somente nome e senha são
definidos na ativação.

O token de convite aparece inevitavelmente no link recebido, mas não é reutilizado como sessão e
o backend armazena somente seu hash. A página define `Referrer-Policy: no-referrer` para não enviar
o token a destinos externos. O JWT de sessão permanece exclusivamente no cookie `HttpOnly`.
