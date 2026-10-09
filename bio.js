// FraudLog — biometria do aparelho (WebAuthn / chave de acesso)
// O desafio é uma ficha assinada pelo servidor: diz para que serve, para quem
// e (nas entregas) o StarHash do comprovante. Assim a digital ou o rosto do
// motoboy assina aquela entrega específica.
const {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse
} = require("@simplewebauthn/server");
const { assinarFicha, lerFicha } = require("./comum");

const VALIDADE = 5 * 60 * 1000; // 5 minutos para tocar no sensor

function desafio(finalidade, sujeito, extra) {
  return new Uint8Array(Buffer.from(assinarFicha({ p: finalidade, s: sujeito, x: extra || "", e: Date.now() + VALIDADE }), "utf8"));
}
function conferidor(finalidade, sujeito, extra) {
  return function (c) {
    let ficha;
    try { ficha = Buffer.from(c, "base64url").toString("utf8"); } catch (e) { return false; }
    const f = lerFicha(ficha);
    return !!f && f.p === finalidade && f.s === sujeito && String(f.x || "") === String(extra || "");
  };
}

async function opcoesCadastro(o) {
  return generateRegistrationOptions({
    rpName: "FraudLog",
    rpID: o.rp.rpID,
    userName: o.usuario,
    userDisplayName: o.nome || o.usuario,
    userID: new Uint8Array(Buffer.from(o.usuario, "utf8")),
    challenge: desafio(o.finalidade, o.sujeito),
    attestationType: "none",
    excludeCredentials: (o.credenciais || []).map(function (c) { return { id: c.id, transports: c.transports }; }),
    authenticatorSelection: { residentKey: "preferred", userVerification: "required", authenticatorAttachment: "platform" }
  });
}

async function conferirCadastro(o) {
  const v = await verifyRegistrationResponse({
    response: o.resposta,
    expectedChallenge: conferidor(o.finalidade, o.sujeito),
    expectedOrigin: o.rp.origin,
    expectedRPID: o.rp.rpID,
    requireUserVerification: true
  });
  if (!v.verified) throw new Error("Biometria não confirmada");
  const c = v.registrationInfo.credential;
  return {
    id: c.id, publicKey: Buffer.from(c.publicKey).toString("base64url"), counter: c.counter,
    transports: c.transports || [], rpID: o.rp.rpID, criadaEm: new Date().toISOString()
  };
}

async function opcoesEntrada(o) {
  const creds = (o.credenciais || []).filter(function (c) { return c.rpID === o.rp.rpID; });
  if (!creds.length) throw new Error("Nenhuma biometria cadastrada neste endereço");
  return generateAuthenticationOptions({
    rpID: o.rp.rpID,
    allowCredentials: creds.map(function (c) { return { id: c.id, transports: c.transports }; }),
    userVerification: "required",
    challenge: desafio(o.finalidade, o.sujeito, o.extra)
  });
}

async function conferirEntrada(o) {
  const cred = (o.credenciais || []).find(function (c) { return c.id === (o.resposta && o.resposta.id); });
  if (!cred) throw new Error("Biometria não reconhecida para este cadastro");
  const v = await verifyAuthenticationResponse({
    response: o.resposta,
    expectedChallenge: conferidor(o.finalidade, o.sujeito, o.extra),
    expectedOrigin: o.rp.origin,
    expectedRPID: o.rp.rpID,
    requireUserVerification: true,
    credential: { id: cred.id, publicKey: new Uint8Array(Buffer.from(cred.publicKey, "base64url")), counter: cred.counter, transports: cred.transports }
  });
  if (!v.verified) throw new Error("Biometria não confirmada");
  cred.counter = v.authenticationInfo.newCounter;
  cred.usadaEm = new Date().toISOString();
  return cred;
}

module.exports = { opcoesCadastro, conferirCadastro, opcoesEntrada, conferirEntrada };
