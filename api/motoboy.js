// /api/motoboy?acao=...  — ativação e entrada do entregador
const C = require("../lib/comum");
const B = require("../lib/bio");
const T = require("../lib/termo");

async function carregar(cpf) {
  if (!C.cpfValido(cpf)) throw Object.assign(new Error("CPF inválido"), { status: 400 });
  const m = await C.lerBlobJson("motoboys/" + cpf + ".json");
  if (!m) throw Object.assign(new Error("CPF não cadastrado pela cooperativa"), { status: 404 });
  return m;
}
async function perfil(m) {
  const coop = await C.lerBlobJson("coops/" + m.coop + ".json");
  return { cpf: m.cpf, cpfm: C.cpfMascara(m.cpf), nome: m.nome, placa: m.placa, whatsapp: m.whatsapp,
           coopNome: coop ? coop.razao : "", coopWhats: coop ? coop.whatsapp : "" };
}
async function conferirConvite(m, codigo) {
  if (!m.convite) throw Object.assign(new Error("Não há convite pendente para este CPF"), { status: 400 });
  if (Date.now() > m.convite.exp) throw Object.assign(new Error("Convite vencido — peça um novo à cooperativa"), { status: 400 });
  if (m.convite.tentativas >= 5) throw Object.assign(new Error("Convite bloqueado por tentativas erradas — peça um novo"), { status: 429 });
  if (!C.iguais(C.hmac("convite|" + m.cpf + "|" + String(codigo || "").trim()), m.convite.h)) {
    m.convite.tentativas++;
    await C.gravarJson("motoboys/" + m.cpf + ".json", m, true);
    throw Object.assign(new Error("Código de convite incorreto"), { status: 403 });
  }
}

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  const acao = String((req.query && req.query.acao) || "");
  try {
    const b = C.lerJson(req);
    const rp = C.origem(req);
    const cpf = C.nums(b.cpf);

    if (acao === "convite") {
      const m = await carregar(cpf);
      await conferirConvite(m, b.codigo);
      const opcoes = await B.opcoesCadastro({ rp, usuario: "mot-" + cpf, nome: m.nome, finalidade: "mot-cad", sujeito: cpf,
                                              credenciais: m.credenciais });
      return res.status(200).json({ perfil: await perfil(m), termo: T.TEXTO, termoVersao: T.VERSAO, opcoes });
    }

    if (acao === "ativar") {
      const m = await carregar(cpf);
      await conferirConvite(m, b.codigo);
      if (b.aceite !== true) return res.status(400).json({ erro: "É preciso aceitar o termo" });
      if (C.placaNormal(b.placa) !== m.placa) return res.status(400).json({ erro: "A placa confirmada não confere com o cadastro da cooperativa" });
      const cred = await B.conferirCadastro({ rp, resposta: b.resposta, finalidade: "mot-cad", sujeito: cpf });
      const ts = new Date().toISOString();
      const aceite = { cpf, versao: T.VERSAO, hashTermo: C.sha256(T.TEXTO), aceitoEm: ts, credencial: cred.id };
      aceite.selo = C.hmac(JSON.stringify(aceite));
      await C.gravarJson("aceites/" + cpf + "-" + ts.replace(/[:.]/g, "") + ".json", aceite, false);
      m.credenciais.push(cred);
      m.status = "ativo";
      m.termo = { versao: T.VERSAO, aceitoEm: ts };
      delete m.convite;
      await C.gravarJson("motoboys/" + cpf + ".json", m, true);
      return res.status(200).json({ perfil: await perfil(m) });
    }

    if (acao === "opcoes-entrada") {
      const m = await carregar(cpf);
      if (m.status !== "ativo") return res.status(403).json({ erro: "Cadastro ainda não ativado — use o código de convite" });
      const opcoes = await B.opcoesEntrada({ rp, credenciais: m.credenciais, finalidade: "mot-entrar", sujeito: cpf });
      return res.status(200).json({ opcoes });
    }

    if (acao === "entrar") {
      const m = await carregar(cpf);
      await B.conferirEntrada({ rp, resposta: b.resposta, credenciais: m.credenciais, finalidade: "mot-entrar", sujeito: cpf });
      await C.gravarJson("motoboys/" + cpf + ".json", m, true);
      return res.status(200).json({ perfil: await perfil(m) });
    }

    if (acao === "opcoes-entrega") {
      const m = await carregar(cpf);
      if (m.status !== "ativo") return res.status(403).json({ erro: "Cadastro não ativo" });
      const sh = String(b.sh || "").toUpperCase();
      if (!/^[0-9A-F]{64}$/.test(sh)) return res.status(400).json({ erro: "StarHash inválido" });
      const opcoes = await B.opcoesEntrada({ rp, credenciais: m.credenciais, finalidade: "entrega", sujeito: cpf, extra: sh });
      return res.status(200).json({ opcoes });
    }

    return res.status(400).json({ erro: "Ação inválida" });
  } catch (e) {
    return res.status(e.status || 400).json({ erro: String(e.message || e) });
  }
};
