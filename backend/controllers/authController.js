const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Tạo JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Đăng ký tài khoản
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { fullName, cccd, email, password, phone, address } = req.body;

    // Validate định dạng CCCD
    if (!/^\d{12}$/.test(cccd)) {
      return res.status(400).json({
        success: false,
        message: 'Số CCCD phải gồm đúng 12 chữ số'
      });
    }

    // Kiểm tra CCCD đã tồn tại chưa
    const userExists = await User.findOne({ cccd });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Số CCCD này đã được đăng ký tài khoản'
      });
    }

    // Tạo user mới
    const user = await User.create({
      fullName,
      cccd,
      email: email || undefined,
      password,
      phone,
      address,
      role: 'reader'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        _id: user._id,
        fullName: user.fullName,
        cccd: user.cccd,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Đăng nhập
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { cccd, email, password } = req.body;
    const hasCccd = typeof cccd === 'string' && cccd.trim();
    const hasEmail = typeof email === 'string' && email.trim();

    if ((!hasCccd && !hasEmail) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập số CCCD hoặc email và mật khẩu'
      });
    }

    const query = [];

    if (hasCccd) {
      const trimmedCccd = cccd.trim();

      if (!/^\d{12}$/.test(trimmedCccd)) {
        return res.status(400).json({
          success: false,
          message: 'Số CCCD phải gồm đúng 12 chữ số'
        });
      }

      query.push({ cccd: trimmedCccd });
    }

    if (hasEmail) {
      query.push({ email: email.trim().toLowerCase() });
    }

    // Tìm user theo CCCD hoặc email và include password
    const user = await User.findOne(
      query.length === 1 ? query[0] : { $or: query }
    ).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Số CCCD/email hoặc mật khẩu không đúng'
      });
    }

    // Kiểm tra password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Số CCCD/email hoặc mật khẩu không đúng'
      });
    }

    // Kiểm tra status
    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa'
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        _id: user._id,
        fullName: user.fullName,
        cccd: user.cccd,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Lấy thông tin user hiện tại
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// backend/controllers/authController.js