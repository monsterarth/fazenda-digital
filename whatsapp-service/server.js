const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: '/app/session' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

let qrCodeUrl = null;
let isReady = false;

client.on('qr', (qr) => {
    console.log('QR Code recebido!');
    qrcode.toDataURL(qr, (err, url) => {
        if (!err) qrCodeUrl = url;
    });
});

client.on('ready', () => {
    console.log('✅ WhatsApp Conectado e Pronto!');
    isReady = true;
    qrCodeUrl = null;
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp desconectado:', reason);
    isReady = false;
    client.initialize();
});

client.initialize();

async function getWhatsAppId(number) {
    // 1. Identifica internacional
    const isExplicitInternational = number.toString().startsWith('+');
    let formatted = number.replace(/\D/g, '');

    // 2. Lógica BR apenas se não tiver '+'
    if (!isExplicitInternational && (formatted.length >= 10 && formatted.length <= 11)) {
        formatted = '55' + formatted;
    }

    // 3. Formata ID padrão do WhatsApp
    // Importante: Números internacionais no whats são apenas [DDI][NUMERO]@c.us
    const defaultId = `${formatted}@c.us`;

    // 4. Tenta validar se o número existe (getNumberId)
    // Se der erro de LID aqui, nós IGNORAMOS e usamos o defaultId para forçar o envio.
    try {
        const id = await client.getNumberId(formatted);
        if (id && id._serialized) {
            return id._serialized;
        }
    } catch (e) {
        console.log(`⚠️ Validação falhou para ${formatted} (Erro: ${e.message}). Tentando envio direto.`);
    }

    // 5. Retorno de segurança (Blind Send)
    // Mesmo que a validação falhe, o WhatsApp Web muitas vezes aceita enviar se o formato estiver certo.
    return defaultId;
}

app.get('/qr', (req, res) => {
    if (isReady) return res.send('<html><body><h1 style="color:green">✅ WhatsApp Conectado!</h1></body></html>');
    if (!qrCodeUrl) return res.send('<html><body><h1>⏳ Iniciando... aguarde e recarregue.</h1><script>setTimeout(()=>location.reload(),3000)</script></body></html>');
    res.send(`<html><body><h1>Escaneie o QR Code</h1><img src="${qrCodeUrl}" /></body></html>`);
});

app.get('/status', (req, res) => {
    res.json({ ready: isReady, info: isReady ? 'ONLINE' : 'OFFLINE' });
});

app.post('/send', async (req, res) => {
    if (!isReady) return res.status(503).json({ error: 'WhatsApp não está pronto.' });

    const { number, message } = req.body;
    if (!number || !message) return res.status(400).json({ error: 'Dados inválidos.' });

    try {
        console.log(`📨 Enviando para: ${number}`);
        
        const targetId = await getWhatsAppId(number);
        console.log(`🎯 ID Alvo: ${targetId}`);

        const response = await client.sendMessage(targetId, message);
        res.json({ success: true, targetId, response });

    } catch (error) {
        console.error('❌ Erro Fatal no envio:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Synapse Gateway rodando na porta ${PORT}`);
});