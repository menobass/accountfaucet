const express = require('express');
const cors = require('cors');
const BlockchainMonitor = require('./services/blockchain-monitor');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize blockchain monitor
const monitor = new BlockchainMonitor();

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'hive-account-faucet-backend',
        version: '1.0.0',
        monitoring: monitor.isRunning,
        lastBlock: monitor.lastProcessedBlock,
        timestamp: new Date().toISOString()
    });
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        monitoring: monitor.isRunning,
        lastProcessedBlock: monitor.lastProcessedBlock,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// Start monitoring endpoint (for manual control)
app.post('/monitor/start', (req, res) => {
    if (monitor.isRunning) {
        return res.json({ message: 'Monitor already running' });
    }
    
    monitor.start();
    res.json({ message: 'Monitor started' });
});

// Stop monitoring endpoint (for manual control)
app.post('/monitor/stop', (req, res) => {
    monitor.stop();
    res.json({ message: 'Monitor stopped' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, async () => {
    console.log('🚀 Hive Account Faucet Backend Starting...');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Status check: http://localhost:${PORT}/status`);
    console.log('');
    console.log('✅ DELIVERY METHODS AVAILABLE:');
    console.log('   � Email delivery: ✅ ENABLED (to registered addresses)');
    console.log('   � Memo delivery: ✅ ENABLED (encrypted with hive-js)');
    console.log('   � Both methods: ✅ ENABLED (email + memo)');
    console.log('');
    
    // Start blockchain monitoring automatically
    console.log('🔄 Starting blockchain monitor...');
    await monitor.start();
    
    console.log('✅ Backend fully operational!');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\\n👋 Shutting down gracefully...');
    monitor.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\\n👋 Received SIGTERM, shutting down gracefully...');
    monitor.stop();
    process.exit(0);
});
