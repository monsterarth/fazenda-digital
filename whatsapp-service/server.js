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

// --- Endpoints ---

app.get('/qr', (req, res) => {
    if (isReady) return res.send('<html><body><h1>✅ Conectado!</h1></body></html>');
    if (!qrCodeUrl) return res.send('<html><body><h1>⏳ Iniciando... aguarde.</h1><script>setTimeout(()=>location.reload(),2000)</script></body></html>');
    res.send(`<html><body><h1>Escaneie o QR Code</h1><img src="${qrCodeUrl}" /></body></html>`);
});

app.get('/status', (req, res) => {
    res.json({ 
        ready: isReady, 
        info: isReady ? 'ONLINE' : 'OFFLINE' 
    });
});

app.post('/send', async (req, res) => {
    if (!isReady) return res.status(503).json({ error: 'WhatsApp não está pronto.' });

    const { number, message } = req.body;

    if (!number || !message) return res.status(400).json({ error: 'Dados inválidos.' });

    try {
        // --- LÓGICA DE FORMATAÇÃO CORRIGIDA ---
        let formattedNumber = number.replace(/\D/g, ''); // Remove tudo que não é número

        // Se tiver 10 ou 11 dígitos (Ex: 31999999999), assume que é BR e adiciona 55
        if (formattedNumber.length >= 10 && formattedNumber.length <= 11) {
            formattedNumber = '55' + formattedNumber;
        }

        // Adiciona o sufixo do WhatsApp Web se não tiver
        if (!formattedNumber.endsWith('@c.us')) {
            formattedNumber += '@c.us';
        }

        console.log(`Tentando enviar para: ${formattedNumber}`);
        
        // Verifica se o número existe no WhatsApp antes de enviar (opcional, mas bom para debug)
        const isRegistered = await client.isRegisteredUser(formattedNumber);
        if (!isRegistered) {
            console.log(`Número ${formattedNumber} não registrado no WhatsApp.`);
            return res.status(404).json({ error: 'Número não possui WhatsApp válido.' });
        }

        const response = await client.sendMessage(formattedNumber, message);
        console.log(`Mensagem enviada com sucesso para ${formattedNumber}`);
        res.json({ success: true, response });

    } catch (error) {
        console.error('Erro no envio:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Synapse Gateway rodando na porta ${PORT}`);
});