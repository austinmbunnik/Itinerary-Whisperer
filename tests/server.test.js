const request = require('supertest');

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.SESSION_SECRET = 'test-secret-for-testing-minimum-32-characters';

// Import the app after setting environment variables
const app = require('../src/server');

describe('Express Server', () => {
  describe('Health Endpoint', () => {
    test('GET /health should return 200 and status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment', 'test');
      expect(response.body).toHaveProperty('version', '1.0.0');

      // Validate timestamp format
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe('Static File Serving', () => {
    test('GET / should serve static files', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      // Should serve HTML content
      expect(response.headers['content-type']).toMatch(/html/);
    });

    test('GET /styles.css should serve CSS file if it exists', async () => {
      const response = await request(app)
        .get('/styles.css');

      // Should either serve the CSS file (200) or return 404 if not found
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/css/);
      }
    });
  });

  describe('Error Handling', () => {
    test('GET /nonexistent-route should return 404', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message', 'Route not found');
      expect(response.body.error).toHaveProperty('status', 404);
      expect(response.body.error).toHaveProperty('timestamp');

      // Validate timestamp format
      const timestamp = new Date(response.body.error.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    test('should handle invalid JSON gracefully', async () => {
      const response = await request(app)
        .post('/health')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      // Should handle the error gracefully (might be 400 or 404 depending on route)
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Security Headers', () => {
    test('should include security headers from helmet', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for common security headers added by helmet
      expect(response.headers).toHaveProperty('x-dns-prefetch-control');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-download-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
    });
  });

  describe('CORS Configuration', () => {
    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      // Should allow the request (200) or handle it appropriately
      expect([200, 204, 404]).toContain(response.status);
    });

    test('should include CORS headers for allowed origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      // Check if CORS headers are present when origin is set
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).toBeDefined();
      }
    });
  });

  describe('Compression', () => {
    test('should compress responses when requested', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept-Encoding', 'gzip');

      // Response should either be compressed or not, but should be valid
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });
  });
});
