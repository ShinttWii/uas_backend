require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
  origin: [
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://127.0.0.1',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// ROUTES
// ============================================
const authRoutes     = require('./routes/auth');
const productRoutes  = require('./routes/products');
const orderRoutes    = require('./routes/orders');
const wishlistRoutes = require('./routes/wishlist');
const userRoutes     = require('./routes/users');

app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/users',    userRoutes);

// ============================================
// ROOT & HEALTH CHECK
// ============================================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🛍️ BagVerse API v1.0 - Online Store API',
    version: '1.0.0',
    author: 'Dewi Shinta',
    endpoints: {
      auth:     '/api/auth',
      products: '/api/products',
      orders:   '/api/orders',
      wishlist: '/api/wishlist',
      users:    '/api/users'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} tidak ditemukan.` });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n🚀 ================================');
  console.log(`🛍️  BagVerse API berjalan!`);
  console.log(`🌐  http://localhost:${PORT}`);
  console.log(`📋  Docs: http://localhost:${PORT}/`);
  console.log('🚀 ================================\n');
});

module.exports = app;
