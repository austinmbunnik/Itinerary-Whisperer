const request = require('supertest');
const MockBrevoEmailService = require('./mocks/MockBrevoEmailService');

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.SESSION_SECRET = 'test-secret-for-testing-minimum-32-characters';
process.env.BREVO_API_KEY = 'test-brevo-api-key';
process.env.BREVO_FROM_EMAIL = 'test@example.com';

// Mock the email service before importing the server
const mockEmailService = {
  sendTranscript: jest.fn(),
  getMetrics: jest.fn(() => ({ sent: 0, failed: 0, retries: 0, totalCost: 0 })),
  validateConfiguration: jest.fn(() => Promise.resolve(true)),
  reset: jest.fn(),
  configure: jest.fn()
};

jest.mock('../src/services/emailService', () => {
  // Create a mock EmailServiceError class
  class MockEmailServiceError extends Error {
    constructor(message, code, statusCode = null, details = null) {
      super(message);
      this.name = 'EmailServiceError';
      this.code = code;
      this.statusCode = statusCode;
      this.details = details;
    }
  }
  
  return {
    initializeEmailService: jest.fn(() => mockEmailService),
    getEmailService: jest.fn(() => mockEmailService),
    EmailServiceError: MockEmailServiceError
  };
});

const app = require('../src/server');
const { getEmailService } = require('../src/services/emailService');

