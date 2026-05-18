exports.getStatus = (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running successfully',
        timestamp: new Date()
    });
};