const MockBrevoEmailService = require('./mocks/MockBrevoEmailService');
const { EmailServiceError } = require('../src/services/emailService');

describe('Email Service', () => {
  let emailService;
  
  beforeEach(() => {
    emailService = new MockBrevoEmailService();
  });

  afterEach(() => {
    emailService.reset();
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(emailService.apiKey).toBe('test-api-key');
      expect(emailService.fromEmail).toBe('test@example.com');
      expect(emailService.fromName).toBe('Test Service');
      expect(emailService.maxRetries).toBe(3);
    });

    test('should start with zero metrics', () => {
      const metrics = emailService.getMetrics();
      expect(metrics.sent).toBe(0);
      expect(metrics.failed).toBe(0);
      expect(metrics.retries).toBe(0);
      expect(metrics.totalCost).toBe(0);
      expect(metrics.avgCostPerEmail).toBe(0);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate configuration successfully', async () => {
      const result = await emailService.validateConfiguration();
      expect(result).toBe(true);
      expect(emailService.validateConfigurationCalls).toBe(1);
    });

    test('should fail configuration validation when configured', async () => {
      emailService.configure({
        shouldFail: true,
        errorType: 'CONFIG_ERROR'
      });

      await expect(emailService.validateConfiguration())
        .rejects
        .toThrow('Mock configuration validation failed');
    });

    test('should track validation calls', async () => {
      await emailService.validateConfiguration();
      await emailService.validateConfiguration();
      
      expect(emailService.getCallCount('validateConfiguration')).toBe(2);
    });
  });

  describe('Date Formatting', () => {
    test('should format date correctly', () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      const formatted = emailService.formatDate(testDate);
      
      expect(formatted).toMatch(/January 15, 2024/);
      expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Match time format
    });

    test('should use current date when no date provided', () => {
      const formatted = emailService.formatDate();
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('Cost Calculation', () => {
    test('should calculate zero cost for free tier', () => {
      emailService.metrics.sent = 100;
      const cost = emailService.calculateCost();
      expect(cost).toBe(0);
    });

    test('should calculate cost for paid tier', () => {
      emailService.metrics.sent = 350;
      const cost = emailService.calculateCost();
      expect(cost).toBe(0.00022);
    });
  });

  describe('Retry Logic', () => {
    test('should calculate exponential backoff delays', () => {
      expect(emailService.getRetryDelay(1)).toBe(10);
      expect(emailService.getRetryDelay(2)).toBe(20);
      expect(emailService.getRetryDelay(3)).toBe(40);
    });

    test('should retry on retryable errors', async () => {
      emailService.configure({
        shouldFail: true,
        failureAttempts: [1, 2], // Fail first two attempts
        statusCode: 500
      });

      const result = await emailService.sendTranscript(
        'test@example.com',
        'Test transcript',
        'test-id'
      );

      expect(result.success).toBe(true);
      expect(result.attempt).toBe(3);
      expect(emailService.metrics.retries).toBe(2);
    });

    test('should not retry on non-retryable errors', async () => {
      emailService.configure({
        shouldFail: true,
        statusCode: 400, // Non-retryable
        errorType: 'VALIDATION_ERROR'
      });

      await expect(emailService.sendTranscript(
        'test@example.com',
        'Test transcript',
        'test-id'
      )).rejects.toThrow(EmailServiceError);

      expect(emailService.metrics.retries).toBe(0);
      expect(emailService.metrics.failed).toBe(1);
    });

    test('should fail after max retries', async () => {
      emailService.configure({
        shouldFail: true,
        statusCode: 500 // Retryable error
      });

      await expect(emailService.sendTranscript(
        'test@example.com',
        'Test transcript',
        'test-id'
      )).rejects.toThrow(EmailServiceError);

      expect(emailService.metrics.retries).toBe(3);
      expect(emailService.metrics.failed).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle rate limit errors', async () => {
      emailService.configure({
        simulateRateLimit: true
      });

      await expect(emailService.sendTranscript(
        'test@example.com',
        'Test transcript',
        'test-id'
      )).rejects.toThrow('Rate limit exceeded');

      const lastCall = emailService.getLastCall('sendTranscript');
      expect(lastCall.args.recipientEmail).toBe('test@example.com');
    });

    test('should handle timeout errors', async () => {
      emailService.configure({
        simulateTimeout: true
      });

      await expect(emailService.sendTranscript(
        'test@example.com',
        'Test transcript',
        'test-id'
      )).rejects.toThrow('Request timeout');
    });

    test('should create proper EmailServiceError', async () => {
      emailService.configure({
        shouldFail: true,
        errorType: 'API_ERROR',
        statusCode: 500
      });

      try {
        await emailService.sendTranscript(
          'test@example.com',
          'Test transcript',
          'test-id'
        );
      } catch (error) {
        expect(error).toBeInstanceOf(EmailServiceError);
        expect(error.code).toBe('EMAIL_SEND_FAILED');
        expect(error.statusCode).toBe(500);
        expect(error.details).toHaveProperty('recipient', 'test@example.com');
        expect(error.details).toHaveProperty('transcriptId', 'test-id');
      }
    });
  });

  describe('Successful Email Delivery', () => {
    test('should send email successfully', async () => {
      const result = await emailService.sendTranscript(
        'recipient@example.com',
        'This is a test transcript content',
        'transcript-123'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeTruthy();
      expect(result.recipient).toBe('recipient@example.com');
      expect(result.sentAt).toBeInstanceOf(Date);
      expect(result.cost).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.attempt).toBe(1);
      expect(result.provider).toBe('brevo');
    });

    test('should update metrics on successful send', async () => {
      await emailService.sendTranscript(
        'test@example.com',
        'Test transcript',
        'test-id'
      );

      const metrics = emailService.getMetrics();
      expect(metrics.sent).toBe(1);
      expect(metrics.failed).toBe(0);
      expect(metrics.retries).toBe(0);
      expect(metrics.totalCost).toBeGreaterThanOrEqual(0);
    });

    test('should track multiple successful sends', async () => {
      await emailService.sendTranscript('user1@example.com', 'Transcript 1', 'id1');
      await emailService.sendTranscript('user2@example.com', 'Transcript 2', 'id2');

      const metrics = emailService.getMetrics();
      expect(metrics.sent).toBe(2);
      expect(emailService.getCallCount('sendTranscript')).toBe(2);
    });
  });

  describe('Metrics Collection', () => {
    test('should track email metrics correctly', async () => {
      // Send successful email
      await emailService.sendTranscript('success@example.com', 'Test', 'id1');

      // Fail an email
      emailService.configure({ shouldFail: true, statusCode: 500 });
      try {
        await emailService.sendTranscript('fail@example.com', 'Test', 'id2');
      } catch (error) {
        // Expected to fail
      }

      const metrics = emailService.getMetrics();
      expect(metrics.sent).toBe(1);
      expect(metrics.failed).toBe(1);
      expect(metrics.retries).toBe(3); // Failed after 3 retries
      expect(metrics.avgCostPerEmail).toBe(0); // Free tier
    });

    test('should calculate average cost per email', async () => {
      emailService.metrics.sent = 500; // Exceed free tier
      emailService.metrics.totalCost = 0.044; // 200 paid emails at $0.00022 each

      const metrics = emailService.getMetrics();
      expect(metrics.avgCostPerEmail).toBeCloseTo(0.000088, 6);
    });
  });

  describe('Call Tracking', () => {
    test('should track call history', async () => {
      await emailService.sendTranscript('test@example.com', 'Test transcript', 'test-id');
      await emailService.validateConfiguration();

      const history = emailService.getCallHistory();
      expect(history).toHaveLength(2);
      expect(history[0].method).toBe('sendTranscript');
      expect(history[1].method).toBe('validateConfiguration');
    });

    test('should track call arguments', async () => {
      await emailService.sendTranscript('test@example.com', 'Test transcript', 'test-id');

      const lastCall = emailService.getLastCall('sendTranscript');
      expect(lastCall.args.recipientEmail).toBe('test@example.com');
      expect(lastCall.args.transcriptText).toBe('Test transcript');
      expect(lastCall.args.transcriptId).toBe('test-id');
    });

    test('should provide call counts', async () => {
      await emailService.sendTranscript('test1@example.com', 'Test 1', 'id1');
      await emailService.sendTranscript('test2@example.com', 'Test 2', 'id2');
      await emailService.validateConfiguration();

      expect(emailService.getCallCount('sendTranscript')).toBe(2);
      expect(emailService.getCallCount('validateConfiguration')).toBe(1);
      expect(emailService.getCallCount('nonexistent')).toBe(0);
    });
  });

  describe('Mock Configuration', () => {
    test('should configure failure scenarios', () => {
      emailService.configure({
        shouldFail: true,
        errorType: 'CUSTOM_ERROR',
        statusCode: 503
      });

      expect(emailService.testConfig.shouldFail).toBe(true);
      expect(emailService.testConfig.errorType).toBe('CUSTOM_ERROR');
      expect(emailService.testConfig.statusCode).toBe(503);
    });

    test('should configure specific failure attempts', () => {
      emailService.configure({
        shouldFail: true,
        failureAttempts: [1, 3]
      });

      expect(emailService.testConfig.failureAttempts).toEqual([1, 3]);
    });

    test('should reset configuration', () => {
      emailService.configure({
        shouldFail: true,
        errorType: 'TEST_ERROR'
      });

      emailService.reset();

      expect(emailService.testConfig.shouldFail).toBe(false);
      expect(emailService.testConfig.errorType).toBe('API_ERROR');
      expect(emailService.metrics.sent).toBe(0);
      expect(emailService.callHistory).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty transcript text', async () => {
      const result = await emailService.sendTranscript(
        'test@example.com',
        '', // Empty transcript
        'test-id'
      );

      expect(result.success).toBe(true);
      expect(result.recipient).toBe('test@example.com');
    });

    test('should handle very long transcript text', async () => {
      const longTranscript = 'A'.repeat(100000); // 100KB transcript
      
      const result = await emailService.sendTranscript(
        'test@example.com',
        longTranscript,
        'test-id'
      );

      expect(result.success).toBe(true);
      expect(result.recipient).toBe('test@example.com');
    });

    test('should handle special characters in email', async () => {
      const result = await emailService.sendTranscript(
        'test+special@example.com',
        'Transcript with special chars: äöü',
        'test-id'
      );

      expect(result.success).toBe(true);
      expect(result.recipient).toBe('test+special@example.com');
    });
  });
});