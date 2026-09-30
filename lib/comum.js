// FraudLog — funções comuns do servidor (cartório)
const crypto = require("crypto");

// A ORDEM destes campos precisa ser idêntica à do index.html
const CAMPOS = ["id","mot","coop","end","lat","lng","dlat","dlng","dprec","elat","elng","eprec","dist","h","fts","fidade","giro","gang","tsd"];

const ID_VALIDO = /^FL-\d{4}-[A-Z0-9]{6,12}$/;

function canon(d) {
  return CAMPOS.map(function (k) { return k + "=" + (d[k] == null ? "" : String(d[k])); }).join("|");
}
function sha256(texto) {
  return crypto.createHash("sha256").update(texto).digest("hex").toUpperCase();
}
function hmac(texto) {
  const segredo = process.env.FRAUDLOG_SECRET;
  if (!segredo) throw new Error("FRAUDLOG_SECRET não configurado");
  return crypto.createHmac("sha256", segredo).update(texto, "utf8").digest("hex").toUpperCase();
}
function iguais(a, b) {
  a = String(a || ""); b = String(b || "");
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
function lerJson(req) {
  let b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b;
}
function lerBruto(req, limite) {
  return new Promise(function (ok, erro) {
    const partes = []; let total = 0;
    req.on("data", function (c) {
      total += c.length;
      if (total > limite) { erro(new Error("grande")); req.destroy(); return; }
      partes.push(c);
    });
    req.on("end", function () { ok(Buffer.concat(partes)); });
    req.on("error", erro);
  });
}
async function lerBlobJson(get, caminho) {
  const r = await get(caminho, { access: "private" });
  if (!r) return null;
  const txt = await new Response(r.stream).text();
  return JSON.parse(txt);
}

module.exports = { CAMPOS, ID_VALIDO, canon, sha256, hmac, iguais, lerJson, lerBruto, lerBlobJson };
