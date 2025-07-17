class IndexController {
  static async getHome(req, res) {
    res.json({
      success: true,
      message: 'Welcome to Node.js MVC Application',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        users: '/api/users'
      }
    });
  }

  static async getHealth(req, res) {
    res.json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  }
}

module.exports = IndexController; 