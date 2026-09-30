// POST /api/registrar  { dados, thumb }
// Grava o comprovante no arquivo privado, com horário do servidor e selo HMAC.
// O registro nunca é sobrescrito: um ID só pode ser registrado uma vez.
const { put } = require("@vercel/blob");
const { CAMPOS, ID_VALIDO, canon, sha256, hmac, lerJson } = require("../lib/comum");

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  try {
    const b = lerJson(req);
    const d = b.dados || {};
    if (!ID_VALIDO.test(String(d.id || ""))) return res.status(400).json({ erro: "ID inválido" });
    for (const k of CAMPOS) {
      if (d[k] != null && String(d[k]).length > 300) return res.status(400).json({ erro: "Campo grande demais: " + k });
    }
    const thumb = typeof b.thumb === "string" && b.thumb.startsWith("data:image/jpeg;base64,") && b.thumb.length < 400000 ? b.thumb : "";

    const dados = {};
    for (const k of CAMPOS) dados[k] = d[k] == null ? "" : String(d[k]);
    const tss = new Date().toISOString();
    const sh = sha256(canon(dados));
    const sig = hmac(canon(dados) + "|tss=" + tss);

    const registro = { versao: 1, dados, sh, tss, sig, thumb };
    try {
      await put("registros/" + dados.id + ".json", JSON.stringify(registro), {
        access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: false
      });
    } catch (e) {
      return res.status(409).json({ erro: "Este ID já foi registrado" });
    }
    return res.status(200).json({ id: dados.id, sh, tss, sig });
  } catch (e) {
    return res.status(500).json({ erro: String(e.message || e) });
  }
};
