const jwt = require('jsonwebtoken');

/**
 * Middleware verifikasi token JWT
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Token tidak ditemukan.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Token tidak valid atau sudah kadaluarsa.'
    });
  }
};

/**
 * Middleware khusus Admin
 */
const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Hanya Admin yang diizinkan.'
      });
    }
    next();
  });
};

module.exports = { verifyToken, verifyAdmin };
