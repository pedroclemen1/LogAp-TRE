# Dicionário de campos

Referência de preenchimento de todos os formulários da aplicação: formato aceito, limites, valores
válidos e a mensagem exibida quando a regra não é atendida.

Cada regra desta página é aplicada pelo backend, que é a autoridade. Os campos da interface repetem os
limites para evitar que a pessoa descubra a restrição depois de preencher o formulário inteiro, mas
nenhuma validação depende do navegador.

**Convenções desta página**

- **Obrigatório** significa que a operação é recusada sem o campo.
- `8 inteiros, 2 decimais` significa valor máximo `99.999.999,99`.
- Campos de decimal aceitam vírgula ou ponto na interface; o envio é normalizado.

---

## Veículo

| Campo | Obrigatório | Formato e limites | Exemplo |
|---|:---:|---|---|
| **Placa** | sim | 3 letras + 4 caracteres, no padrão antigo `ABC-1234` ou Mercosul `ABC1D23`. O hífen é opcional. Máximo 10 caracteres | `ABC-1234` |
| **Modelo** | sim | texto livre, até 50 caracteres | `Volvo FH` |
| **Tipo** | sim | apenas `LEVE` ou `PESADO` (seleção) | `PESADO` |
| **Ano** | sim | inteiro entre **1950 e 2100** | `2023` |
| **Quilometragem inicial** | sim | número ≥ **0**, com 8 inteiros e 2 decimais | `312050.00` |

### Detalhes que geram dúvida

**A placa é validada por expressão regular**, não apenas por tamanho:
`^[A-Z]{3}-?\d[A-Z0-9]\d{2}$`. Em letras maiúsculas. Isso aceita os dois padrões que circulam no
Brasil e recusa combinações que não existem. Placa inválida devolve
*"Placa invalida. Use o formato ABC-1234 ou ABC1D23."*

**Zero é um valor válido para quilometragem.** É exatamente o que se informa em veículo novo, e a
própria mensagem de campo vazio diz: *"Informe a quilometragem. Use 0 para veiculo zero-quilometro."*
O que não se aceita é valor **negativo**.

Esse campo é o hodômetro **de entrada**, registrado uma vez no cadastro. O hodômetro atual não é
digitado: ele é calculado somando as viagens concluídas do veículo.

**O ano aceita até 2100 de propósito.** Fabricantes emplacam o modelo do ano seguinte, então validar
contra o ano corrente exato recusaria cadastro legítimo feito em novembro ou dezembro.

**A placa é única.** Cadastrar uma placa que já existe devolve conflito, não erro de formato.

---

## Motorista

| Campo | Obrigatório | Formato e limites | Exemplo |
|---|:---:|---|---|
| **Nome** | sim | texto livre, até 100 caracteres | `Maria Souza` |
| **CNH** | sim | exatamente **11 dígitos numéricos**, sem pontos, espaços ou letras | `01234567890` |
| **Telefone** | não | texto livre, até 20 caracteres | `(84) 99999-0000` |

### Detalhes que geram dúvida

**A CNH tem exatamente 11 dígitos** — nem 10, nem 12. A regra é `^\d{11}$` e vale nas três camadas: o
campo da interface só aceita dígitos e limita a 11, a validação do servidor confere a quantidade, e o
banco tem uma restrição `CHECK (cnh ~ '^[0-9]{11}$')`. Quantidade errada devolve *"A CNH deve conter
exatamente 11 digitos."*

Não há verificação de dígito verificador: qualquer sequência de 11 dígitos é aceita. Isso é
intencional, para não travar dado de teste.

**A CNH é única.** Duas pessoas não podem ter a mesma, e a tentativa devolve conflito.

**O telefone aceita qualquer formato.** Não há máscara nem validação de padrão, porque telefone
comercial, celular e ramal têm formatos diferentes e inventar uma regra recusaria número legítimo.

