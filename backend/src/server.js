require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import kết nối Database
const { testConnection } = require('./db');
const { startMonthlyForecastScheduler } = require('./services/monthlyForecastScheduler'); 

// Import routes
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api', apiRoutes);


// Basic root route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to ForecastAI Backend API' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    
    // Gọi hàm test kết nối DB khi khởi động
    await testConnection();
    startMonthlyForecastScheduler();
});