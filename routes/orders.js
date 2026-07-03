const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { sendWhatsAppNotification } = require('../utils/whatsapp');

/**
 * @route   POST /api/orders/checkout
 * @desc    Buat pesanan baru + kirim notif WA ke owner
 * @access  Private (User login)
 */
router.post('/checkout', verifyToken, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      items,         // [{product_id, qty, price, name}]
      shipping_name,
      shipping_phone,
      shipping_address,
      shipping_courier,
      shipping_cost,
      payment_method,
      subtotal,
      total_price
    } = req.body;

    // Validasi
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Keranjang belanja kosong.' });
    }
    if (!shipping_name || !shipping_phone || !shipping_address) {
      return res.status(400).json({ success: false, message: 'Lengkapi data pengiriman.' });
    }

    // Buat order ID unik
    const orderId = 'BVR-' + Date.now();

    // Simpan order ke tabel orders
    const [orderResult] = await conn.query(
      `INSERT INTO orders 
        (order_id, user_id, shipping_name, shipping_phone, shipping_address, shipping_courier, shipping_cost, payment_method, subtotal, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        orderId,
        req.user.id,
        shipping_name,
        shipping_phone,
        shipping_address,
        shipping_courier || 'J&T Reg',
        shipping_cost || 0,
        payment_method || 'QRIS',
        subtotal,
        total_price
      ]
    );

    const dbOrderId = orderResult.insertId;

    // Simpan item pesanan ke tabel order_items
    for (const item of items) {
      await conn.query(
        `INSERT INTO order_items (order_db_id, product_id, product_name, product_image, qty, price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [dbOrderId, item.product_id, item.name, item.image || '', item.qty, item.price]
      );

      // Update stok produk
      await conn.query(
        'UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ?',
        [item.qty, item.product_id]
      );
    }

    await conn.commit();

    // Kirim notifikasi WhatsApp ke owner
    const waMessage = formatOrderMessage({
      orderId,
      customerName: req.user.name,
      customerEmail: req.user.email,
      items,
      shipping_name,
      shipping_phone,
      shipping_address,
      shipping_courier,
      payment_method,
      total_price
    });

    const waResult = await sendWhatsAppNotification(waMessage);

    res.status(201).json({
      success: true,
      message: 'Pesanan berhasil dibuat! Notifikasi telah dikirim ke owner.',
      data: {
        order_id: orderId,
        total_price,
        status: 'pending',
        wa_link: waResult.wa_link,        // buka link ini untuk notif manual
        wa_provider: waResult.provider    // 'fonnte' | 'callmebot' | 'link'
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('[CHECKOUT ERROR]', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat checkout.' });
  } finally {
    conn.release();
  }
});

/**
 * @route   GET /api/orders/my
 * @desc    Ambil riwayat pesanan milik user yang login
 * @access  Private
 */
router.get('/my', verifyToken, async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );

    // Fetch items for each order
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const [items] = await db.query(
        'SELECT * FROM order_items WHERE order_db_id = ?',
        [order.id]
      );
      return { ...order, items };
    }));

    res.json({ success: true, data: ordersWithItems });
  } catch (err) {
    console.error('[GET MY ORDERS ERROR]', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

/**
 * @route   GET /api/orders/:orderId
 * @desc    Ambil detail satu pesanan
 * @access  Private (owner order atau admin)
 */
router.get('/:orderId', verifyToken, async (req, res) => {
  try {
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE order_id = ?',
      [req.params.orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }

    const order = orders[0];

    // Hanya owner atau admin yang bisa lihat
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const [items] = await db.query(
      'SELECT * FROM order_items WHERE order_db_id = ?',
      [order.id]
    );

    res.json({ success: true, data: { ...order, items } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

// ============== ADMIN ROUTES ==============

/**
 * @route   GET /api/orders
 * @desc    Ambil semua pesanan (Admin only)
 * @access  Admin
 */
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '';
    const params = [];

    if (status) {
      whereClause = 'WHERE o.status = ?';
      params.push(status);
    }

    const [orders] = await db.query(
      `SELECT o.*, u.name AS customer_name, u.email AS customer_email,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_db_id = o.id) AS item_count
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: orders,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('[ADMIN GET ORDERS ERROR]', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

/**
 * @route   PUT /api/orders/:orderId/status
 * @desc    Update status pesanan (Admin only)
 * @access  Admin
 */
router.put('/:orderId/status', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid.' });
    }

    const [result] = await db.query(
      'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?',
      [status, req.params.orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }

    res.json({ success: true, message: `Status pesanan diubah ke: ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

/**
 * @route   GET /api/orders/admin/stats
 * @desc    Statistik penjualan untuk dashboard admin
 * @access  Admin
 */
router.get('/admin/stats', verifyAdmin, async (req, res) => {
  try {
    // Total revenue (semua order kecuali cancelled)
    const [[revenueResult]] = await db.query(
      "SELECT COALESCE(SUM(total_price), 0) AS total_revenue FROM orders WHERE status != 'cancelled'"
    );

    // Total orders
    const [[ordersResult]] = await db.query('SELECT COUNT(*) AS total_orders FROM orders');

    // Total items sold
    const [[itemsResult]] = await db.query(
      "SELECT COALESCE(SUM(oi.qty), 0) AS total_items FROM order_items oi JOIN orders o ON oi.order_db_id = o.id WHERE o.status != 'cancelled'"
    );

    // Average order value
    const avgOrder = ordersResult.total_orders > 0
      ? revenueResult.total_revenue / ordersResult.total_orders
      : 0;

    // Sales per day (7 hari terakhir)
    const [salesTrend] = await db.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS orders, SUM(total_price) AS revenue
       FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       AND status != 'cancelled'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    // Top categories
    const [categoryStats] = await db.query(
      `SELECT p.category, COUNT(oi.id) AS sold_count, SUM(oi.qty) AS total_qty
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_db_id = o.id
       WHERE o.status != 'cancelled'
       GROUP BY p.category
       ORDER BY total_qty DESC`
    );

    res.json({
      success: true,
      data: {
        total_revenue: revenueResult.total_revenue,
        total_orders: ordersResult.total_orders,
        total_items_sold: itemsResult.total_items,
        avg_order_value: Math.round(avgOrder),
        sales_trend: salesTrend,
        category_stats: categoryStats
      }
    });
  } catch (err) {
    console.error('[ADMIN STATS ERROR]', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

// Helper: format pesan notifikasi WA
function formatOrderMessage({ orderId, customerName, customerEmail, items, shipping_name, shipping_phone, shipping_address, shipping_courier, payment_method, total_price }) {
  const itemList = items.map(i => `  • ${i.name} x${i.qty} - Rp ${Number(i.price).toLocaleString('id-ID')}`).join('\n');

  return `🛍️ *PESANAN BARU - BAGVERSE*
━━━━━━━━━━━━━━━━━
📦 Order ID: *${orderId}*
🕐 Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}

👤 *Pelanggan:*
Nama: ${customerName}
Email: ${customerEmail}

📋 *Item Pesanan:*
${itemList}

📍 *Pengiriman:*
Nama: ${shipping_name}
HP: ${shipping_phone}
Alamat: ${shipping_address}
Ekspedisi: ${shipping_courier}

💳 Pembayaran: ${payment_method}
💰 *Total: Rp ${Number(total_price).toLocaleString('id-ID')}*
━━━━━━━━━━━━━━━━━
Segera konfirmasi pesanan ini! 🚀`;
}

module.exports = router;
