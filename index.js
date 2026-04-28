const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const QRCode = require("qrcode");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("./auth");

    const sock = makeWASocket({
        auth: state
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update;

        if (qr) {
            const qrImage = await QRCode.toDataURL(qr);
            console.log("SCAN THIS QR:");
            console.log(qrImage);
        }

        if (connection === "open") {
            console.log("✅ Connected to WhatsApp");
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text;

        const sender = msg.key.participant || msg.key.remoteJid;

        if (!text) return;

        if (text.includes("http://") || text.includes("https://")) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `⚠️ Link detected from @${sender.split("@")[0]}`,
                mentions: [sender]
            });
        }
    });
}

startBot();
