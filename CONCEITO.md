# FraudLock — Documento de Conceito

> Este documento registra a visão, a tese econômica e os limites honestos do
> FraudLock. Ele é a referência estável do projeto, separada dos protótipos
> em HTML. Nada aqui é promessa de produto pronto: é arquitetura conceitual
> a ser validada.

## 1. A frase que resume o projeto

**O FraudLock não precisa impedir que o ladrão desmonte o celular. Precisa
impedir que ele transforme o celular roubado — ou suas peças — em mercadoria
legítima.**

O alvo não é o aparelho. É a **economia do aparelho roubado**.

## 2. A tese econômica

Um celular é roubado porque tem valor de revenda. As proteções atuais atacam
o uso do aparelho; o FraudLock ataca o **valor** dele, em duas frentes
simultâneas:

1. **O aparelho inteiro perde valor** — declarado roubado pelo dono, o
   dispositivo carrega um status 🔴 consultável por qualquer comprador,
   loja ou assistência. O mercado legítimo deixa de querer comprá-lo.
2. **As peças perdem valor** — componentes retirados de um aparelho
   comprometido carregam a "história" da origem. Uma tela pode funcionar
   fisicamente, mas registra procedência 🔴 quando consultada.

Resultado: valor do aparelho ↓ **e** valor das peças ↓ ao mesmo tempo.
O roubo deixa de compensar.

## 3. Os três estados de procedência

| Estado | Significado |
|---|---|
| 🟢 **LEGÍTIMA** | Vinculada a dispositivo regular, cadeia de propriedade íntegra |
| 🟠 **PROCEDÊNCIA INCONSISTENTE** | Pode ser legítima, mas há inconsistência de origem ou histórico (identificadores que não batem entre si, histórico incompleto) |
| 🔴 **COMPROMETIDA** | Vinculada a aparelho declarado roubado ou a cadeia de procedência incompatível |

O estado 🟠 é decisão de projeto essencial: ele permite que o mercado de
usados e de reparo **legítimo** continue existindo. Um sistema binário
(liberado/bloqueado) criminalizaria o reuso honesto. A transferência formal
de propriedade — venda legal de um usado — "libera" o aparelho e suas peças;
peça retirada de aparelho roubado nunca recebe essa autorização.

## 4. O que o caso Frank Mobile ensina (estudo de caso)

Em setembro de 2026, a Operação Frank Mobile (polícias de SP + MP-SP)
desbaratou uma organização especializada em desbloqueio, recondicionamento e
comercialização de celulares roubados. O relatório do MP, noticiado pelo
UOL/Tilt, descreve o arsenal do crime organizado:

- **Edição de IMEI por software**: o aparelho bloqueado passa a se
  apresentar à rede com outra identificação.
- **Troca de placa-mãe**: substitui o IMEI original por um novo — o
  "chassi" do celular é trocado.
- **Bypass das proteções de fabricante**: restauração de fábrica forçada em
  Android sem senha ou login Google; servidores para desbloquear contas
  iCloud; ferramentas para contornar o pareamento de peças da Apple.
- **Serviço barato e acessível**: lojas chegavam a cobrar cerca de R$ 300
  para "desbloquear" celulares roubados.
- **Dois destinos**: revenda como seminovo/recondicionado, ou desmonte em
  peças usadas na manutenção de outros aparelhos.

### O que isso valida na tese do FraudLock

1. **O bloqueio de IMEI sozinho não resolve** — como afirma o presidente do
   Ibrinc na própria reportagem, ele "não impede totalmente a reutilização".
   O bloqueio atua na rede; o mercado do crime atua na *identidade* do
   aparelho.
2. **As proteções atuais são ilhas** — IMEI (Anatel/operadoras), Activation
   Lock (Apple), FRP (Google) não conversam entre si. O criminoso derruba
   uma de cada vez. A tese do FraudLock — uma camada de procedência
   *agnóstica de fabricante*, acima das ilhas — nasce exatamente dessa
   fragmentação.
3. **O desmonte já é a rota de fuga do crime** — quando o aparelho inteiro
   fica difícil de vender, as peças viram a mercadoria. A frente 2 do
   FraudLock (procedência de componentes) não é complemento: é a resposta
   ao movimento que o mercado criminoso já fez.

