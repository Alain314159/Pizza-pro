// Cliente Telegram v3 via proxy (Cloudflare Worker).
// El token del bot NUNCA se incluye en el bundle.

export const TG_PROXY_URL = 'https://pizza-proxy.tienda-ul5r2q.workers.dev';
export const TG_APP_KEY = 'f03e3e46f4454562962de0acf49ca295';

function proxyHeaders(extra) {
  const h = { 'X-App-Key': TG_APP_KEY };
  if (extra) for (const k in extra) h[k] = extra[k];
  return h;
}

async function tgJson(path, opts) {
  const r = await fetch(TG_PROXY_URL + path, opts);
  const text = await r.text();
  let d;
  try { d = JSON.parse(text); }
  catch (e) { throw new Error('Respuesta no-JSON del proxy: ' + text.slice(0, 120)); }
  if (!d.ok) throw new Error(d.description || 'Error del proxy');
  return d;
}

// ═══ BOT BASICO ═══

export async function tgGetMe() {
  const d = await tgJson('/api/tg/getMe', { method: 'GET', headers: proxyHeaders() });
  return d.result;
}

export async function tgGetUpdates(offset) {
  const q = '?limit=100' + (offset ? '&offset=' + offset : '');
  const d = await tgJson('/api/tg/getUpdates' + q, { method: 'GET', headers: proxyHeaders() });
  return d.result;
}

// ═══ TIENDA (nombre unico + password) ═══

export async function tgCheckName(nombre) {
  return tgJson('/api/checkName?nombre=' + encodeURIComponent(nombre), {
    method: 'GET',
    headers: proxyHeaders()
  });
}

export async function tgRegister(nombre, password, chatId) {
  return tgJson('/api/register', {
    method: 'POST',
    headers: proxyHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ nombre, password, chatId: String(chatId) })
  });
}

export async function tgLogin(nombre, password, chatId) {
  return tgJson('/api/login', {
    method: 'POST',
    headers: proxyHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ nombre, password, chatId: String(chatId) })
  });
}

export async function tgStatus(chatId) {
  return tgJson('/api/status?chatId=' + encodeURIComponent(chatId), {
    method: 'GET',
    headers: proxyHeaders()
  });
}

// ═══ BACKUPS ═══

export async function tgListBackups(chatId, nombre) {
  const d = await tgJson('/api/tg/listBackups?chatId=' + encodeURIComponent(chatId) + '&nombre=' + encodeURIComponent(nombre), {
    method: 'GET',
    headers: proxyHeaders()
  });
  return d.result || [];
}

export async function tgSendDocument(chatId, nombre, blob, caption) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('nombre', nombre);
  form.append('document', blob, 'backup.json.gz');
  if (caption) form.append('caption', caption);
  const d = await tgJson('/api/tg/sendDocument', {
    method: 'POST',
    headers: proxyHeaders(),
    body: form
  });
  return d.result;
}

export async function tgGetFile(fileId) {
  const d = await tgJson('/api/tg/getFile', {
    method: 'POST',
    headers: proxyHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ file_id: fileId })
  });
  return d.result;
}

export function tgFileUrl(filePath) {
  return TG_PROXY_URL + '/api/tg/file?path=' + encodeURIComponent(filePath) + '&key=' + encodeURIComponent(TG_APP_KEY);
}

export async function tgDeleteMessage(chatId, messageId) {
  try {
    const d = await tgJson('/api/tg/deleteMessage', {
      method: 'POST',
      headers: proxyHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ chat_id: String(chatId), message_id: messageId })
    });
    return d.ok;
  } catch (e) { return false; }
}

// ═══ UTIL ═══

export function tgDetectarChatId(updates) {
  for (let i = updates.length - 1; i >= 0; i--) {
    const u = updates[i];
    const msg = u.message || u.edited_message || u.channel_post;
    if (msg && msg.chat && msg.chat.id && msg.chat.type === 'private') {
      return {
        chatId: msg.chat.id,
        nombre: (msg.chat.first_name || '') + ' ' + (msg.chat.last_name || ''),
        username: msg.chat.username || ''
      };
    }
  }
  return null;
}
