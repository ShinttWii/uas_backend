const axios = require('axios');

/**
 * BagVerse - Notifikasi Pesanan ke Owner
 *
 * Provider (urutan prioritas):
 *  1. Fonnte API    → set FONNTE_TOKEN di .env (scan QR WA di fonnte.com)
 *  2. Telegram Bot  → set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID di .env
 *                     (paling mudah, gratis, 2 menit setup)
 *
 * Setup Telegram (GRATIS, paling mudah):
 *  1. Buka Telegram → cari @BotFather
 *  2. Kirim /newbot → ikuti instruksi → dapat BOT_TOKEN
 *  3. Buka bot kamu di Telegram → klik Start
 *  4. Buka: https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
 *     → ambil "id" dari bagian "chat" → itu CHAT_ID kamu
 *  5. Isi TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID di .env
 *
 * Setup Fonnte (WA langsung, scan QR):
 *  1. Daftar di https://fonnte.com
 *  2. Tambah device → scan QR dengan WA kamu
 *  3. Copy token → isi FONNTE_TOKEN di .env
 */

const OWNER_NUMBER = process.env.WA_OWNER_NUMBER || '6285863437122';

async function sendWhatsAppNotification(message) {
  console.log('\n🔔 ===== NOTIFIKASI PESANAN BARU =====');
  console.log(message);
  console.log('=====================================\n');

  // ── 1. FONNTE (WA langsung) ──────────────────────────────
  if (process.env.FONNTE_TOKEN) {
    try {
      const res = await axios.post(
        'https://api.fonnte.com/send',
        { target: OWNER_NUMBER, message, countryCode: '62' },
        { headers: { Authorization: process.env.FONNTE_TOKEN }, timeout: 8000 }
      );
      if (res.data.status) {
        console.log('✅ Notif WA terkirim via Fonnte ke +' + OWNER_NUMBER);
        return { success: true, provider: 'fonnte' };
      }
      console.warn('⚠️ Fonnte:', JSON.stringify(res.data));
    } catch (err) {
      console.error('⚠️ Fonnte error:', err.message);
    }
  }

  // ── 2. TELEGRAM BOT ──────────────────────────────────────
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      // Format markdown untuk Telegram
      const tgMessage = message
        .replace(/\*/g, '*')      // bold tetap
        .replace(/━/g, '—');      // karakter Telegram-friendly

      const res = await axios.post(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: tgMessage,
          parse_mode: 'Markdown'
        },
        { timeout: 8000 }
      );

      if (res.data.ok) {
        console.log('✅ Notif terkirim via Telegram');
        return { success: true, provider: 'telegram' };
      }
      console.warn('⚠️ Telegram:', JSON.stringify(res.data));
    } catch (err) {
      console.error('⚠️ Telegram error:', err.message);
    }
  }

  // ── TIDAK ADA PROVIDER ───────────────────────────────────
  console.log('⚠️  Belum ada provider notif aktif.');
  console.log('   Pilihan termudah → Telegram Bot (2 menit setup):');
  console.log('   1. Buka @BotFather di Telegram → /newbot');
  console.log('   2. Buka bot → klik Start');
  console.log('   3. Buka: https://api.telegram.org/bot<TOKEN>/getUpdates');
  console.log('   4. Isi TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID di backend/.env');

  return { success: false, provider: 'none' };
}

module.exports = { sendWhatsAppNotification };
