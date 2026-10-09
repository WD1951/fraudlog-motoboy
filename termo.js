// Termo de uso e consentimento do entregador — RASCUNHO para revisão jurídica.
// Ao mudar o texto, aumente a VERSAO: cada aceite fica registrado com versão e hash.
const VERSAO = "1-piloto";
const TEXTO = [
  "TERMO DE USO E CONSENTIMENTO — FRAUDLOG (versão piloto)",
  "1. O FraudLog registra comprovantes das entregas que você realiza: foto da entrega, localização do aparelho no momento da foto, horários, inclinação do aparelho e os dados do seu cadastro (nome, CPF, placa da moto e cooperativa).",
  "2. Finalidade: comprovar a entrega e resolver contestações, protegendo você, a cooperativa e o cliente. Os dados não são usados para pontuar, ranquear ou avaliar o seu desempenho.",
  "3. A localização é registrada apenas nos momentos de saída e da foto de cada entrega. O FraudLog não acompanha o seu trajeto.",
  "4. Cada comprovante é confirmado pela biometria do seu próprio aparelho (digital ou rosto). A sua digital e a imagem do seu rosto nunca saem do celular; o FraudLog recebe apenas a confirmação de que foi você.",
  "5. Você recebe uma cópia de cada comprovante e pode consultá-los e usá-los, inclusive em sua defesa.",
  "6. Os dados ficam guardados em servidor no Brasil pelo prazo definido no contrato com a cooperativa, e podem ser apresentados a quem tiver o link ou o QR do comprovante.",
  "7. Você pode pedir informações, correção ou exclusão dos seus dados, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018), observados os prazos legais de guarda.",
  "8. Este é um piloto. Os comprovantes são meio de prova com integridade verificável, avaliados por quem decide a disputa."
].join("\n\n");
module.exports = { VERSAO, TEXTO };
