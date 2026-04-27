require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', apiRoutes);

// Basic root route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to ForecastAI Backend API' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});
