// POST /api/foto?id=FL-...  (corpo = arquivo original da foto)
//   O servidor calcula o SHA-256 da foto recebida e só a arquiva se bater
//   com o hash declarado no registro selado.
// GET  /api/foto?id=FL-...  devolve a foto original arquivada.
const { put, get } = require("@vercel/blob");
const { ID_VALIDO, sha256, lerBruto, lerBlobJson } = require("../lib/comum");
const crypto = require("crypto");

const LIMITE = 4400000; // limite de corpo das funções do Vercel (~4,5 MB)

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  const id = String((req.query && req.query.id) || "");
  if (!ID_VALIDO.test(id)) return res.status(400).json({ erro: "ID inválido" });

  try {
    if (req.method === "GET") {
      const r = await get("fotos/" + id + ".jpg", { access: "private" });
      if (!r) return res.status(404).json({ erro: "Foto não arquivada" });
      res.setHeader("Content-Type", r.blob.contentType || "image/jpeg");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", "inline; filename=\"" + id + ".jpg\"");
      const buf = Buffer.from(await new Response(r.stream).arrayBuffer());
      return res.status(200).send(buf);
    }

    if (req.method !== "POST") return res.status(405).json({ erro: "Use GET ou POST" });

    const registro = await lerBlobJson(get, "registros/" + id + ".json");
    if (!registro) return res.status(404).json({ erro: "Registro não encontrado" });

    let foto;
    try { foto = await lerBruto(req, LIMITE); }
    catch (e) { return res.status(413).json({ erro: "Foto maior que o limite do servidor" }); }

    const hashRecebido = crypto.createHash("sha256").update(foto).digest("hex").toUpperCase();
    if (hashRecebido !== String(registro.dados.h || "").toUpperCase()) {
      return res.status(422).json({ erro: "O hash da foto não confere com o registro", hashRecebido });
    }

    try {
      await put("fotos/" + id + ".jpg", foto, {
        access: "private", contentType: "image/jpeg", addRandomSuffix: false, allowOverwrite: false
      });
    } catch (e) {
      return res.status(409).json({ erro: "Foto já arquivada para este ID" });
    }
    const meta = { sha256: hashRecebido, bytes: foto.length, arquivadaEm: new Date().toISOString() };
    await put("fotos/" + id + ".json", JSON.stringify(meta), {
      access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: false
    });
    return res.status(200).json({ ok: true, ...meta });
  } catch (e) {
    return res.status(500).json({ erro: String(e.message || e) });
  }
};
