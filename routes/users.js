const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/users
 * @desc    Ambil semua user (Admin only)
 * @access  Admin
 */
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [users] = await db.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [parseInt(limit), offset]
    );

    const [[countResult]] = await db.query('SELECT COUNT(*) AS total FROM users');

    res.json({
      success: true,
      data: users,
      pagination: {
        total: countResult.total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Ambil detail user
 * @access  Admin atau user itu sendiri
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const [users] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    res.json({ success: true, data: users[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update profil user
 * @access  User itu sendiri
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const { name, password } = req.body;
    let updateFields = [];
    let params = [];

    if (name) {
      updateFields.push('name = ?');
      params.push(name);
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
      }
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);
      updateFields.push('password = ?');
      params.push(hashed);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diupdate.' });
    }

    params.push(req.params.id);
    await db.query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, params);

    const [updated] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    res.json({ success: true, message: 'Profil berhasil diupdate.', data: updated[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Hapus user (Admin only)
 * @access  Admin
 */
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    // Jangan hapus admin utama
    const [user] = await db.query('SELECT role FROM users WHERE id = ?', [req.params.id]);
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }
    if (user[0].role === 'admin' && req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Tidak bisa menghapus akun admin sendiri.' });
    }

    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

module.exports = router;