**Motorista não é excluído, é desativado.** E a desativação é **recusada** enquanto existir viagem
programada ou em andamento atribuída a ele — para não deixar um plano operacional apontando para
alguém indisponível.

---

## Serviço de manutenção (catálogo)

| Campo | Obrigatório | Formato e limites | Exemplo |
|---|:---:|---|---|
| **Nome** | sim | texto livre, até 100 caracteres | `Troca de Óleo` |

**A unicidade ignora caixa e espaços em volta.** `Troca de Óleo`, `troca de óleo` e `  Troca de Óleo  `
são considerados o mesmo serviço, porque a restrição é sobre `LOWER(TRIM(nome))`. Isso impede o
catálogo encher de duplicatas que só diferem visualmente.

---

## Viagem

### Dados da viagem

| Campo | Obrigatório | Formato e limites | Exemplo |
|---|:---:|---|---|
| **Veículo** | sim | seleção entre veículos cadastrados | — |
| **Motorista** | **não** | seleção entre motoristas ativos | — |
| **Data e hora de saída** | sim | data e hora dentro da janela aceita (ver abaixo) | `2026-08-20 08:00` |
| **Cidade de origem** | sim | texto livre, até 100 caracteres | `Natal` |
| **Trechos** | sim | de **1 a 30** trechos | — |

### Cada trecho da rota

| Campo | Obrigatório | Formato e limites | Exemplo |
|---|:---:|---|---|
| **Destino** | sim | texto livre, até 100 caracteres | `Recife` |
| **Quilometragem do trecho** | sim | número **maior que zero**, 8 inteiros e 2 decimais | `297.50` |
| **Carga (kg)** | sim | número ≥ **0**, 8 inteiros e 2 decimais | `12000.00` |
| **Previsão de chegada** | não | data e hora dentro da janela aceita | `2026-08-20 17:30` |

### Detalhes que geram dúvida

**Aqui a quilometragem não pode ser zero** — diferente do cadastro de veículo. Um trecho de 0 km não
representa deslocamento, então a regra é *maior que* zero: *"A quilometragem do trecho deve ser maior
que zero."* Já a **carga aceita zero**, porque um trecho de retorno vazio é uma operação real.

**O motorista é opcional na criação**, mas obrigatório para **iniciar** a viagem. Uma viagem pode ser
programada antes de saber quem vai dirigir.

**A origem é digitada uma vez.** O destino de cada trecho é a origem do trecho seguinte — só a origem
da viagem é informada separadamente. O destino final da viagem é o destino do último trecho.

**As previsões precisam seguir a ordem da rota.** A previsão de um trecho não pode ser anterior à
partida nem à previsão do trecho anterior. Fora de ordem devolve *"As previsoes dos trechos devem
seguir a ordem da rota."*

**A quilometragem total da rota também tem teto:** a soma dos trechos não pode exceder
`99.999.999,99`.

**Um veículo só pode estar em uma viagem em andamento.** E um motorista também. A tentativa de
iniciar uma segunda é recusada, mesmo em requisições simultâneas.

---

## Manutenção

### Dados da ordem

| Campo | Obrigatório | Formato e limites | Exemplo |
|---|:---:|---|---|
| **Veículo** | sim | seleção entre veículos cadastrados | — |
| **Início previsto** | sim | data dentro da janela aceita | `2026-08-25` |
| **Finalização prevista** | sim | data ≥ início previsto, dentro da janela | `2026-08-27` |
| **Serviços** | sim | de **1 a 30** serviços | — |

### Cada serviço da ordem

| Campo | Obrigatório | Formato e limites | Exemplo |
|---|:---:|---|---|
| **Serviço** | sim | seleção no catálogo, sem repetir na mesma ordem | — |
| **Custo** | sim | número ≥ **0**, 8 inteiros e 2 decimais | `350.00` |

### Detalhes que geram dúvida

**A finalização prevista pode ser igual ao início** — manutenção de um dia é válida. O que se recusa é
finalização **anterior** ao início: *"A finalizacao prevista nao pode ser anterior ao inicio
previsto."*

