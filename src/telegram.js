// Cliente Telegram via proxy (Cloudflare Worker).
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
  if (!d.ok) throw new Error(d.description || 'Error de Telegram');
  return d.result;
}

export async function tgGetMe() {
  return tgJson('/api/tg/getMe', { method: 'GET', headers: proxyHeaders() });
}

export async function tgGetUpdates(offset) {
  const q = '?limit=100' + (offset ? '&offset=' + offset : '');
  return tgJson('/api/tg/getUpdates' + q, { method: 'GET', headers: proxyHeaders() });
}

export async function tgSendDocument(chatId, blob, filename, caption) {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('document', blob, filename);
  if (caption) form.append('caption', caption);
  return tgJson('/api/tg/sendDocument', { method: 'POST', headers: proxyHeaders(), body: form });
}

export async function tgGetFile(fileId) {
  return tgJson('/api/tg/getFile', {
    method: 'POST',
    headers: proxyHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ file_id: fileId })
  });
}

export function tgFileUrl(filePath) {
  return TG_PROXY_URL + '/api/tg/file?path=' + encodeURIComponent(filePath) + '&key=' + encodeURIComponent(TG_APP_KEY);
}

export async function tgDeleteMessage(chatId, messageId) {
  try {
    return await tgJson('/api/tg/deleteMessage', {
      method: 'POST',
      headers: proxyHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ chat_id: chatId, message_id: messageId })
    });
  } catch (e) { return false; }
}

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

export function tgExtraerBackups(updates) {
  const out = [];
  updates.forEach(u => {
    const msg = u.message || u.channel_post;
    if (!msg || !msg.document) return;
    const doc = msg.document;
    if (!doc.file_name || !doc.file_name.startsWith('pizzeria-backup-')) return;
    out.push({
      fileId: doc.file_id,
      fileName: doc.file_name,
      fileSize: doc.file_size || 0,
      fecha: new Date(msg.date * 1000).toISOString(),
      messageId: msg.message_id,
      caption: msg.caption || ''
    });
  });
  return out.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}
