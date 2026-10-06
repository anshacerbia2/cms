import { NotificationChannelType } from '@prisma/client';

export type TelegramSecret = { botToken: string; chatId: string };
export type GoogleChatSecret = { webhookUrl: string };
export type ChannelSecret = TelegramSecret | GoogleChatSecret;

const TIMEOUT_MS = 5_000;

/** Gagal mengirim. Pesannya aman ditampilkan: tidak pernah memuat token atau URL webhook. */
export class SendError extends Error {}

/** Token bot Telegram: "<angka>:<35 karakter>". */
export const TELEGRAM_TOKEN = /^\d{5,15}:[A-Za-z0-9_-]{30,64}$/;
/** Chat id Telegram: angka (grup diawali "-100") atau @username channel. */
export const TELEGRAM_CHAT = /^(-?\d{1,20}|@[A-Za-z][A-Za-z0-9_]{4,31})$/;
/**
 * Webhook Google Chat. Host-nya dikunci, supaya isian ini tidak bisa dipakai
 * untuk menyuruh server memanggil alamat lain.
 */
export const GOOGLE_CHAT_WEBHOOK = /^https:\/\/chat\.googleapis\.com\/v1\/spaces\/[A-Za-z0-9_-]+\/messages\?\S+$/;

const lastChars = (s: string, n = 4) => `••••${s.slice(-n)}`;

/** Petunjuk tujuan yang aman ditampilkan dan dicatat. */
export function hintFor(type: NotificationChannelType, secret: ChannelSecret): string {
  if (type === 'TELEGRAM') {
    const t = secret as TelegramSecret;
    return `chat ${t.chatId} · bot ${lastChars(t.botToken)}`;
  }
  const url = new URL((secret as GoogleChatSecret).webhookUrl);
  const space = url.pathname.split('/')[3] ?? '?';
  return `space ${space} · key ${lastChars(url.searchParams.get('key') ?? '')}`;
}

export async function send(type: NotificationChannelType, secret: ChannelSecret, text: string): Promise<void> {
  let res: Response;
  try {
    if (type === 'TELEGRAM') {
      const t = secret as TelegramSecret;
      res = await fetch(`https://api.telegram.org/bot${t.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: t.chatId, text, disable_web_page_preview: true }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } else {
      res = await fetch((secret as GoogleChatSecret).webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    }
  } catch (err: any) {
    // Pesan error fetch bisa memuat URL (dan token di dalamnya): pakai jenisnya saja.
    throw new SendError(err?.name === 'TimeoutError' ? 'No answer within 5 seconds.' : 'Could not reach the service.');
  }
  if (res.ok) return;

  // Keterangan dari Telegram ("chat not found") atau Google ("Invalid token")
  // membantu memperbaiki isian; URL-nya sendiri tidak pernah ikut.
  let detail = '';
  try {
    const body: any = await res.json();
    detail = String(body?.description ?? body?.error?.message ?? '').slice(0, 200);
  } catch {
    // Bukan JSON.
  }
  throw new SendError(`HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
}
