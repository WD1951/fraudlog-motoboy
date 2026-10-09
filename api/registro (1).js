// GET /api/registro?id=FL-...
// Devolve o comprovante arquivado e o resultado da conferência do selo.
const { ID_VALIDO, canon, sha256, hmac, iguais, lerBlobJson } = require("../lib/comum");

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ erro: "Use GET" });
  const id = String((req.query && req.query.id) || "");
  if (!ID_VALIDO.test(id)) return res.status(400).json({ erro: "ID inválido" });
  try {
    const reg = await lerBlobJson("registros/" + id + ".json");
    if (!reg) return res.status(404).json({ erro: "Comprovante não encontrado" });
    const v = reg.versao || 1;
    const shOk = sha256(canon(reg.dados, v)) === reg.sh;
    const selo = iguais(hmac(canon(reg.dados, v) + "|tss=" + reg.tss), reg.sig);
    const foto = await lerBlobJson("fotos/" + id + ".json");
    return res.status(200).json({
      dados: reg.dados, sh: reg.sh, tss: reg.tss, sig: reg.sig, thumb: reg.thumb || "",
      valido: shOk && selo, foto: foto || null
    });
  } catch (e) {
    return res.status(500).json({ erro: String(e.message || e) });
  }
};