### O que isso expõe como fragilidade a enfrentar

Honestidade técnica: o caso também mostra o ataque que derrota qualquer
registro ingênuo.

- **Se a identidade do aparelho for só o IMEI, editar o IMEI apaga a
  história.** Um registro consultado pelo IMEI novo devolve "limpo".
- **Se a identidade for só a placa-mãe, trocar a placa cria um aparelho
  "novo"** — com tela, câmera e carcaça roubadas dentro dele.
- **Até o pareamento de peças da Apple está sendo contornado** por
  ferramentas dedicadas. Nenhuma barreira puramente técnica é definitiva.

### Como o conceito responde

- **Identidade multi-âncora, não identificador único.** A identidade
  FraudLock deve cruzar múltiplos sinais (IMEI, número de série, seriais de
  componentes, características do hardware). Identificadores que não batem
  entre si não devolvem "limpo" — devolvem 🟠 PROCEDÊNCIA INCONSISTENTE.
  O criminoso que edita o IMEI não ganha um aparelho verde; ganha um
  aparelho laranja, que o comprador informado recusa.
- **A troca de placa não limpa as outras peças.** É exatamente aqui que a
  camada de componentes fecha o cerco: a placa nova carrega IMEI novo, mas
  a tela, a câmera e o módulo biométrico continuam registrados como
  originários do aparelho 🔴. Para "limpar" tudo, o criminoso teria que
  trocar quase todas as peças — e nesse ponto o roubo já não compensa.
- **O registro vive no servidor, não no aparelho.** Diferente do Activation
  Lock, que o criminoso ataca dentro do dispositivo, a história de
  procedência não pode ser apagada por software instalado no celular. O que
  o criminoso consegue é *mudar a chave de consulta* — e a resposta a isso
  é a multi-âncora acima, mais a pressão do lado da demanda.
- **A barreira final é econômica, não técnica.** O FraudLock não impede a
  peça de funcionar. Ele faz com que qualquer comprador *possa* consultar —
  e quem não consulta assume risco rastreável. Assistência que instala peça
  🔴 tem responsabilidade documentada. É a mesma lógica que faz o mercado
  de carros exigir o documento antes do negócio.

## 5. Fronteira de viabilidade (o que não prometer)

- **Pareamento físico de peças exige o fabricante.** A Apple pareia peças
  porque grava identidade criptográfica nos componentes na fábrica e o iOS
  verifica no boot. Um sistema agnóstico **não** consegue colocar identidade
  dentro de peças que já existem, nem forçar um aparelho de outra marca a
  recusar uma peça. Essa capacidade só vem por parceria com fabricantes ou
  por regulação.
- **O que é alcançável sem fabricante** é o registro de procedência
  consultável (a categoria já existe: CheckMEND/Recipero no Reino Unido) —
  com a diferença conceitual do FraudLock: estados graduados, transferência
  de propriedade e extensão a componentes com serial visível.
- **Nunca afirmar que o FraudLock "já faz" o bloqueio de peças.** A
  arquitetura de identificação persistente de componentes precisa ser
  projetada e validada.

## 6. Até onde o FraudLock entrega proteção (a régua de camadas)

A pergunta certa não é "o FraudLock impede o roubo?" — não impede, e nenhum
sistema impede. A pergunta é: **quanto ele consegue desestimular o mercado
negro, e sob quais condições?** A resposta vem em três camadas, cada uma com
sua entrega e seu limite honesto.

### Camada 1 — Sozinho, desde o primeiro dia

**Entrega:** registro consultável de procedência. O dono cadastra o
aparelho, declara o roubo (com boletim de ocorrência como lastro) e
qualquer pessoa consulta antes de comprar. Três efeitos reais:

- O comprador honesto, que hoje compra usado "no escuro", passa a ter como
  verificar — e quem vê 🔴 desiste.
- O comprador desonesto perde a desculpa: com consulta pública e gratuita,
  "não sabia" vira "não quis saber" — o que tem peso jurídico (receptação).
