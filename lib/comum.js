// FraudLog — funções comuns do servidor (cartório)
const crypto = require("crypto");
const { put, get } = require("@vercel/blob");

// A ORDEM destes campos precisa ser idêntica à do index.html
const CAMPOS = ["id","mot","cpfm","coop","placa","end","lat","lng","dlat","dlng","dprec","elat","elng","eprec","dist","h","fts","fidade","giro","gang","tsd","bio"];

// Campos dos comprovantes da versão 1 (antes da biometria) — mantidos para que continuem verificáveis
const CAMPOS_V1 = ["id","mot","coop","end","lat","lng","dlat","dlng","dprec","elat","elng","eprec","dist","h","fts","fidade","giro","gang","tsd"];

const ID_VALIDO = /^FL-\d{4}-[A-Z0-9]{6,12}$/;

function canon(d, versao) {
  return (versao === 1 ? CAMPOS_V1 : CAMPOS).map(function (k) { return k + "=" + (d[k] == null ? "" : String(d[k])); }).join("|");
}
function sha256(texto) {
  return crypto.createHash("sha256").update(texto).digest("hex").toUpperCase();
}
function segredo() {
  const s = process.env.FRAUDLOG_SECRET;
  if (!s) throw new Error("FRAUDLOG_SECRET não configurado");
  return s;
}
function hmac(texto) {
  return crypto.createHmac("sha256", segredo()).update(texto, "utf8").digest("hex").toUpperCase();
}
function iguais(a, b) {
  a = String(a || ""); b = String(b || "");
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ---- fichas assinadas (sessões e desafios), sem precisar guardar nada ----
function b64u(buf) { return Buffer.from(buf).toString("base64url"); }
function assinarFicha(obj) {
  const corpo = b64u(JSON.stringify(obj));
  return corpo + "." + crypto.createHmac("sha256", segredo()).update(corpo).digest("base64url");
}
function lerFicha(ficha) {
  const p = String(ficha || "").split(".");
  if (p.length !== 2) return null;
  const esperado = crypto.createHmac("sha256", segredo()).update(p[0]).digest("base64url");
  if (!iguais(p[1], esperado)) return null;
  let obj; try { obj = JSON.parse(Buffer.from(p[0], "base64url").toString("utf8")); } catch (e) { return null; }
  if (!obj.e || Date.now() > obj.e) return null;
  return obj;
}

// ---- leitura de pedidos ----
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

// ---- arquivo privado (Blob) usado como cadastro ----
async function lerBlobJson(caminho) {
  const r = await get(caminho, { access: "private" });
  if (!r) return null;
  return JSON.parse(await new Response(r.stream).text());
}
async function gravarJson(caminho, obj, sobrescrever) {
  await put(caminho, JSON.stringify(obj), {
    access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: !!sobrescrever
  });
}

// ---- endereço do site (necessário para a biometria) ----
const HOSTS_PADRAO = ["fraudlog-motoboy.vercel.app", "fraudlog.com.br", "www.fraudlog.com.br", "localhost"];
function origem(req) {
  const h = req.headers || {};
  let o = h.origin;
  if (!o) {
    const host = h["x-forwarded-host"] || h.host || "";
    const proto = h["x-forwarded-proto"] || (String(host).startsWith("localhost") ? "http" : "https");
    o = proto + "://" + host;
  }
  let host;
  try { host = new URL(o).hostname; } catch (e) { throw new Error("Origem inválida"); }
  const permitidos = (process.env.FRAUDLOG_HOSTS || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  const lista = permitidos.length ? permitidos : HOSTS_PADRAO;
  if (lista.indexOf(host) < 0) throw new Error("Endereço não autorizado: " + host);
  return { origin: o, rpID: host };
}

// ---- documentos ----
function nums(s) { return String(s || "").replace(/\D/g, ""); }
function cpfValido(c) {
  c = nums(c);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let s = 0;
    for (let i = 0; i < t; i++) s += Number(c[i]) * (t + 1 - i);
    if ((s * 10) % 11 % 10 !== Number(c[t])) return false;
  }
  return true;
}
function cnpjValido(c) {
  c = nums(c);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  function dv(base) {
    let pesos = base.length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let s = 0; for (let i = 0; i < base.length; i++) s += Number(base[i]) * pesos[i];
    const r = s % 11; return r < 2 ? 0 : 11 - r;
  }
  return dv(c.slice(0, 12)) === Number(c[12]) && dv(c.slice(0, 13)) === Number(c[13]);
}
function placaNormal(p) {
  p = String(p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p) ? p : "";
}
function cpfMascara(c) { c = nums(c); return "***." + c.slice(3, 6) + "." + c.slice(6, 9) + "-**"; }
function texto(s, max) { return String(s == null ? "" : s).trim().slice(0, max || 120); }

module.exports = {
  CAMPOS, ID_VALIDO, canon, sha256, hmac, iguais, assinarFicha, lerFicha, lerJson, lerBruto,
  lerBlobJson, gravarJson, origem, nums, cpfValido, cnpjValido, placaNormal, cpfMascara, texto
};
