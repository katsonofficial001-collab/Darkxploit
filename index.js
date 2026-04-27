const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("📲 Scan this QR in WhatsApp Linked Devices");
            console.log(qr);
        }

        if (connection === 'close') {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                startBot();
            }
        }

        if (connection === 'open') {
            console.log("✅ Bot connected successfully");
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text;

        const sender = msg.key.participant || msg.key.remoteJid;

        if (!text) return;

        // 🔗 LINK DETECTION
        if (text.includes("http://") || text.includes("https://")) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `⚠️ Link detected from @${sender.split("@")[0]}`,
                mentions: [sender]
            });

            console.log("🚨 Link detected:", text);
        }
    });
}

startBot();
