const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const dns = require('dns');
try {
  // Avoid invalid default that can crash in some hosting environments
  dns.setServers(['8.8.8.8']);
} catch (e) {
  console.warn('⚠️ DNS setServers ignored:', e && e.message);
}

const app = express();

// Middleware
// Permissive CORS for Vercel deployments (token auth via Authorization header).
const corsOptions = {
  origin: true,
  credentials: false,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Fallback headers in case middleware doesn't run (ensures Access-Control headers)
app.use((req, res, next) => {
  if (!res.getHeader('Access-Control-Allow-Origin')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug middleware - log all incoming requests
app.use((req, res, next) => {
  console.log(`\n📨 [${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  console.log('📍 Full URL:', req.originalUrl);
  console.log('Headers:', Object.keys(req.headers).join(', '));
  next();
});

// Database connection (serverless-friendly)
const connectDB = require('./utils/db');
connectDB(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully (cached)'))
  .catch(err => console.warn('⚠️ MongoDB connection warning:', err && err.message));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/borrows', require('./routes/borrows'));
app.use('/api/users', require('./routes/users'));

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Library Management System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      books: '/api/books',
      borrows: '/api/borrows'
    }
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  const state = mongoose.connection && mongoose.connection.readyState;
  res.json({
    ok: true,
    mongoState: state
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  // Multer errors
  if (err.message === 'Unexpected end of form') {
    return res.status(400).json({
      success: false,
      message: 'Lỗi upload file: Dữ liệu không hợp lệ'
    });
  }

  if (err.message && err.message.includes('LIMIT_FILE_SIZE')) {
    return res.status(413).json({
      success: false,
      message: 'File quá lớn (tối đa 5MB)'
    });
  }

  if (err.message && (err.message.includes('image') || err.message.includes('MIME'))) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Loại file không hợp lệ'
    });
  }

  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = Number(process.env.PORT || 5000);

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && !process.env.VERCEL) {
      const nextPort = port + 1;
      console.warn(`⚠️ Port ${port} is busy, retrying on ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error('❌ Server listen error:', err);
    process.exit(1);
  });
}

// When deployed on Vercel (serverless), do not call `app.listen`.
// Export the Express app so the Vercel Node builder can handle requests.
if (!process.env.VERCEL) {
  startServer(PORT);
} else {
  console.log('ℹ️ Running in Vercel serverless environment; exporting app instead of listening.');
}

module.exports = app;