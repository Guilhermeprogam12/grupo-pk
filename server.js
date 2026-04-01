const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json({ limit: '50mb' }));

const client = new Client({
    authStrategy: new LocalAuth(), // Salva a sessão para não deslogar
    puppeteer: { headless: true, args: ['--no-sandbox'] }
});

// Envia o QR Code para o Front-end via Socket
client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        io.emit('qr', url);
        io.emit('message', 'QR Code gerado, escaneie por favor!');
    });
});

client.on('ready', async () => {
    io.emit('ready', true);
    io.emit('message', 'WhatsApp Conectado!');
    console.log('Cliente pronto!');
});

// Rota para buscar os contatos reais do seu celular
app.get('/contacts', async (req, res) => {
    const contacts = await client.getContacts();
    const filtered = contacts.filter(c => c.isMyContact && !c.isGroup && c.id.server === 'c.us');
    res.json(filtered);
});

// Rota de envio com suporte a Imagem
app.post('/send', async (req, res) => {
    const { number, message, media } = req.body;
    try {
        if (media) {
            const file = new MessageMedia(media.mimetype, media.data, media.filename);
            await client.sendMessage(number, file, { caption: message });
        } else {
            await client.sendMessage(number, message);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

client.initialize();
server.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));
