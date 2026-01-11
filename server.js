const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'products.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Admin Password (In a real app, hash this or use env vars)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8566898262:AAE7jjCLazUWHxwSTQ89GWg2K_yLupboQ1Q';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '5820217239';

// --- Helpers ---
const readProducts = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading products:", err);
        return [];
    }
};

const writeProducts = (products) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
};

// --- API Routes ---

// Get all products
app.get('/api/products', (req, res) => {
    res.json(readProducts());
});

// Admin Login
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: 'admin_session_token' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

// Add Product (Admin)
app.post('/api/products', (req, res) => {
    const { name, price, color, image, description } = req.body;
    // Basic validation
    if (!name || !price) return res.status(400).json({ error: 'Name and Price required' });

    const products = readProducts();
    const newProduct = {
        id: Date.now(),
        name,
        price,
        color,
        image: image || 'https://via.placeholder.com/150',
        description
    };
    products.push(newProduct);
    writeProducts(products);
    res.json({ success: true, product: newProduct });
});

// Delete Product (Admin)
app.delete('/api/products/:id', (req, res) => {
    const products = readProducts();
    const filtered = products.filter(p => p.id != req.params.id);
    writeProducts(filtered);
    res.json({ success: true });
});

// Send Order to Telegram
app.post('/api/order', async (req, res) => {
    const { product, customer } = req.body;

    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
        return res.status(500).json({ success: false, message: 'Telegram Token not configured' });
    }

    const message = `
📦 *طلب جديد من AM Store*
-------------------------
⌚ *المنتج:* ${product.name}
💰 *السعر:* ${product.price} د.ج
🎨 *اللون:* ${product.color || 'غير محدد'}
-------------------------
👤 *معلومات الزبون:*
📛 *الاسم:* ${customer.name}
📱 *الهاتف:* ${customer.phone}
📍 *الولاية:* ${customer.state}
🏙️ *البلدية:* ${customer.municipality}
-------------------------
🚚 *سعر التوصيل:* ${customer.deliveryPrice} د.ج
💵 *الإجمالي:* ${parseInt(product.price) + parseInt(customer.deliveryPrice)} د.ج
    `;

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
        res.json({ success: true, message: 'تم استلام طلبك بنجاح' });
    } catch (error) {
        console.error("Telegram Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'فشل إرسال الطلب' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
