# Decisões técnicas

## Next como Backend for Frontend

O navegador não chama a API Spring diretamente. O Next recebe a requisição, lê o JWT do cookie
`HttpOnly` e envia `Authorization: Bearer` ao backend. Isso evita `localStorage`, centraliza erros e
permite que as páginas sejam renderizadas no servidor.

O proxy verifica somente a presença do cookie para decidir a navegação. A assinatura, expiração e
situação do usuário continuam sendo validadas pelo Spring. Um `401` limpa o cookie antes de voltar
ao login, evitando ciclos de redirecionamento.

Em produção, o cookie usa `Secure`, `HttpOnly`, `SameSite=Lax` e o mesmo prazo do JWT. O logout atual
remove o cookie, mas não revoga um token já copiado; revogação por `jti` ou sessão persistida é uma
evolução do backend caso invalidação imediata se torne requisito.

### Inicial do avatar

O avatar usa a inicial do `sub` do JWT, que atualmente contém o e-mail. O payload é lido no servidor
somente para personalização visual e nunca participa de autorização. Toda autorização continua no
backend, que valida a assinatura do token.

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

O backend ainda devolve mensagens de negócio em português. O frontend possui um mapeamento para
chaves i18n, mas isso mantém acoplamento textual. A evolução correta é acrescentar um campo `code`
estável ao `ApiError` e manter a mensagem apenas como fallback durante a migração.

## Exportações e documentos

CSV e SpreadsheetML compartilham serialização, escaping e neutralização de valores iniciados por
`=`, `+`, `-` ou `@`, reduzindo risco de fórmula executável ao abrir uma planilha.

Romaneios aceitam CSV e SpreadsheetML (`.xls` XML), formatos que o próprio sistema consegue gerar e
interpretar sem uma biblioteca pesada. `.xlsx` não é aceito porque é um pacote ZIP e exigiria outro
parser. O usuário recebe modelos nos formatos suportados.

O PDF é criado no navegador a partir da folha visível. `html2canvas-pro` é necessário porque entende
as funções de cor geradas pelo Tailwind 4; `jspdf` monta o arquivo. Ambos são importados somente no
clique de download para não aumentar o carregamento inicial.

## Cadastro por convite planejado

O cadastro público permanece fechado. A evolução planejada é um link de convite individual, de uso
único e com expiração. O backend deverá armazenar somente o hash do token e fixar o perfil no
convite; o formulário não poderá escolher privilégios. Esta funcionalidade ainda não está
implementada.
