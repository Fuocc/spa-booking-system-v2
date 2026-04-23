const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://yoi-dashboard-v2.netlify.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.netlify.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Routes
app.use('/api/branches', require('./routes/branches'));
app.use('/api/services', require('./routes/services'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/beds', require('./routes/beds'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/availability', require('./routes/availability'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/employee-schedules', require('./routes/employeeSchedules'));
app.use('/api/webhooks', require('./routes/webhooks'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback to serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ YOi Booking API running on http://localhost:${PORT}`);
  console.log(`📋 Frontend: http://localhost:${PORT}`);
  console.log(`📊 Dashboard: Run separately with Vite`);
});