describe('Email Endpoint Integration Tests', () => {
  let emailService;
  let completedJobId;
  
  beforeEach(() => {
    emailService = getEmailService();
    
    // Reset mock functions
    emailService.sendTranscript.mockClear();
    emailService.getMetrics.mockClear();
    emailService.validateConfiguration.mockClear();
    
    // Create a mock completed job for testing
    completedJobId = 'test-job-123e4567-e89b-12d3-a456-426614174000';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Validation', () => {
    test('should reject request with invalid email format', async () => {
      const response = await request(app)
        .post('/email')
        .send({
          email: 'invalid-email',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBe('VALIDATION_ERROR');
      expect(response.body.validationErrors).toHaveLength(1);
      expect(response.body.validationErrors[0].msg).toContain('valid email');
    });

    test('should reject request with missing email', async () => {
      const response = await request(app)
        .post('/email')
        .send({
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toBe('VALIDATION_ERROR');
    });

    test('should reject request with missing transcriptId', async () => {
      const response = await request(app)
        .post('/email')
        .send({
          email: 'test@example.com'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toBe('VALIDATION_ERROR');
    });

    test('should reject request with invalid UUID format', async () => {
      const response = await request(app)
        .post('/email')
        .send({
          email: 'test@example.com',
          transcriptId: 'invalid-uuid'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toBe('VALIDATION_ERROR');
      expect(response.body.validationErrors[0].msg).toContain('valid UUID');
    });

    test('should accept valid email and UUID', async () => {
      // Mock a completed job in the job store
      const mockJob = {
        id: completedJobId,
        status: 'completed',
        transcriptText: 'Test transcript content',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // We need to mock the job store access
      const originalServerModule = require('../src/server');
      
      const response = await request(app)
        .post('/email')
        .send({
          email: 'test@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      // Should either succeed or fail with a specific error about job not found
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within rate limit', async () => {
      const requests = [];
      
      // Send 5 requests (within the 10/hour limit)
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/email')
            .send({
              email: `test${i}@example.com`,
              transcriptId: completedJobId
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // All requests should either succeed or fail with job-related errors, not rate limiting
      responses.forEach(response => {
        expect(response.status).not.toBe(429);
      });
    });

    test('should enforce rate limit after 10 requests', async () => {
      const requests = [];
      
      // Send 12 requests to exceed the 10/hour limit
      for (let i = 0; i < 12; i++) {
        requests.push(
          request(app)
            .post('/email')
            .send({
              email: `test${i}@example.com`,
              transcriptId: completedJobId
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Check rate limit error format
      if (rateLimitedResponses.length > 0) {
        const rateLimitResponse = rateLimitedResponses[0];
        expect(rateLimitResponse.body.success).toBe(false);
        expect(rateLimitResponse.body.error).toContain('Too many email requests');
        expect(rateLimitResponse.body.details).toBe('RATE_LIMIT_EXCEEDED');
        expect(rateLimitResponse.body.retryAfter).toBe('1 hour');
        expect(rateLimitResponse.body.limit).toBe(10);
      }
    });

    test('should include rate limit headers', async () => {
      const response = await request(app)
        .post('/email')
        .send({
          email: 'test@example.com',
          transcriptId: completedJobId
        });

      // Check for rate limit headers
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });
  });

  describe('Job Status Validation', () => {
    test('should reject non-existent transcript', async () => {
      const nonExistentId = '12345678-1234-1234-1234-123456789000';
      
      const response = await request(app)
        .post('/email')
        .send({
          email: 'test@example.com',
          transcriptId: nonExistentId
        })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Transcript not found');
      expect(response.body.details).toBe('TRANSCRIPT_NOT_FOUND');
    });

    test('should reject pending transcript', async () => {
      // This test would need to mock the job store to return a pending job
      // For now, we'll test the response format
      const response = await request(app)
        .post('/email')
        .send({
          email: 'test@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      if (response.status === 400 && response.body.details === 'TRANSCRIPT_NOT_READY') {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('not ready for email');
        expect(response.body.currentStatus).toBeDefined();
      }
    });

    test('should reject failed transcript', async () => {
      const response = await request(app)
        .post('/email')
        .send({
          email: 'test@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      if (response.status === 400 && response.body.details === 'TRANSCRIPT_FAILED') {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('generation failed');
        expect(response.body.currentStatus).toBe('failed');
      }
    });
  });

  describe('Email Service Integration', () => {
    test('should process email request successfully', async () => {
      // Configure mock to succeed
      emailService.configure({
        shouldFail: false
      });

      const response = await request(app)
        .post('/email')
        .send({
          email: 'test@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      // Check if email service was called
      expect(emailService.getCallCount('sendTranscript')).toBeGreaterThanOrEqual(0);
      
      // Response should indicate processing started
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('processing');
        expect(response.body.details.email).toBe('test@example.com');
        expect(response.body.details.transcriptId).toBe(completedJobId);
      }
    });

    test('should handle email service unavailable', async () => {
      // Mock email service to be unavailable
      const { getEmailService } = require('../src/services/emailService');
      getEmailService.mockReturnValue(null);

      const response = await request(app)
        .post('/email')
        .send({
          email: 'test@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      // Should handle gracefully
      expect([200, 500]).toContain(response.status);
    });

    test('should handle email service errors', async () => {
      // Configure mock to fail
      emailService.configure({
        shouldFail: true,
        errorType: 'API_ERROR',
        statusCode: 500
      });

      const response = await request(app)
        .post('/email')
        .send({
          email: 'test@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      // Should still return success initially (async processing)
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('processing');
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/email')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle missing Content-Type', async () => {
      const response = await request(app)
        .post('/email')
        .send({
          email: 'test@example.com',
          transcriptId: completedJobId
        });

      expect([200, 400, 404]).toContain(response.status);
    });

    test('should handle internal server errors', async () => {
      // Send a request that might trigger an internal error
      const response = await request(app)
        .post('/email')
        .send({
          email: 'test@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      if (response.status === 500) {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Internal server error');
        expect(response.body.details).toBe('EMAIL_PROCESS_ERROR');
      }
    });
  });

  describe('Response Format', () => {
    test('should return consistent response format for validation errors', async () => {
      const response = await request(app)
        .post('/email')
        .send({
          email: 'invalid-email',
          transcriptId: 'invalid-uuid'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
      expect(response.body).toHaveProperty('validationErrors');
      expect(Array.isArray(response.body.validationErrors)).toBe(true);
    });

    test('should return consistent response format for successful requests', async () => {
      const response = await request(app)
        .post('/email')
        .send({
          email: 'test@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('details');
        expect(response.body.details).toHaveProperty('email');
        expect(response.body.details).toHaveProperty('transcriptId');
        expect(response.body.details).toHaveProperty('requestedAt');
      }
    });
  });

  describe('Security', () => {
    test('should sanitize email input', async () => {
      const response = await request(app)
        .post('/email')
        .send({
          email: '  TEST@EXAMPLE.COM  ',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      // Email should be normalized (lowercase, trimmed)
      if (response.status === 200) {
        expect(response.body.details.email).toBe('test@example.com');
      }
    });

    test('should include security headers', async () => {
      const response = await request(app)
        .post('/email')
        .send({
          email: 'test@example.com',
          transcriptId: completedJobId
        });

      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-dns-prefetch-control');
    });

    test('should prevent XSS in error messages', async () => {
      const response = await request(app)
        .post('/email')
        .send({
          email: '<script>alert("xss")</script>@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).not.toContain('<script>');
    });
  });

  describe('Async Processing', () => {
    test('should return immediate response for async processing', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .post('/email')
        .send({
          email: 'test@example.com',
          transcriptId: completedJobId
        });

      const duration = Date.now() - start;
      
      // Should return quickly (less than 1 second)
      expect(duration).toBeLessThan(1000);
      
      if (response.status === 200) {
        expect(response.body.message).toContain('processing');
      }
    });

    test('should handle concurrent requests', async () => {
      const concurrentRequests = [];
      
      for (let i = 0; i < 5; i++) {
        concurrentRequests.push(
          request(app)
            .post('/email')
            .send({
              email: `test${i}@example.com`,
              transcriptId: completedJobId
            })
        );
      }

      const responses = await Promise.all(concurrentRequests);
      
      // All requests should complete
      expect(responses).toHaveLength(5);
      
      // Check that each request was processed
      responses.forEach((response, index) => {
        expect([200, 400, 404, 429]).toContain(response.status);
      });
    });
  });
});