**O custo aceita zero**, porque existe serviço em garantia ou cortesia.

**O mesmo serviço não pode entrar duas vezes na mesma ordem.** Para dobrar a quantidade, ajusta-se o
custo da linha existente.

**O custo total não é digitado.** Ele é a soma das linhas de serviço.

**A data planejada não reserva o veículo.** Só uma manutenção **em realização** ocupa o recurso — o
que permite planejar várias ordens futuras para o mesmo veículo. E um veículo não pode estar em duas
manutenções em realização ao mesmo tempo.

**Ordem concluída é imutável.** Não é possível editar nem excluir depois de concluída.

---

## Romaneio de carga

### Dados do documento

| Campo | Obrigatório | Formato e limites | Exemplo |
|---|:---:|---|---|
| **Razão social da transportadora** | sim | texto livre, até 150 caracteres | `TransLogística Brasil S/A` |
| **CNPJ** | sim | exatamente **14 dígitos numéricos**, sem pontos, barra ou traço | `12345678000190` |
| **Registro ANTT** | não | texto livre, até 20 caracteres | `48291048` |
| **Descrição do veículo** | sim | texto livre, até 100 caracteres | `Carreta Baú 3 Eixos` |
| **Endereço de origem** | não | texto livre, até 200 caracteres | `Rod. BR-101, Km 12` |
| **Endereço de destino** | não | texto livre, até 200 caracteres | `Av. Central, 900` |
| **Itens** | sim | de **1 a 50** itens | — |

### Cada item da carga

| Campo | Obrigatório | Formato e limites | Exemplo |
|---|:---:|---|---|
| **Nota fiscal** | sim | texto livre, até 30 caracteres, sem repetir no documento | `NF-001248` |
| **Destinatário** | sim | texto livre, até 150 caracteres | `Indústrias Alfa Ltda` |
| **Volumes** | sim | inteiro de **1 a 999.999** | `12` |
| **Peso (kg)** | sim | número ≥ **0**, 8 inteiros e 2 decimais | `450.50` |

### Detalhes que geram dúvida

**O CNPJ é digitado sem pontuação.** O campo aceita apenas dígitos e para em 14. Se você **colar** um
CNPJ formatado como `12.345.678/0001-90`, a pontuação é descartada automaticamente e o valor é aceito
— mas digitar letra ou quantidade diferente de 14 dígitos devolve *"O CNPJ deve conter exatamente 14
digitos, sem pontuacao."*

A exibição no documento reaplica a máscara: você digita `12345678000190` e o romaneio mostra
`12.345.678/0001-90`.

Não há verificação de dígito verificador — qualquer sequência de 14 dígitos serve, o que mantém dado
de teste livre.

**Volumes começa em 1**, porque item sem volume não é carga. Já o **peso aceita zero**, para
mercadoria cuja pesagem não se aplica.

**A nota fiscal não pode repetir dentro do mesmo romaneio.** A verificação ignora caixa.

**Motorista, CNH, placa, cidades e distância não são digitados.** Eles são copiados da viagem e do
trecho ao emitir, justamente para o documento não divergir do que está cadastrado.

**Um romaneio cobre um trecho**, não a viagem inteira. Trechos diferentes da mesma viagem geram
documentos distintos.

---

## Datas: a janela aceita

Todos os campos de data e hora da aplicação aceitam valores entre **5 anos atrás** e **2 anos à
frente**, contados a partir de hoje.

| | |
|---|---|
| Aceita | lançamento retroativo e planejamento futuro |
| Recusa | data absurda, como ano `9999` |
| Mensagem | *"A data de saida deve estar entre {início} e {fim}."* |

A janela é ampla de propósito: o objetivo é recusar o absurdo, não policiar a operação. Registrar uma
viagem de dois anos atrás é legítimo; agendar para o ano 9999 contaminaria a agenda, o dashboard e a
projeção financeira.

Os limites acompanham a data atual, e não um ano fixo, então a regra não expira com o tempo.

