const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/products
 * @desc    Ambil semua produk (dengan search, filter kategori, sort harga, pagination)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { search = '', category = '', sort = 'default', page = 1, limit = 100 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE is_active = 1';
    const params = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    let orderClause = 'ORDER BY id ASC';
    if (sort === 'cheap') orderClause = 'ORDER BY price ASC';
    else if (sort === 'expensive') orderClause = 'ORDER BY price DESC';
    else if (sort === 'rating') orderClause = 'ORDER BY rating DESC';
    else if (sort === 'newest') orderClause = 'ORDER BY created_at DESC';

    // Hitung total untuk pagination
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM products ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Ambil data produk
    const [products] = await db.query(
      `SELECT * FROM products ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('[GET PRODUCTS ERROR]', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

/**
 * @route   GET /api/products/:id
 * @desc    Ambil detail satu produk
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const [products] = await db.query(
      'SELECT * FROM products WHERE id = ? AND is_active = 1',
      [req.params.id]
    );

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    }

    res.json({ success: true, data: products[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

/**
 * @route   POST /api/products
 * @desc    Tambah produk baru (Admin only)
 * @access  Admin
 */
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { name, price, category, rating, image, description, stock } = req.body;

    // Validasi
    if (!name || !price || !category) {
      return res.status(400).json({ success: false, message: 'Nama, harga, dan kategori wajib diisi.' });
    }
    if (!['Pria', 'Wanita', 'Unisex'].includes(category)) {
      return res.status(400).json({ success: false, message: 'Kategori harus: Pria, Wanita, atau Unisex.' });
    }
    if (price < 0) {
      return res.status(400).json({ success: false, message: 'Harga tidak boleh negatif.' });
    }

    const [result] = await db.query(
      `INSERT INTO products (name, price, category, rating, image, description, stock) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        price,
        category,
        rating || 5,
        image || '',
        description || '',
        stock || 0
      ]
    );

    const [newProduct] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Produk berhasil ditambahkan.',
      data: newProduct[0]
    });
  } catch (err) {
    console.error('[ADD PRODUCT ERROR]', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

/**
 * @route   PUT /api/products/:id
 * @desc    Update produk (Admin only)
 * @access  Admin
 */
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { name, price, category, rating, image, description, stock, is_active } = req.body;

    // Cek produk ada
    const [existing] = await db.query('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    }

    if (category && !['Pria', 'Wanita', 'Unisex'].includes(category)) {
      return res.status(400).json({ success: false, message: 'Kategori harus: Pria, Wanita, atau Unisex.' });
    }

    await db.query(
      `UPDATE products SET
        name = COALESCE(?, name),
        price = COALESCE(?, price),
        category = COALESCE(?, category),
        rating = COALESCE(?, rating),
        image = COALESCE(?, image),
        description = COALESCE(?, description),
        stock = COALESCE(?, stock),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, price, category, rating, image, description, stock, is_active, req.params.id]
    );

    const [updated] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Produk berhasil diupdate.',
      data: updated[0]
    });
  } catch (err) {
    console.error('[UPDATE PRODUCT ERROR]', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Hapus produk (soft delete - Admin only)
 * @access  Admin
 */
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const [existing] = await db.query('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    }

    // Soft delete - set is_active = 0
    await db.query('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: 'Produk berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

/**
 * @route   GET /api/products/admin/all
 * @desc    Ambil semua produk termasuk yang nonaktif (Admin only)
 * @access  Admin
 */
router.get('/admin/all', verifyAdmin, async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json({ success: true, data: products, total: products.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

module.exports = router;
