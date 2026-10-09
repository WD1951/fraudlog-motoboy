// /api/coop?acao=...  — cooperativa ou empresa
const { list } = require("@vercel/blob");
const C = require("../lib/comum");
const B = require("../lib/bio");

const SESSAO = 12 * 60 * 60 * 1000;
const CONVITE = 7 * 24 * 60 * 60 * 1000;

function sessaoCoop(cnpj) { return C.assinarFicha({ t: "coop", c: cnpj, e: Date.now() + SESSAO }); }
function lerSessao(b) {
  const f = C.lerFicha(b.sessao);
  if (!f || f.t !== "coop") throw Object.assign(new Error("Sessão expirada — entre de novo"), { status: 401 });
  return f.c;
}
function publico(c) { return { cnpj: c.cnpj, razao: c.razao, responsavel: c.responsavel, whatsapp: c.whatsapp, email: c.email }; }

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  const acao = String((req.query && req.query.acao) || "");
  try {
    const b = C.lerJson(req);
    const rp = C.origem(req);

    if (acao === "cadastrar") {
      const cnpj = C.nums(b.cnpj);
      if (!C.cnpjValido(cnpj)) return res.status(400).json({ erro: "CNPJ inválido" });
      const ativ = process.env.FRAUDLOG_ATIVACAO;
      if (ativ && !C.iguais(String(b.ativacao || "").trim(), ativ)) return res.status(403).json({ erro: "Código de ativação inválido" });
      const razao = C.texto(b.razao), responsavel = C.texto(b.responsavel), whatsapp = C.nums(b.whatsapp).slice(0, 11), email = C.texto(b.email, 120);
      if (!razao || !responsavel || whatsapp.length < 10) return res.status(400).json({ erro: "Preencha razão social, responsável e WhatsApp" });
      const atual = await C.lerBlobJson("coops/" + cnpj + ".json");
      if (atual && atual.credenciais && atual.credenciais.length) return res.status(409).json({ erro: "Esta empresa já está cadastrada — use Entrar" });
      const coop = { cnpj, razao, responsavel, whatsapp, email, credenciais: [], criadaEm: new Date().toISOString() };
      await C.gravarJson("coops/" + cnpj + ".json", coop, true);
      const opcoes = await B.opcoesCadastro({ rp, usuario: "coop-" + cnpj, nome: razao, finalidade: "coop-cad", sujeito: cnpj });
      return res.status(200).json({ opcoes });
    }

    if (acao === "registrar-bio") {
      const cnpj = C.nums(b.cnpj);
      const coop = await C.lerBlobJson("coops/" + cnpj + ".json");
      if (!coop) return res.status(404).json({ erro: "Empresa não encontrada" });
      if (coop.credenciais.length) return res.status(409).json({ erro: "Biometria já cadastrada — use Entrar" });
      const cred = await B.conferirCadastro({ rp, resposta: b.resposta, finalidade: "coop-cad", sujeito: cnpj });
      coop.credenciais.push(cred);
      await C.gravarJson("coops/" + cnpj + ".json", coop, true);
      return res.status(200).json({ sessao: sessaoCoop(cnpj), coop: publico(coop) });
    }

    if (acao === "opcoes-entrada") {
      const cnpj = C.nums(b.cnpj);
      const coop = await C.lerBlobJson("coops/" + cnpj + ".json");
      if (!coop || !coop.credenciais.length) return res.status(404).json({ erro: "Empresa não cadastrada" });
      const opcoes = await B.opcoesEntrada({ rp, credenciais: coop.credenciais, finalidade: "coop-entrar", sujeito: cnpj });
      return res.status(200).json({ opcoes });
    }

    if (acao === "entrar") {
      const cnpj = C.nums(b.cnpj);
      const coop = await C.lerBlobJson("coops/" + cnpj + ".json");
      if (!coop) return res.status(404).json({ erro: "Empresa não cadastrada" });
      await B.conferirEntrada({ rp, resposta: b.resposta, credenciais: coop.credenciais, finalidade: "coop-entrar", sujeito: cnpj });
      await C.gravarJson("coops/" + cnpj + ".json", coop, true);
      return res.status(200).json({ sessao: sessaoCoop(cnpj), coop: publico(coop) });
    }

    if (acao === "motoboy-novo") {
      const cnpj = lerSessao(b);
      const cpf = C.nums(b.cpf);
      if (!C.cpfValido(cpf)) return res.status(400).json({ erro: "CPF inválido" });
      const nome = C.texto(b.nome), whatsapp = C.nums(b.whatsapp).slice(0, 11), placa = C.placaNormal(b.placa);
      if (nome.split(/\s+/).length < 2) return res.status(400).json({ erro: "Informe nome e sobrenome" });
      if (whatsapp.length < 10) return res.status(400).json({ erro: "WhatsApp incompleto" });
      if (!placa) return res.status(400).json({ erro: "Placa inválida (ex.: ABC1D23 ou ABC1234)" });
      const atual = await C.lerBlobJson("motoboys/" + cpf + ".json");
      if (atual && atual.status === "ativo" && atual.coop !== cnpj) return res.status(409).json({ erro: "Este CPF já está ativo em outra cooperativa" });
      const codigo = String(require("crypto").randomInt(0, 1000000)).padStart(6, "0");
      const mot = {
        cpf, nome, whatsapp, placa, coop: cnpj,
        status: atual && atual.status === "ativo" ? "ativo" : "convidado",
        credenciais: (atual && atual.coop === cnpj && atual.credenciais) || [],
        convite: { h: C.hmac("convite|" + cpf + "|" + codigo), exp: Date.now() + CONVITE, tentativas: 0 },
        criadoEm: (atual && atual.criadoEm) || new Date().toISOString()
      };
      await C.gravarJson("motoboys/" + cpf + ".json", mot, true);
      await C.gravarJson("idxm/" + cnpj + "/" + cpf + ".json", { cpf }, true);
      return res.status(200).json({ codigo, validoAte: new Date(mot.convite.exp).toISOString() });
    }

    if (acao === "motoboys") {
      const cnpj = lerSessao(b);
      const r = await list({ prefix: "idxm/" + cnpj + "/", limit: 200 });
      const lista = [];
      for (const bl of r.blobs) {
        const cpf = bl.pathname.split("/").pop().replace(".json", "");
        const m = await C.lerBlobJson("motoboys/" + cpf + ".json");
        if (m && m.coop === cnpj) lista.push({ nome: m.nome, cpfm: C.cpfMascara(cpf), placa: m.placa, status: m.status });
      }
      lista.sort(function (a, b) { return a.nome.localeCompare(b.nome); });
      return res.status(200).json({ motoboys: lista });
    }

    if (acao === "entregas") {
      const cnpj = lerSessao(b);
      const r = await list({ prefix: "idx/" + cnpj + "/", limit: 1000 });
      const recentes = r.blobs.sort(function (a, b) { return a.pathname < b.pathname ? 1 : -1; }).slice(0, 40);
      const lista = [];
      for (const bl of recentes) { const e = await C.lerBlobJson(bl.pathname); if (e) lista.push(e); }
      return res.status(200).json({ entregas: lista, total: r.blobs.length });
    }

    return res.status(400).json({ erro: "Ação inválida" });
  } catch (e) {
    return res.status(e.status || 400).json({ erro: String(e.message || e) });
  }
};
