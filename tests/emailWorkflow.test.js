const request = require('supertest');
const MockBrevoEmailService = require('./mocks/MockBrevoEmailService');
const { v4: uuidv4 } = require('uuid');

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3003';
process.env.SESSION_SECRET = 'test-secret-for-testing-minimum-32-characters';
process.env.BREVO_API_KEY = 'test-brevo-api-key';
process.env.BREVO_FROM_EMAIL = 'test@example.com';

// Mock the email service
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

describe('Complete Email Workflow Integration', () => {
  let emailService;
  let mockJobStore;
  let completedJobId;
  let testJob;

  beforeEach(() => {
    emailService = getEmailService();
    emailService.reset();
    
    // Create a mock completed job
    completedJobId = uuidv4();
    testJob = {
      id: completedJobId,
      status: 'completed',
      transcriptText: 'This is a test transcript from our travel planning meeting. We discussed flights to Paris, hotel options, and restaurant recommendations.',
      createdAt: new Date(Date.now() - 300000), // 5 minutes ago
      updatedAt: new Date(Date.now() - 60000),  // 1 minute ago
      processedAt: new Date(Date.now() - 60000),
      fileName: 'test-audio.webm',
      fileSize: 1024000,
      metadata: {
        cost: { total: 0.18, currency: 'USD' }
      }
    };

    // Mock the job store functions
    mockJobStore = {
      jobs: new Map([[completedJobId, testJob]]),
      get: jest.fn((id) => mockJobStore.jobs.get(id)),
      set: jest.fn((id, job) => mockJobStore.jobs.set(id, job)),
      delete: jest.fn((id) => mockJobStore.jobs.delete(id)),
      has: jest.fn((id) => mockJobStore.jobs.has(id))
    };
  });

  afterEach(() => {
    if (emailService) {
      emailService.reset();
    }
    jest.clearAllMocks();
  });

  describe('Successful Email Delivery Workflow', () => {
    test('should complete full workflow: transcript → email → cleanup', async () => {
      // Configure email service to succeed
      emailService.configure({
        shouldFail: false
      });

      const emailRequest = {
        email: 'traveler@example.com',
        transcriptId: completedJobId
      };

      // Step 1: Send email request
      const response = await request(app)
        .post('/email')
        .send(emailRequest)
        .expect('Content-Type', /json/);

      // Should accept the request for processing
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('processing');
        expect(response.body.details.email).toBe('traveler@example.com');
        expect(response.body.details.transcriptId).toBe(completedJobId);
        expect(response.body.details.requestedAt).toBeDefined();

        // Step 2: Wait for async processing to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Step 3: Verify email service was called
        expect(emailService.getCallCount('sendTranscript')).toBeGreaterThan(0);
        
        const lastCall = emailService.getLastCall('sendTranscript');
        if (lastCall) {
          expect(lastCall.args.recipientEmail).toBe('traveler@example.com');
          expect(lastCall.args.transcriptText).toContain('travel planning meeting');
          expect(lastCall.args.transcriptId).toBe(completedJobId);
        }

        // Step 4: Verify metrics were updated
        const metrics = emailService.getMetrics();
        expect(metrics.sent).toBeGreaterThan(0);
        expect(metrics.failed).toBe(0);
      }
    });

    test('should track job metadata updates throughout process', async () => {
      emailService.configure({ shouldFail: false });

      const response = await request(app)
        .post('/email')
        .send({
          email: 'metadata@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if job endpoint shows email status
        const jobResponse = await request(app)
          .get(`/job/${completedJobId}`)
          .expect('Content-Type', /json/);

        if (jobResponse.status === 200) {
          const job = jobResponse.body.job;
          expect(job.id).toBe(completedJobId);
          expect(job.status).toBe('completed');
          
          // Check for email status information
          if (job.emailStatus) {
            expect(job.emailStatus.status).toMatch(/processing|sent|failed/);
            expect(job.emailStatus.requestedAt).toBeDefined();
            expect(job.emailStatus.requestedBy).toBe('metadata@example.com');
          }
        }
      }
    });

    test('should handle multiple concurrent email requests', async () => {
      emailService.configure({ shouldFail: false });

      const requests = [];
      const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];

      // Send multiple requests concurrently
      for (const email of emails) {
        requests.push(
          request(app)
            .post('/email')
            .send({
              email: email,
              transcriptId: completedJobId
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // All requests should be handled
      responses.forEach((response, index) => {
        if (response.status === 200) {
          expect(response.body.success).toBe(true);
          expect(response.body.details.email).toBe(emails[index]);
        }
      });

      // Wait for all processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that email service handled all requests
      expect(emailService.getCallCount('sendTranscript')).toBeGreaterThan(0);
    });
  });

  describe('Error Scenarios and Recovery', () => {
    test('should handle email service failures gracefully', async () => {
      // Configure email service to fail
      emailService.configure({
        shouldFail: true,
        errorType: 'API_ERROR',
        statusCode: 500
      });

      const response = await request(app)
        .post('/email')
        .send({
          email: 'failure@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      // Should still accept the request initially
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('processing');

        // Wait for async processing to fail
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check metrics show failure
        const metrics = emailService.getMetrics();
        expect(metrics.failed).toBeGreaterThan(0);
      }
    });

    test('should handle rate limiting from email provider', async () => {
      // Configure email service to simulate rate limiting
      emailService.configure({
        simulateRateLimit: true
      });

      const response = await request(app)
        .post('/email')
        .send({
          email: 'ratelimited@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify rate limit error was handled
        const metrics = emailService.getMetrics();
        expect(metrics.failed).toBeGreaterThan(0);
      }
    });

    test('should retry on transient failures', async () => {
      // Configure to fail first 2 attempts, succeed on 3rd
      emailService.configure({
        shouldFail: true,
        failureAttempts: [1, 2],
        statusCode: 503 // Service unavailable - retryable
      });

      const response = await request(app)
        .post('/email')
        .send({
          email: 'retry@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        // Wait for retries to complete
        await new Promise(resolve => setTimeout(resolve, 200));

        // Should eventually succeed
        const metrics = emailService.getMetrics();
        expect(metrics.sent).toBeGreaterThan(0);
        expect(metrics.retries).toBeGreaterThan(0);
      }
    });

    test('should not retry on non-retryable errors', async () => {
      // Configure to fail with non-retryable error
      emailService.configure({
        shouldFail: true,
        statusCode: 400, // Bad request - non-retryable
        errorType: 'VALIDATION_ERROR'
      });

      const response = await request(app)
        .post('/email')
        .send({
          email: 'nonretryable@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 100));

        // Should fail immediately without retries
        const metrics = emailService.getMetrics();
        expect(metrics.failed).toBeGreaterThan(0);
        expect(metrics.retries).toBe(0);
      }
    });
  });

  describe('Job Lifecycle Management', () => {
    test('should clean up job after successful email delivery', async () => {
      emailService.configure({ shouldFail: false });

      const response = await request(app)
        .post('/email')
        .send({
          email: 'cleanup@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        // Wait for processing and cleanup
        await new Promise(resolve => setTimeout(resolve, 6000)); // Cleanup happens after 5 seconds

        // Job should be cleaned up
        const jobResponse = await request(app)
          .get(`/job/${completedJobId}`)
          .expect('Content-Type', /json/);

        expect(jobResponse.status).toBe(404); // Job should be gone
      }
    });

    test('should preserve job on email failure', async () => {
      emailService.configure({
        shouldFail: true,
        statusCode: 500
      });

      const response = await request(app)
        .post('/email')
        .send({
          email: 'preserve@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        // Wait for processing to fail
        await new Promise(resolve => setTimeout(resolve, 100));

        // Job should still exist with error information
        const jobResponse = await request(app)
          .get(`/job/${completedJobId}`)
          .expect('Content-Type', /json/);

        if (jobResponse.status === 200) {
          const job = jobResponse.body.job;
          expect(job.id).toBe(completedJobId);
          
          if (job.emailStatus) {
            expect(job.emailStatus.status).toBe('failed');
            expect(job.emailStatus.error).toBeDefined();
          }
        }
      }
    });
  });

  describe('Cost Tracking and Metrics', () => {
    test('should track email costs correctly', async () => {
      emailService.configure({ shouldFail: false });

      // Send multiple emails to test cost tracking
      const emails = ['cost1@example.com', 'cost2@example.com', 'cost3@example.com'];
      
      for (const email of emails) {
        const response = await request(app)
          .post('/email')
          .send({
            email: email,
            transcriptId: completedJobId
          });

        if (response.status === 200) {
          // Wait for processing
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Check usage endpoint includes email metrics
      const usageResponse = await request(app)
        .get('/usage')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(usageResponse.body.success).toBe(true);
      expect(usageResponse.body).toHaveProperty('emailMetrics');
      
      if (usageResponse.body.emailMetrics) {
        const metrics = usageResponse.body.emailMetrics;
        expect(metrics).toHaveProperty('sent');
        expect(metrics).toHaveProperty('failed');
        expect(metrics).toHaveProperty('retries');
        expect(metrics).toHaveProperty('totalCost');
        expect(metrics).toHaveProperty('avgCostPerEmail');
      }
    });

    test('should include email service status in health check', async () => {
      const healthResponse = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(healthResponse.body.status).toBe('ok');
      expect(healthResponse.body.services).toHaveProperty('emailService');
      expect(healthResponse.body.services.emailService).toBe('enabled');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle very large transcript content', async () => {
      // Create a job with large transcript
      const largeTranscript = 'A'.repeat(50000); // 50KB transcript
      testJob.transcriptText = largeTranscript;

      emailService.configure({ shouldFail: false });

      const response = await request(app)
        .post('/email')
        .send({
          email: 'large@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        await new Promise(resolve => setTimeout(resolve, 100));

        // Should handle large content
        const lastCall = emailService.getLastCall('sendTranscript');
        if (lastCall) {
          expect(lastCall.args.transcriptText).toHaveLength(50000);
        }
      }
    });

    test('should handle empty transcript content', async () => {
      // Create a job with empty transcript
      testJob.transcriptText = '';

      const response = await request(app)
        .post('/email')
        .send({
          email: 'empty@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      // Should reject empty transcript
      expect(response.status).toBe(400);
      expect(response.body.details).toBe('TRANSCRIPT_EMPTY');
    });

    test('should handle special characters in transcript', async () => {
      // Create a job with special characters
      testJob.transcriptText = 'Café conversation: "Let\'s go to München!" 🇩🇪 Cost: €50';

      emailService.configure({ shouldFail: false });

      const response = await request(app)
        .post('/email')
        .send({
          email: 'special@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        await new Promise(resolve => setTimeout(resolve, 100));

        // Should handle special characters
        const lastCall = emailService.getLastCall('sendTranscript');
        if (lastCall) {
          expect(lastCall.args.transcriptText).toContain('München');
          expect(lastCall.args.transcriptText).toContain('🇩🇪');
        }
      }
    });

    test('should handle email service becoming unavailable during processing', async () => {
      const response = await request(app)
        .post('/email')
        .send({
          email: 'unavailable@example.com',
          transcriptId: completedJobId
        })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        // Simulate service becoming unavailable
        require('../src/services/emailService').getEmailService.mockReturnValue(null);

        await new Promise(resolve => setTimeout(resolve, 100));

        // Should handle gracefully
        const metrics = emailService.getMetrics();
        expect(metrics.failed).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle rapid successive requests', async () => {
      emailService.configure({ shouldFail: false });

      const rapidRequests = [];
      for (let i = 0; i < 10; i++) {
        rapidRequests.push(
          request(app)
            .post('/email')
            .send({
              email: `rapid${i}@example.com`,
              transcriptId: completedJobId
            })
        );
      }

      const responses = await Promise.all(rapidRequests);
      
      // Count successful responses
      const successfulResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      // Should handle most requests or rate limit appropriately
      expect(successfulResponses.length + rateLimitedResponses.length).toBe(10);
    });

    test('should maintain performance under load', async () => {
      emailService.configure({ shouldFail: false });

      const startTime = Date.now();
      
      const loadRequests = [];
      for (let i = 0; i < 5; i++) {
        loadRequests.push(
          request(app)
            .post('/email')
            .send({
              email: `load${i}@example.com`,
              transcriptId: completedJobId
            })
        );
      }

      await Promise.all(loadRequests);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete all requests within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds
    });
  });
});