- Identificadores adulterados não voltam "limpos": IMEI que não bate com o
  número de série devolve 🟠, e aparelho laranja o comprador informado
  também recusa.

**Limite honesto:** esta camada só morde na proporção em que as pessoas
consultam. O produto real da Fase 1 não é o banco de dados — é fazer a
consulta virar hábito (lojas de usados, assistências, plataformas de
venda).

### Camada 2 — Com adesão do mercado

**Entrega:** com assistências e lojas aderindo ("compra verificada"), o
cerco fecha sobre as peças. Telas e placas com serial registrado carregam a
origem, e a troca de placa-mãe deixa de limpar o aparelho — tela e câmera
continuam apontando para o celular roubado. O desmonte, rota de fuga atual
do crime, também perde valor.

**Limite honesto:** depende de escala. É preciso massa crítica de
assistências participando para que a peça 🔴 realmente não encontre
comprador. Conquista comercial, não técnica.

### Camada 3 — Só com fabricantes ou governo

**Entrega possível:** bloqueio físico de peças (a peça se recusar a
funcionar em outro aparelho, como faz a Apple). Exige identidade gravada no
componente na fábrica.

**Limite honesto:** o FraudLock **não consegue fazer isso sozinho e nunca
deve prometer que consegue**. Este degrau só vem por parceria com
fabricantes ou por regulação (por exemplo, a Anatel estendendo a lógica do
bloqueio de IMEI à procedência de peças).

### O que o FraudLock nunca vai entregar

- Impedir o roubo em si.
- Impedir a venda entre criminosos ou para quem escolhe não consultar.
- Ser inviolável — a Frank Mobile mostrou que até o pareamento da Apple é
  contornado. A vantagem estrutural do FraudLock é o registro viver no
  servidor, fora do alcance do criminoso; mas a barreira final é sempre o
  comprador que consulta.

### A régua

Se hoje o ladrão revende o aparelho roubado por uma fração relevante do
valor de mercado, cada camada empurra essa fração para baixo: a consulta
pública derruba a revenda como seminovo; a adesão das assistências derruba
a venda de peças; a parceria com fabricantes fecharia o resto.

**O roubo não acaba quando se torna impossível; acaba quando deixa de pagar
o risco.** É até onde o FraudLock chega — e é exatamente onde ele precisa
chegar.

## 7. Caminho em fases

1. **Fase 1 — viável hoje, sem fabricante**: registro de aparelhos por
   IMEI + número de série, status declarado pelo dono (com boletim de
   ocorrência como lastro), API pública de consulta, detecção de
   inconsistência entre identificadores (→ 🟠).
2. **Fase 2 — peças com serial visível**: telas e placas costumam ter
   serial gravado; registro consultável por assistências e lojas, ainda sem
   bloqueio físico. Programa de adesão para assistências ("compra
   verificada").
3. **Fase 3 — exige parceria ou regulação**: identidade criptográfica
   embarcada na peça, no modelo Apple, via acordos com fabricantes — ou via
   caminho regulatório: a Anatel já bloqueia IMEI roubado; estender
   obrigações de procedência a peças é uma tese a construir junto ao poder
   público (o próprio MP-SP, como mostra a Frank Mobile, já atua nessa
   cadeia).

## 8. Diagrama do ciclo econômico

```
                 ROUBO
                   │
                   ▼
            CELULAR MARCADO 🔴
                   │
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
    TENTA VENDER        DESMONTA
          │                 │
          ▼                 ▼
   consulta → 🔴      PEÇAS IDENTIFICADAS
          │                 │
          │        troca de placa não
          │        limpa tela/câmera → 🔴/🟠
          │                 │
          └────────┬────────┘
                   ▼
            MERCADO RECUSA
                   │
                   ▼
           VALOR ECONÔMICO ↓
                   │
                   ▼
          ROUBO DEIXA DE COMPENSAR
```

---

*Referências públicas: Operação Frank Mobile (MP-SP / polícias de SP,
set/2026, cobertura UOL/Tilt); Activation Lock e pareamento de peças
(Apple); bloqueio de IMEI (Anatel/GSMA); registros de procedência
(CheckMEND/Recipero).*
