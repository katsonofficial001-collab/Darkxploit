const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("./auth");

    const sock = makeWASocket({
        auth: state,
        browser: ["Railway Bot", "Chrome", "1.0.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "connecting") {
            console.log("🔄 Connecting...");
        }

        if (connection === "open") {
            console.log("✅ Connected to WhatsApp");
        }

        // 🔑 Request pairing ONLY after slight delay
        if (!sock.authState.creds.registered) {
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode("2348142876956");
                    console.log("📲 Pairing Code:", code);
                } catch (err) {
                    console.log("❌ Pairing error:", err.message);
                }
            }, 5000); // wait 5 seconds
        }

        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            console.log("❌ Connection closed");
            if (shouldReconnect) startBot();
        }
    });

    // 🔗 Link detector
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
