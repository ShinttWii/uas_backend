const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

/**
 * @route   GET /api/wishlist
 * @desc    Ambil wishlist user
 * @access  Private
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const [items] = await db.query(
      `SELECT w.id as wishlist_id, p.*
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ? AND p.is_active = 1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: items });
  } catch (err) {
    console.error('[GET WISHLIST ERROR]', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

/**
 * @route   POST /api/wishlist
 * @desc    Tambah produk ke wishlist
 * @access  Private
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: 'product_id wajib diisi.' });
    }

    // Cek produk ada
    const [products] = await db.query('SELECT id FROM products WHERE id = ? AND is_active = 1', [product_id]);
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    }

    // Cek sudah ada di wishlist
    const [existing] = await db.query(
      'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?',
      [req.user.id, product_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Produk sudah ada di wishlist.' });
    }

    await db.query(
      'INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)',
      [req.user.id, product_id]
    );

    res.status(201).json({ success: true, message: 'Produk berhasil ditambahkan ke wishlist.' });
  } catch (err) {
    console.error('[ADD WISHLIST ERROR]', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

/**
 * @route   DELETE /api/wishlist/:productId
 * @desc    Hapus produk dari wishlist
 * @access  Private
 */
router.delete('/:productId', verifyToken, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM wishlists WHERE user_id = ? AND product_id = ?',
      [req.user.id, req.params.productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Item tidak ditemukan di wishlist.' });
    }

    res.json({ success: true, message: 'Produk berhasil dihapus dari wishlist.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

/**
 * @route   POST /api/wishlist/toggle
 * @desc    Toggle wishlist (add jika belum ada, hapus jika sudah ada)
 * @access  Private
 */
router.post('/toggle', verifyToken, async (req, res) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: 'product_id wajib diisi.' });
    }

    const [existing] = await db.query(
      'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?',
      [req.user.id, product_id]
    );

    if (existing.length > 0) {
      await db.query('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);
      return res.json({ success: true, action: 'removed', message: 'Dihapus dari wishlist.' });
    } else {
      await db.query('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)', [req.user.id, product_id]);
      return res.json({ success: true, action: 'added', message: 'Ditambahkan ke wishlist.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

module.exports = router;
