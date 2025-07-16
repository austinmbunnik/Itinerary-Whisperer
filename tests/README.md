# Email Functionality Test Suite

This comprehensive test suite covers all aspects of the email functionality in the Itinerary-Whisperer application.

## Test Files Overview

### 1. `emailService.test.js` - Unit Tests for Email Service
**30 tests covering:**
- **Initialization**: Service setup and configuration validation
- **Date Formatting**: Email subject date formatting
- **Cost Calculation**: Free tier vs paid tier cost tracking
- **Retry Logic**: Exponential backoff and retry behavior
- **Error Handling**: API failures, rate limits, timeouts
- **Email Delivery**: Successful sending workflow
- **Metrics Collection**: Cost and performance tracking
- **Call Tracking**: Method invocation monitoring
- **Mock Configuration**: Test scenario setup
- **Edge Cases**: Empty content, large content, special characters

### 2. `emailEndpoint.test.js` - Integration Tests for Email Endpoint
**Covers:**
- **Email Validation**: Format validation, required fields, UUID validation
- **Rate Limiting**: 10 emails per hour per IP enforcement
- **Job Status Validation**: Transcript existence, completion status
- **Email Service Integration**: Service availability, error handling
- **Error Handling**: Malformed requests, internal errors
- **Response Format**: Consistent API responses
- **Security**: Input sanitization, XSS prevention
- **Async Processing**: Immediate response handling

### 3. `emailWorkflow.test.js` - Complete Workflow Integration Tests
**Covers:**
- **Full Workflow**: Transcript → email → cleanup cycle
- **Job Metadata Updates**: Status tracking throughout process
- **Concurrent Requests**: Multiple simultaneous email requests
- **Error Scenarios**: Service failures, rate limiting, recovery
- **Retry Logic**: Transient vs permanent failure handling
- **Job Lifecycle**: Cleanup after success, preservation on failure
- **Cost Tracking**: Metrics collection and reporting
- **Edge Cases**: Large content, empty content, special characters
- **Performance**: Load testing and response times

### 4. `mocks/MockBrevoEmailService.js` - Test Mock Implementation
**Features:**
- **Configurable Behavior**: Success/failure scenarios
- **Call Tracking**: Method invocation history
- **Metrics Simulation**: Cost and performance tracking
- **Error Simulation**: Rate limits, timeouts, API failures
- **Retry Logic**: Exponential backoff simulation
- **State Management**: Reset and configuration methods

## Test Coverage Areas

### ✅ Successful Email Delivery Workflow
- Complete transcript → email → job cleanup cycle
- Job metadata updates (processing → sent states)
- Email service method calls and responses
- Metrics collection and cost tracking

### ✅ Email Service Error Scenarios
- API failures with different status codes
- Rate limiting from email provider
- Service unavailable conditions
- Configuration validation failures

### ✅ Retry Logic and Exponential Backoff
- 3 retry attempts with exponential backoff
- Retryable vs non-retryable error handling
- Proper delay calculations (1s, 2s, 4s)
- Failure after max retries

### ✅ Job Metadata Updates
- Email status tracking (processing, sent, failed)
- Request details (IP, email, timestamp)
- Delivery details (messageId, cost, duration)
- Error information on failures

### ✅ Email Validation and Rate Limiting
- Email format validation with normalization
- UUID validation for transcriptId
- Rate limiting (10 emails/hour per IP)
- Proper error messages and HTTP status codes

### ✅ Cost Tracking and Metrics
- Email cost calculation (free tier vs paid)
- Metrics collection (sent, failed, retries)
- Usage endpoint integration
- Performance tracking

### ✅ Brevo API Error Parsing
- Status code interpretation
- Error message extraction
- Retry decision logic
- Detailed error logging

## Running Tests

### All Email Tests
```bash
npm test -- --testPathPattern=email
```

### Individual Test Suites
```bash
npm test tests/emailService.test.js
npm test tests/emailEndpoint.test.js
npm test tests/emailWorkflow.test.js
```

### With Coverage
```bash
npm run test:coverage
```

## Test Data and Scenarios

### Mock Job Data
- Completed transcript with realistic content
- Various job statuses (pending, processing, completed, failed)
- Metadata including costs and timestamps
- Different transcript sizes and character sets

### Mock Email Service Configurations
- Success scenarios with proper responses
- Failure scenarios with different error types
- Rate limiting simulation
- Timeout and network error simulation

### Test Email Addresses
- Valid formats for success testing
- Invalid formats for validation testing
- Special characters and edge cases
- Normalized vs non-normalized addresses

## Key Testing Patterns

### 1. Mock Service Pattern
```javascript
const mockEmailService = {
  sendTranscript: jest.fn(),
  getMetrics: jest.fn(() => ({ sent: 0, failed: 0, retries: 0, totalCost: 0 })),
  validateConfiguration: jest.fn(() => Promise.resolve(true))
};
```

### 2. Error Simulation Pattern
```javascript
emailService.configure({
  shouldFail: true,
  errorType: 'API_ERROR',
  statusCode: 500,
  failureAttempts: [1, 2] // Fail specific attempts
});
```

### 3. Async Testing Pattern
```javascript
if (response.status === 200) {
  // Wait for async processing
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Verify side effects
  expect(emailService.sendTranscript).toHaveBeenCalled();
}
```

## Environment Setup

### Required Environment Variables
```env
NODE_ENV=test
BREVO_API_KEY=test-brevo-api-key
BREVO_FROM_EMAIL=test@example.com
SESSION_SECRET=test-secret-for-testing-minimum-32-characters
```

### Test Isolation
- Each test suite uses different ports (3001, 3002, 3003)
- Mocks are reset between tests
- No shared state between test files

## Expected Test Results

### Unit Tests (emailService.test.js)
- **30 tests** covering all email service methods
- **100% pass rate** with proper mocking
- **< 1 second** execution time

### Integration Tests (emailEndpoint.test.js)
- **Multiple test categories** covering API endpoints
- **Rate limiting verification** 
- **Error handling validation**

### Workflow Tests (emailWorkflow.test.js)
- **End-to-end scenarios** with realistic data
- **Performance testing** under load
- **Edge case handling**

This comprehensive test suite ensures the email functionality is robust, secure, and performs well under various conditions.