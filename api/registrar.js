// POST /api/registrar  { cpf, dados, thumb, resposta }
// Só registra se a biometria do motoboy assinou ESTE comprovante (StarHash no desafio).
// Grava com horário do servidor e selo HMAC; o registro nunca é sobrescrito.
const C = require("../lib/comum");
const B = require("../lib/bio");

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  try {
    const b = C.lerJson(req);
    const rp = C.origem(req);
    const d = b.dados || {};
    if (!C.ID_VALIDO.test(String(d.id || ""))) return res.status(400).json({ erro: "ID inválido" });
    for (const k of C.CAMPOS) {
      if (d[k] != null && String(d[k]).length > 300) return res.status(400).json({ erro: "Campo grande demais: " + k });
    }
    const dados = {};
    for (const k of C.CAMPOS) dados[k] = d[k] == null ? "" : String(d[k]);

    // identidade: o servidor confere com o cadastro, não confia no aparelho
    const cpf = C.nums(b.cpf);
    const m = await C.lerBlobJson("motoboys/" + cpf + ".json");
    if (!m || m.status !== "ativo") return res.status(403).json({ erro: "Motoboy não ativo" });
    const coop = await C.lerBlobJson("coops/" + m.coop + ".json");
    if (dados.mot !== m.nome || dados.cpfm !== C.cpfMascara(cpf) || dados.placa !== m.placa ||
        dados.coop !== (coop ? coop.razao : "") || dados.bio !== "biometria") {
      return res.status(400).json({ erro: "Dados de identidade não conferem com o cadastro" });
    }

    const sh = C.sha256(C.canon(dados));
    await B.conferirEntrada({ rp, resposta: b.resposta, credenciais: m.credenciais, finalidade: "entrega", sujeito: cpf, extra: sh });
    await C.gravarJson("motoboys/" + cpf + ".json", m, true);

    const thumb = typeof b.thumb === "string" && b.thumb.startsWith("data:image/jpeg;base64,") && b.thumb.length < 400000 ? b.thumb : "";
    const tss = new Date().toISOString();
    const sig = C.hmac(C.canon(dados) + "|tss=" + tss);
    const registro = { versao: 2, dados, sh, tss, sig, thumb, coopCnpj: m.coop,
                       biometria: { credencial: (b.resposta && b.resposta.id) || "", conferidaEm: tss } };
    try {
      await C.gravarJson("registros/" + dados.id + ".json", registro, false);
    } catch (e) {
      return res.status(409).json({ erro: "Este ID já foi registrado" });
    }
    await C.gravarJson("idx/" + m.coop + "/" + tss.replace(/[:.]/g, "") + "_" + dados.id + ".json",
      { id: dados.id, mot: dados.mot, placa: dados.placa, end: dados.end, dist: dados.dist, dprec: dados.dprec, tss }, false);
    return res.status(200).json({ id: dados.id, sh, tss, sig });
  } catch (e) {
    return res.status(e.status || 400).json({ erro: String(e.message || e) });
  }
};
