# Decisões técnicas

## Next como Backend for Frontend

O navegador não chama a API Spring diretamente. O Next recebe a requisição, lê o JWT do cookie
`HttpOnly` e envia `Authorization: Bearer` ao backend. Isso evita `localStorage`, centraliza erros e
permite que as páginas sejam renderizadas no servidor.

O proxy verifica a presença do cookie para decidir a navegação. Um segundo cookie `HttpOnly`, sem
credencial, marca a troca obrigatória da senha inicial e limita a navegação a `/alterar-senha`.
A assinatura, expiração, perfil e situação do usuário continuam sendo validados pelo Spring. Um
`401` limpa a sessão antes de voltar ao login, evitando ciclos de redirecionamento.

Em produção, o cookie usa `Secure`, `HttpOnly`, `SameSite=Lax` e o mesmo prazo do JWT. O logout atual
remove o cookie, mas não revoga um token já copiado; revogação por `jti` ou sessão persistida é uma
evolução do backend caso invalidação imediata se torne requisito.

Ao trocar a senha, a API invalida a credencial anterior e devolve um novo `LoginResponse`. A Server
Action substitui o JWT e sua expiração diretamente no cookie `HttpOnly` antes do redirecionamento e
só então remove o marcador de troca obrigatória. O token novo nunca é serializado para um componente
client nem fica disponível ao JavaScript do navegador.

### Inicial do avatar

O avatar usa a inicial do `sub` do JWT, que atualmente contém o e-mail. O payload também informa se
o menu administrativo deve ser mostrado, mas é lido no servidor somente para apresentação e nunca
participa da autorização efetiva. Toda autorização continua no backend, que valida a assinatura e
o perfil atual do usuário.

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

Textos de interface nunca devem ser introduzidos diretamente em componentes quando dependem de
idioma. Dados criados pelo usuário são preservados; somente nomes demonstrativos conhecidos podem
ser associados a traduções predefinidas.

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

O frontend prioriza o campo estável `code` do `ApiError` nos fluxos novos e mantém a mensagem como
fallback durante a migração dos erros anteriores. Isso permite traduzir regras de negócio sem
acoplamento ao texto em português devolvido pela API.

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
