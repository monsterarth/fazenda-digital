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

// --- FUNÇÃO DE INTELIGÊNCIA DE NÚMERO ---
async function getWhatsAppId(number) {
    // 1. Verifica se veio com sinal de + (Indicador de Internacional Explícito)
    const isExplicitInternational = number.toString().startsWith('+');

    // 2. Limpeza básica para processamento (remove o + e outros caracteres)
    let formatted = number.replace(/\D/g, '');
    
    // 3. Lógica de DDI Automático
    // Apenas aplica a lógica de "Adicionar 55" se NÃO for internacional explícito
    // Se o usuário mandou "+31...", o isExplicitInternational é true, então pula esse if.
    if (!isExplicitInternational && (formatted.length >= 10 && formatted.length <= 11)) {
        formatted = '55' + formatted;
    }

    // 4. Tenta verificar o ID exato que foi processado
    try {
        const id = await client.getNumberId(formatted);
        if (id) return id._serialized;
    } catch (e) {
        console.log('Erro ao verificar ID inicial:', e.message);
    }

    // 5. ESTRATÉGIA BRASIL (Correção do 9º dígito)
    // Só tenta remover o 9 se começar com 55 (Brasil) e tiver o tamanho de celular BR com 9º dígito.
    if (formatted.startsWith('55') && formatted.length === 13 && formatted[4] === '9') {
        const withoutNine = formatted.slice(0, 4) + formatted.slice(5); // Remove o dígito na posição 4 (o primeiro 9 do número)
        console.log(`Tentando variante sem o 9: ${withoutNine}`);
        try {
            const idNoNine = await client.getNumberId(withoutNine);
            if (idNoNine) return idNoNine._serialized;
        } catch (e) { }
    }

    // 6. Retorno Blind (se nada der certo, tenta enviar direto concatenando @c.us)
    return formatted.includes('@c.us') ? formatted : `${formatted}@c.us`;
}

// --- Endpoints ---

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
        console.log(`Recebido pedido para: ${number}`);
        
        // Usa nossa função inteligente atualizada
        const targetId = await getWhatsAppId(number);
        
        console.log(`ID Resolvido: ${targetId}`);

        const response = await client.sendMessage(targetId, message);
        res.json({ success: true, targetId, response });

    } catch (error) {
        console.error('Erro no envio:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Synapse Gateway rodando na porta ${PORT}`);
});