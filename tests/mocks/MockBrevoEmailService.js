const { EmailServiceError } = require('../../src/services/emailService');

class MockBrevoEmailService {
  constructor() {
    this.apiKey = 'test-api-key';
    this.fromEmail = 'test@example.com';
    this.fromName = 'Test Service';
    this.maxRetries = 3;
    this.baseDelay = 10; // Reduced delay for testing
    
    // Mock state tracking
    this.metrics = {
      sent: 0,
      failed: 0,
      retries: 0,
      totalCost: 0
    };
    
    // Test configuration
    this.testConfig = {
      shouldFail: false,
      failureAttempts: [], // Array of attempt numbers that should fail
      errorType: 'API_ERROR',
      statusCode: 500,
      apiResponse: null,
      simulateRateLimit: false,
      simulateTimeout: false
    };
    
    // Call tracking
    this.callHistory = [];
    this.validateConfigurationCalls = 0;
    this.sendTranscriptCalls = 0;
  }

  /**
   * Reset mock state for each test
   */
  reset() {
    this.metrics = {
      sent: 0,
      failed: 0,
      retries: 0,
      totalCost: 0
    };
    
    this.testConfig = {
      shouldFail: false,
      failureAttempts: [],
      errorType: 'API_ERROR',
      statusCode: 500,
      apiResponse: null,
      simulateRateLimit: false,
      simulateTimeout: false
    };
    
    this.callHistory = [];
    this.validateConfigurationCalls = 0;
    this.sendTranscriptCalls = 0;
  }

  /**
   * Configure mock behavior for testing
   */
  configure(config) {
    Object.assign(this.testConfig, config);
  }

  /**
   * Mock format date method
   */
  formatDate(date = new Date()) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Mock calculate cost method
   */
  calculateCost() {
    const dailyFreeLimit = 300;
    const costPerEmail = 0.00022;
    return this.metrics.sent > dailyFreeLimit ? costPerEmail : 0;
  }

  /**
   * Mock retry delay calculation
   */
  getRetryDelay(attempt) {
    return this.baseDelay * Math.pow(2, attempt - 1);
  }

  /**
   * Mock send transcript method with configurable failure scenarios
   */
  async sendTranscript(recipientEmail, transcriptText, transcriptId) {
    this.sendTranscriptCalls++;
    
    const callData = {
      method: 'sendTranscript',
      args: { recipientEmail, transcriptText, transcriptId },
      timestamp: new Date()
    };
    
    this.callHistory.push(callData);
    
    // Simulate timeout if configured
    if (this.testConfig.simulateTimeout) {
      await new Promise(resolve => setTimeout(resolve, 50));
      throw new EmailServiceError(
        'Request timeout',
        'TIMEOUT_ERROR',
        408
      );
    }
    
    // Simulate rate limiting if configured
    if (this.testConfig.simulateRateLimit) {
      throw new EmailServiceError(
        'Rate limit exceeded',
        'RATE_LIMIT_ERROR',
        429,
        { retryAfter: 60 }
      );
    }
    
    let lastError = null;
    
    // Simulate retry logic
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Check if this attempt should fail
        const shouldFailThisAttempt = this.testConfig.shouldFail && 
          (this.testConfig.failureAttempts.length === 0 || 
           this.testConfig.failureAttempts.includes(attempt));
        
        if (shouldFailThisAttempt) {
          const error = new Error(`Mock API error on attempt ${attempt}`);
          error.status = this.testConfig.statusCode;
          error.response = {
            body: {
              message: `Mock ${this.testConfig.errorType} error`,
              code: this.testConfig.errorType
            }
          };
          throw error;
        }
        
        // Simulate successful send
        const cost = this.calculateCost();
        this.metrics.sent++;
        this.metrics.totalCost += cost;
        
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        return {
          success: true,
          messageId: messageId,
          recipient: recipientEmail,
          sentAt: new Date(),
          cost: cost,
          duration: 100 + Math.random() * 200, // Mock duration
          attempt: attempt,
          provider: 'brevo'
        };
        
      } catch (error) {
        lastError = error;
        this.metrics.retries++;
        
        // Check if error is retryable
        const statusCode = error.status || error.statusCode || 500;
        const isRetryable = statusCode >= 500 || statusCode === 429 || statusCode === 408;
        
        if (attempt < this.maxRetries && isRetryable) {
          const delay = this.getRetryDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else if (!isRetryable) {
          // Don't increment retries for non-retryable errors
          this.metrics.retries--;
          break;
        }
      }
    }
    
    // All retries failed
    this.metrics.failed++;
    
    throw new EmailServiceError(
      `Failed to send email after ${this.maxRetries} attempts: ${lastError.message}`,
      'EMAIL_SEND_FAILED',
      lastError.status || lastError.statusCode || 500,
      {
        recipient: recipientEmail,
        transcriptId,
        attempts: this.maxRetries,
        lastError: lastError.message
      }
    );
  }

  /**
   * Mock get metrics method
   */
  getMetrics() {
    return {
      ...this.metrics,
      avgCostPerEmail: this.metrics.sent > 0 ? this.metrics.totalCost / this.metrics.sent : 0
    };
  }

  /**
   * Mock validate configuration method
   */
  async validateConfiguration() {
    this.validateConfigurationCalls++;
    
    this.callHistory.push({
      method: 'validateConfiguration',
      args: {},
      timestamp: new Date()
    });
    
    if (this.testConfig.shouldFail && this.testConfig.errorType === 'CONFIG_ERROR') {
      throw new Error('Mock configuration validation failed');
    }
    
    return true;
  }

  /**
   * Get call history for test assertions
   */
  getCallHistory() {
    return this.callHistory;
  }

  /**
   * Get specific call count
   */
  getCallCount(method) {
    return this.callHistory.filter(call => call.method === method).length;
  }

  /**
   * Get last call for a specific method
   */
  getLastCall(method) {
    const calls = this.callHistory.filter(call => call.method === method);
    return calls.length > 0 ? calls[calls.length - 1] : null;
  }
}

module.exports = MockBrevoEmailService;