---

## Autenticação

### Login

| Campo | Obrigatório | Formato e limites |
|---|:---:|---|
| **E-mail** | sim | e-mail válido, até 150 caracteres |
| **Senha** | sim | até 72 caracteres |

**Cinco tentativas erradas em 15 minutos bloqueiam novas tentativas** para aquela combinação de
e-mail e origem, até o fim da janela. A resposta informa quanto tempo esperar. Um login correto limpa
o contador imediatamente.

**E-mail inexistente e senha errada devolvem a mesma mensagem** — *"E-mail ou senha invalidos."* Isso é
deliberado: distinguir os dois casos permitiria descobrir quais e-mails têm conta.

### Convite de usuário (somente gestor)

| Campo | Obrigatório | Formato e limites |
|---|:---:|---|
| **E-mail** | sim | e-mail válido, até 150 caracteres |
| **Perfil** | sim | `OPERADOR` ou `GESTOR` |

O convite **expira em 48 horas**, é de **uso único**, e emitir um novo convite para o mesmo e-mail
**revoga o anterior**. O e-mail e o perfil ficam fixados no convite e não podem ser alterados na
ativação.

### Ativação do convite

| Campo | Obrigatório | Formato e limites |
|---|:---:|---|
| **Nome** | sim | texto livre, até 100 caracteres |
| **Senha** | sim | **mínimo 12 caracteres**, máximo 72 bytes |

### Troca de senha

| Campo | Obrigatório | Formato e limites |
|---|:---:|---|
| **Senha atual** | sim | até 72 caracteres |
| **Nova senha** | sim | mínimo 12 caracteres, máximo 72 bytes, diferente da atual |

### Regras de senha

| Regra | Mensagem |
|---|---|
| Mínimo 12 caracteres | *"A senha deve possuir ao menos 12 caracteres."* |
| Máximo 72 **bytes** | *"A senha excede o limite de 72 bytes do BCrypt."* |
| Diferente da atual | erro de reutilização |

O limite superior é em **bytes**, não caracteres, porque é o máximo que o BCrypt processa — acima
disso o restante seria silenciosamente ignorado. Com acentos ou emoji, um caractere ocupa mais de um
byte, então 72 caracteres acentuados podem exceder o limite.

**A troca de senha encerra a sessão anterior.** Ao trocar, todos os acessos abertos com a senha antiga
deixam de valer imediatamente e você recebe uma sessão nova.

---

## O que cada perfil pode fazer

| Operação | OPERADOR | GESTOR |
|---|:---:|:---:|
| Consultar dashboard e todos os módulos | sim | sim |
| Criar e operar viagens, manutenções e romaneios | sim | sim |
| Exportar listagens | sim | sim |
| Cadastrar e editar **veículos** | não | sim |
| Cadastrar e editar **motoristas** | não | sim |
| Cadastrar e editar o **catálogo de serviços** | não | sim |
| Convidar usuários | não | sim |
| Trocar a própria senha | sim | sim |

Um operador não vê os botões de cadastro dessas três telas. Mesmo que a interface fosse forçada, a
operação seria recusada pelo servidor: o controle está no backend, que recarrega o perfil do usuário
a cada requisição — desativar uma conta ou mudar um perfil passa a valer na hora.

---

## Valores fixos do sistema

| Conjunto | Valores aceitos |
|---|---|
| Tipo de veículo | `LEVE`, `PESADO` |
| Status de manutenção | `PENDENTE`, `EM_REALIZACAO`, `CONCLUIDA` |
| Perfil de usuário | `OPERADOR`, `GESTOR` |
| Status de viagem | derivado, não digitado: `PROGRAMADA`, `EM_ANDAMENTO`, `CONCLUIDA`, `CANCELADA` |

**O status da viagem não é um campo.** Ele é calculado a partir dos fatos registrados: iniciar,
concluir ou cancelar. Não existe como escolher "em andamento" num formulário — o status é consequência
da operação executada.
