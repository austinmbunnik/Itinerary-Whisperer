# Itinerary Whisperer

A voice-to-text meeting recorder web application designed for group travel planning conversations. Record discussions and automatically generate text transcripts to facilitate collaborative trip planning.

## 🎯 Project Overview

Itinerary Whisperer enables users to:
- Record group conversations about travel planning
- Automatically transcribe audio to text using OpenAI Whisper
- Generate structured meeting transcripts
- Email transcripts to participants
- Store transcripts for future reference

The application operates from a single landing page with no authentication required, making it easy for groups to quickly start recording their travel planning sessions.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js 18.0.0 or higher** - [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download Git](https://git-scm.com/)

### Verify Installation

Check your Node.js and npm versions:

```bash
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 8.0.0 or higher
```

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/itinerary-whisperer.git
   cd itinerary-whisperer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration. See the [Environment Setup](#-environment-setup) section below for detailed configuration instructions.

## 🛠️ Development Setup

1. **Start the development server**
   ```bash
   npm run dev
   ```
   This will start the server with nodemon for automatic restarts on file changes.

2. **Open your browser**
   Navigate to `http://localhost:3000` to view the application.

3. **Development workflow**
   - Make changes to files in the `src/` directory
   - The server will automatically restart when you save changes
   - Refresh your browser to see updates

## ✅ Server Testing & Verification

Follow these steps to verify your Express server is working correctly:

### 1. Start the Server

**Production mode:**
```bash
npm start
```

**Development mode (recommended):**
```bash
npm run dev
```

You should see:
```
Server is running on port 3000
```

### 2. Test the Health Endpoint

Open a new terminal and test the health check endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "environment": "development",
  "version": "1.0.0"
}
```

Or visit `http://localhost:3000/health` in your browser.

### 3. Verify Static File Serving

Test that the Express server serves static files from the `public/` directory:

```bash
curl http://localhost:3000/
```

Or open `http://localhost:3000/` in your browser to see the landing page.

### 4. Test Individual Static Files

Verify specific static files are accessible:

```bash
# Test CSS file
curl http://localhost:3000/styles.css

# Test JavaScript file  
curl http://localhost:3000/script.js
```

### 5. Verify CORS Configuration

Test CORS headers (if needed for frontend integration):

```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:3000/health
```

### 6. Test Error Handling

Test the 404 error handling:

```bash
curl http://localhost:3000/nonexistent-route
```

Expected response:
```json
{
  "error": {
    "message": "Route not found",
    "status": 404,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### Troubleshooting

**Port already in use:**
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use a different port
PORT=3001 npm start
```

**Environment variables not loading:**
- Ensure `.env` file exists (copy from `.env.example`)
- Check that `dotenv` is installed: `npm list dotenv`
- Verify environment variables in config: `node -e "console.log(require('./config/environment'))"`

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the production server |
| `npm run dev` | Start the development server with nodemon |
| `npm test` | Run the test suite (to be implemented) |

### Script Details

- **`npm start`**: Runs the application in production mode
- **`npm run dev`**: Runs the application in development mode with automatic restarts
- **`npm test`**: Placeholder for running tests (implementation pending)

## 📁 Project Structure

```
itinerary-whisperer/
├── public/                 # Static frontend files
│   └── index.html         # Frontend placeholder
├── src/                   # Backend source code
│   └── index.js          # Express.js server entry point
├── config/                # Configuration files
│   └── index.js          # Environment-based configuration
├── References/            # Project documentation and prototypes
│   ├── PRD.md            # Product Requirements Document
│   └── Web design/       # React frontend prototype
├── .env                   # Environment variables (create from .env.example)
├── .gitignore            # Git ignore rules
├── package.json          # Project dependencies and scripts
└── README.md             # This file
```

### Key Directories

- **`public/`**: Contains static files served by the Express server
- **`src/`**: Main backend application code (Express.js, API routes, business logic)
- **`config/`**: Configuration files for different environments
- **`References/`**: Documentation and design prototypes

## 🔧 Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **OpenAI Whisper API** - Speech-to-text transcription
- **Firebase Firestore** - Database for transcript storage
- **Brevo (Sendinblue)** - Email service for transcript delivery

### Frontend (Planned Integration)
- **React 18** - Frontend framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## 🔧 Environment Setup

### Environment Variables Overview

The application uses environment variables for configuration management across different deployment environments. All environment variables are validated at startup using `config/environment.js`.

### Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** with your specific configuration values.

3. **Required variables by environment:**

#### Development Environment
```env
NODE_ENV=development
PORT=3000
```

#### Staging Environment
```env
NODE_ENV=staging
PORT=3000
OPENAI_API_KEY=sk-your_openai_api_key_here
BREVO_API_KEY=xkeysib-your_brevo_api_key_here
FIREBASE_PROJECT_ID=your-firebase-project-id
```

#### Production Environment
```env
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=sk-your_openai_api_key_here
BREVO_API_KEY=xkeysib-your_brevo_api_key_here
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_key_here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
SESSION_SECRET=your_secure_session_secret_min_32_characters
```

### Environment Variable Categories

#### 🔒 **Core Security Variables**
- `SESSION_SECRET` - Minimum 32 characters for session encryption
- `HELMET_CSP_ENABLED` - Enable/disable Content Security Policy
- `RATE_LIMIT_MAX_REQUESTS` - Maximum requests per window (default: 100)
- `RATE_LIMIT_WINDOW_MS` - Rate limiting window in milliseconds (default: 15 minutes)

#### 🤖 **OpenAI Whisper API**
- `OPENAI_API_KEY` - Your OpenAI API key (starts with `sk-`)
- `OPENAI_MODEL` - Model to use (default: `whisper-1`)
- `OPENAI_MAX_RETRIES` - Maximum retry attempts (default: 3)
- `OPENAI_TIMEOUT` - Request timeout in milliseconds (default: 60000)

#### 📧 **Email Service (Brevo)**
- `BREVO_API_KEY` - Your Brevo API key (starts with `xkeysib-`)
- `FROM_EMAIL` - Sender email address
- `FROM_NAME` - Sender display name
- `REPLY_TO_EMAIL` - Reply-to email address
- `EMAIL_TEMPLATE_ID` - Email template ID (default: 1)

#### 🔥 **Firebase Firestore**
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Service account private key (include newlines)
- `FIREBASE_CLIENT_EMAIL` - Service account email
- `FIREBASE_DATABASE_URL` - Realtime database URL (optional)

#### 📁 **File Upload Configuration**
- `MAX_FILE_SIZE` - Maximum upload size (default: `50MB`)
- `UPLOAD_DIR` - Upload directory (default: `uploads`)
- `ALLOWED_FILE_TYPES` - Comma-separated MIME types
- `MAX_RECORDING_DURATION` - Max recording time in seconds (default: 3600)

#### 🌐 **URLs and CORS**
- `BASE_URL` - Application base URL
- `FRONTEND_URL` - Frontend application URL
- `CORS_ORIGIN` - Comma-separated allowed origins
- `CORS_CREDENTIALS` - Allow credentials in CORS (default: `true`)

### Environment Validation

The application automatically validates environment variables on startup:

1. **Required Variables**: Missing required variables will cause startup failure
2. **Format Validation**: Invalid formats (e.g., malformed URLs, API keys) trigger warnings or errors
3. **Feature Dependencies**: Production mode requires all core features to be properly configured

### Feature Flags

Features are automatically enabled/disabled based on environment variable presence:

- **Email Service**: Enabled when `BREVO_API_KEY` is set
- **Transcription**: Enabled when `OPENAI_API_KEY` is set  
- **Firestore**: Enabled when Firebase credentials are complete
- **Development Mode**: Additional logging and warnings

### Getting API Keys

#### OpenAI API Key
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Copy the key (starts with `sk-`)

#### Brevo API Key
1. Sign up at [Brevo](https://www.brevo.com/)
2. Go to SMTP & API → API Keys
3. Create a new API key
4. Copy the key (starts with `xkeysib-`)

#### Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Go to Project Settings → Service accounts
4. Generate new private key
5. Download the JSON file and extract the required fields

### Environment-Specific Setup

#### Docker Deployment
```bash
# Build with environment variables
docker build -t itinerary-whisperer .

# Run with environment file
docker run --env-file .env -p 3000:3000 itinerary-whisperer

# Or with individual variables
docker run -e NODE_ENV=production -e PORT=3000 -p 3000:3000 itinerary-whisperer
```

#### Deployment Platforms

**Heroku:**
```bash
heroku config:set NODE_ENV=production
heroku config:set OPENAI_API_KEY=sk-your-key-here
heroku config:set BREVO_API_KEY=xkeysib-your-key-here
```

**Railway/Render:**
Set environment variables in the platform dashboard using the values from your `.env` file.

## 🚀 Heroku Deployment

### Deployment Options

Itinerary Whisperer supports multiple Heroku deployment methods:

1. **Standard Buildpack Deployment** (Recommended for most users)
2. **Docker Container Deployment** (Advanced users)
3. **One-Click Deploy** (Quick testing)

### Option 1: Standard Buildpack Deployment

#### Prerequisites
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- Git repository initialized
- Heroku account created

#### Step-by-Step Deployment

1. **Login to Heroku**
   ```bash
   heroku login
   ```

2. **Create a new Heroku app**
   ```bash
   heroku create your-app-name
   # Replace 'your-app-name' with your desired app name
   ```

3. **Set required environment variables**
   ```bash
   # Required for production
   heroku config:set NODE_ENV=production
   heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
   
   # API Keys (get these from respective services)
   heroku config:set OPENAI_API_KEY=sk-your-openai-key-here
   heroku config:set BREVO_API_KEY=xkeysib-your-brevo-key-here
   
   # Firebase Configuration
   heroku config:set FIREBASE_PROJECT_ID=your-firebase-project-id
   heroku config:set FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
   your_firebase_private_key_here
   -----END PRIVATE KEY-----"
   
   # Email Configuration
   heroku config:set FROM_EMAIL=noreply@your-domain.com
   heroku config:set FROM_NAME="Itinerary Whisperer"
   
   # App URLs
   heroku config:set BASE_URL=https://your-app-name.herokuapp.com
   heroku config:set CORS_ORIGIN=https://your-app-name.herokuapp.com
   ```

4. **Deploy the application**
   ```bash
   git push heroku main
   ```

5. **Verify deployment**
   ```bash
   heroku open /health
   # Should show: {"status":"ok","timestamp":"...","environment":"production","version":"1.0.0"}
   ```

#### Quick Configuration Script

Create a `deploy.sh` script for easier deployment:

```bash
#!/bin/bash
# Save this as deploy.sh and make it executable: chmod +x deploy.sh

APP_NAME="your-app-name"
OPENAI_KEY="sk-your-openai-key-here"
BREVO_KEY="xkeysib-your-brevo-key-here"
FIREBASE_PROJECT="your-firebase-project-id"
FIREBASE_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FROM_EMAIL="noreply@your-domain.com"

echo "🚀 Deploying Itinerary Whisperer to Heroku..."

# Create app
heroku create $APP_NAME

# Set environment variables
heroku config:set \
  NODE_ENV=production \
  SESSION_SECRET=$(openssl rand -base64 32) \
  OPENAI_API_KEY=$OPENAI_KEY \
  BREVO_API_KEY=$BREVO_KEY \
  FIREBASE_PROJECT_ID=$FIREBASE_PROJECT \
  FIREBASE_CLIENT_EMAIL=$FIREBASE_EMAIL \
  FROM_EMAIL=$FROM_EMAIL \
  FROM_NAME="Itinerary Whisperer" \
  BASE_URL=https://$APP_NAME.herokuapp.com \
  CORS_ORIGIN=https://$APP_NAME.herokuapp.com \
  --app $APP_NAME

# Deploy
git push heroku main

# Open health check
heroku open /health --app $APP_NAME

echo "✅ Deployment completed!"
```

### Option 2: Docker Container Deployment

1. **Set the stack to container**
   ```bash
   heroku stack:set container
   ```

2. **Set environment variables** (same as Option 1)

3. **Deploy using Docker**
   ```bash
   git push heroku main
   ```

The `heroku.yml` file will automatically configure Docker deployment.

### Option 3: One-Click Deploy

Click the button below to deploy instantly to Heroku:

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/your-username/itinerary-whisperer)

This will:
- Create a new Heroku app
- Set up basic configuration
- Deploy the application
- Prompt you to configure required environment variables

### Post-Deployment Configuration

#### 1. Add Logging (Recommended)
```bash
heroku addons:create papertrail:choklad
heroku addons:open papertrail
```

#### 2. Configure Custom Domain (Optional)
```bash
heroku domains:add your-domain.com
# Follow Heroku's instructions for DNS configuration
```

#### 3. Set up SSL (Automatic with Heroku)
Heroku automatically provides SSL for `.herokuapp.com` domains and custom domains.

#### 4. Enable Metrics (Optional)
```bash
heroku addons:create heroku-postgresql:mini  # If using database later
heroku addons:create heroku-redis:mini       # If using Redis later
```

### Environment Variables Reference

#### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `SESSION_SECRET` | Session encryption key | Generated automatically |
| `OPENAI_API_KEY` | OpenAI Whisper API key | `sk-...` |
| `BREVO_API_KEY` | Brevo email service key | `xkeysib-...` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `my-project-123` |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account | `firebase-adminsdk-...` |
| `FIREBASE_PRIVATE_KEY` | Firebase private key | `-----BEGIN PRIVATE KEY-----...` |

#### Optional Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `FROM_EMAIL` | `noreply@itinerary-whisperer.com` | Sender email |
| `BASE_URL` | App URL | Application base URL |
| `CORS_ORIGIN` | App URL | Allowed CORS origins |
| `MAX_FILE_SIZE` | `50MB` | Maximum upload size |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Rate limit per window |

### Heroku Management Commands

#### View Logs
```bash
npm run logs:heroku
# or
heroku logs --tail
```

#### Check Application Health
```bash
npm run health:heroku
# or
heroku run npm run health
```

#### Scale Application
```bash
heroku ps:scale web=1        # Scale to 1 dyno
heroku ps:scale web=2        # Scale to 2 dynos (requires paid plan)
```

#### Run Commands
```bash
heroku run npm test          # Run tests
heroku run npm run lint      # Run linting
heroku run node --version    # Check Node.js version
```

#### Database Management (Future)
```bash
heroku run npm run db:migrate    # Run database migrations
heroku run npm run db:seed       # Seed database
```

### Monitoring and Debugging

#### Application Metrics
- View metrics in Heroku dashboard: `heroku dashboard`
- Monitor response times, memory usage, and error rates

#### Error Tracking
- Logs are automatically collected
- Set up error tracking with Sentry (optional):
  ```bash
  heroku config:set SENTRY_DSN=your-sentry-dsn
  ```

#### Performance Monitoring
- Use Heroku's built-in metrics
- Consider adding New Relic for detailed performance insights:
  ```bash
  heroku addons:create newrelic:wayne
  ```

### Troubleshooting

#### Common Issues

**Build Failures:**
```bash
# Check build logs
heroku logs --tail --dyno=build

# Common fixes
heroku config:set NODE_ENV=production
heroku config:set NPM_CONFIG_PRODUCTION=false  # If build tools needed
```

**Application Crashes:**
```bash
# Check application logs
heroku logs --tail

# Restart application
heroku restart

# Check dyno status
heroku ps
```

**Environment Variable Issues:**
```bash
# List all config vars
heroku config

# Check specific variable
heroku config:get OPENAI_API_KEY

# Update variable
heroku config:set OPENAI_API_KEY=new-value
```

**Health Check Failures:**
```bash
# Test health endpoint
curl https://your-app-name.herokuapp.com/health

# Check environment configuration
heroku run npm run health
```

#### Getting Help
- [Heroku Dev Center](https://devcenter.heroku.com/)
- [Heroku Support](https://help.heroku.com/)
- Check application logs: `heroku logs --tail`
- Test locally first: `npm start`

### Cost Optimization

#### Free Tier Limitations
- Heroku Eco dynos sleep after 30 minutes of inactivity
- 550-1000 dyno hours per month (depending on account verification)
- Apps sleep if no requests for 30 minutes

#### Optimization Tips
```bash
# Use Eco dynos for development
heroku ps:scale web=1:eco

# Monitor usage
heroku ps -a your-app-name

# Schedule regular pings to prevent sleeping (if needed)
# Note: Be mindful of free tier limits
```

#### Upgrading to Paid Plans
```bash
# Upgrade to Basic (no sleeping)
heroku ps:scale web=1:basic

# Upgrade to Standard
heroku ps:scale web=1:standard-1x
```

### Continuous Deployment

#### GitHub Integration
1. Connect your GitHub repository in Heroku dashboard
2. Enable automatic deploys from main branch
3. Enable wait for CI to pass before deploy

#### Manual Deployment
```bash
# Deploy specific branch
git push heroku feature-branch:main

# Deploy with force (use carefully)
git push heroku main --force
```

## 📋 Deployment Checklist

### Pre-Deployment Checklist

Before deploying to any environment, ensure the following items are completed:

#### Code Quality
- [ ] All tests pass locally (`npm test`)
- [ ] Code passes linting (`npm run lint`)
- [ ] No uncommitted changes in git repository
- [ ] Branch is up to date with latest changes
- [ ] Security audit passes (`npm audit`)

#### Environment Setup
- [ ] Environment variables configured for target environment
- [ ] API keys obtained and validated
- [ ] Database connections tested (if applicable)
- [ ] External service integrations verified

#### Documentation
- [ ] README.md updated with any new features
- [ ] API documentation current
- [ ] Environment-specific notes documented

#### Security
- [ ] No secrets committed to repository
- [ ] Environment variables properly configured
- [ ] HTTPS enforced for production
- [ ] Security headers configured

### Environment-Specific Deployment

#### Development Environment
```bash
# Set development-specific variables
export NODE_ENV=development
export PORT=3000
export LOG_LEVEL=debug

# Start development server
npm run dev
```

**Development Configuration:**
- Debug logging enabled
- Hot reloading with nodemon
- Mock data for external services (optional)
- Relaxed CORS settings

#### Staging Environment
```bash
# Deploy to staging
./scripts/deploy-staging.sh

# Or manual staging deployment
heroku create itinerary-whisperer-staging
heroku config:set NODE_ENV=staging
heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
git push heroku main
```

**Staging Configuration:**
- Production-like settings
- Real API integrations
- Limited rate limiting
- Detailed logging for debugging

**Required Environment Variables:**
```bash
NODE_ENV=staging
SESSION_SECRET=generated-secret
OPENAI_API_KEY=sk-staging-key
BREVO_API_KEY=xkeysib-staging-key
FIREBASE_PROJECT_ID=staging-project
```

#### Production Environment
```bash
# Deploy to production (requires all services configured)
heroku create itinerary-whisperer-prod
heroku config:set NODE_ENV=production
# ... (set all production environment variables)
git push heroku main
```

**Production Configuration:**
- Strict security settings
- Performance optimizations
- Production API keys
- Error tracking enabled
- Monitoring and alerting

**Required Environment Variables:**
```bash
NODE_ENV=production
SESSION_SECRET=secure-production-secret-min-32-chars
OPENAI_API_KEY=sk-production-key
BREVO_API_KEY=xkeysib-production-key
FIREBASE_PROJECT_ID=production-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@project.iam.gserviceaccount.com
```

### Post-Deployment Checklist

After successful deployment, verify the following:

#### Functional Verification
- [ ] Health endpoint responds correctly (`/health`)
- [ ] Landing page loads properly
- [ ] Error handling works (test 404 routes)
- [ ] CORS headers present
- [ ] Security headers configured

#### Performance Verification
- [ ] Response times acceptable (< 2s for health check)
- [ ] Application handles concurrent requests
- [ ] Memory usage within limits
- [ ] No memory leaks detected

#### Monitoring Setup
- [ ] Logging service configured (Papertrail, etc.)
- [ ] Error tracking enabled (optional)
- [ ] Performance monitoring active
- [ ] Health check monitoring enabled

## 🔍 Health Check & Verification

### Automated Verification Script

Use the provided verification script to test deployments:

```bash
# Verify staging deployment
./scripts/verify-deployment.sh https://your-app-staging.herokuapp.com staging

# Verify production deployment
./scripts/verify-deployment.sh https://your-app.herokuapp.com production

# Verify local development
./scripts/verify-deployment.sh http://localhost:3000 development
```

### Manual Health Check Steps

#### 1. Basic Connectivity Test
```bash
# Test health endpoint
curl https://your-app.herokuapp.com/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2024-01-01T12:00:00.000Z",
#   "environment": "production",
#   "version": "1.0.0"
# }
```

#### 2. Static File Serving Test
```bash
# Test landing page
curl -I https://your-app.herokuapp.com/

# Should return HTTP 200 with HTML content-type
```

#### 3. Error Handling Test
```bash
# Test 404 handling
curl https://your-app.herokuapp.com/nonexistent

# Expected response:
# {
#   "error": {
#     "message": "Route not found",
#     "status": 404,
#     "timestamp": "2024-01-01T12:00:00.000Z"
#   }
# }
```

#### 4. Security Headers Test
```bash
# Check security headers
curl -I https://your-app.herokuapp.com/health

# Should include headers like:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-DNS-Prefetch-Control: off
```

#### 5. Performance Test
```bash
# Test response time
time curl -s https://your-app.herokuapp.com/health > /dev/null

# Should complete in < 2 seconds
```

### Health Check Monitoring

#### Set Up Automated Monitoring
```bash
# Using Heroku's built-in monitoring
heroku labs:enable "metrics-beta"

# Set up external monitoring (optional)
# Examples: UptimeRobot, Pingdom, or New Relic
```

#### Custom Health Check Script
Create a monitoring script that runs periodically:

```bash
#!/bin/bash
# health-monitor.sh

APP_URL="https://your-app.herokuapp.com"
WEBHOOK_URL="your-slack-webhook-url"  # Optional

check_health() {
    response=$(curl -s -w "%{http_code}" "$APP_URL/health" -o /tmp/health.json)
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Health check passed"
        return 0
    else
        echo "❌ Health check failed (HTTP $http_code)"
        
        # Optional: Send notification
        if [ -n "$WEBHOOK_URL" ]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"🚨 Health check failed for $APP_URL\"}" \
                "$WEBHOOK_URL"
        fi
        return 1
    fi
}

check_health
```

## 📊 Monitoring & Observability

### Basic Monitoring Setup

#### 1. Application Logs
```bash
# View real-time logs
heroku logs --tail --app your-app-name

# View specific log lines
heroku logs --num 100 --app your-app-name

# Search logs
heroku logs --app your-app-name | grep ERROR
```

#### 2. Add Papertrail for Log Management
```bash
# Add Papertrail addon
heroku addons:create papertrail:choklad --app your-app-name

# View logs in Papertrail
heroku addons:open papertrail --app your-app-name
```

#### 3. Set Up Log Alerts
Configure alerts in Papertrail for:
- Error messages
- High response times
- Application crashes
- Memory warnings

### Performance Monitoring

#### 1. Heroku Metrics
```bash
# View metrics dashboard
heroku dashboard

# Monitor dyno usage
heroku ps --app your-app-name

# Check dyno metrics
heroku logs --ps dyno --app your-app-name
```

#### 2. Application Performance Monitoring (APM)
Add New Relic for detailed performance insights:

```bash
# Add New Relic addon
heroku addons:create newrelic:wayne --app your-app-name

# Configure New Relic
heroku config:get NEW_RELIC_LICENSE_KEY --app your-app-name
```

#### 3. Custom Metrics
Add custom metrics to your application:

```javascript
// In your Express app
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});
```

### Error Tracking

#### 1. Add Sentry for Error Tracking
```bash
# Set up Sentry
npm install @sentry/node

# Configure environment variable
heroku config:set SENTRY_DSN=your-sentry-dsn --app your-app-name
```

#### 2. Application Error Handling
```javascript
// In config/environment.js
sentry: {
  dsn: process.env.SENTRY_DSN,
  environment: NODE_ENV
}

// In src/server.js
const Sentry = require('@sentry/node');

if (config.sentry.dsn) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment
  });
}
```

### Alerting Setup

#### 1. Heroku Alerts
Set up alerts for:
- Application errors
- High response times
- Memory usage
- Dyno restarts

#### 2. External Uptime Monitoring
Configure external monitoring services:
- **UptimeRobot**: Free uptime monitoring
- **Pingdom**: Advanced monitoring with multiple locations
- **StatusCake**: Website monitoring and alerts

#### 3. Slack/Email Notifications
Set up notifications for critical events:

```bash
# Example webhook notification
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚨 Application alert: High error rate detected"}' \
  $SLACK_WEBHOOK_URL
```

### Monitoring Dashboard

Create a simple monitoring dashboard:

```html
<!-- monitoring-dashboard.html -->
<div class="monitoring-dashboard">
  <div class="metric">
    <h3>Health Status</h3>
    <div id="health-status">Checking...</div>
  </div>
  
  <div class="metric">
    <h3>Response Time</h3>
    <div id="response-time">Measuring...</div>
  </div>
  
  <div class="metric">
    <h3>Last Updated</h3>
    <div id="last-updated">-</div>
  </div>
</div>

<script>
async function checkHealth() {
  const start = Date.now();
  try {
    const response = await fetch('/health');
    const duration = Date.now() - start;
    
    document.getElementById('health-status').textContent = 
      response.ok ? '✅ Healthy' : '❌ Unhealthy';
    document.getElementById('response-time').textContent = `${duration}ms`;
    document.getElementById('last-updated').textContent = new Date().toLocaleTimeString();
  } catch (error) {
    document.getElementById('health-status').textContent = '❌ Error';
  }
}

// Check every 30 seconds
setInterval(checkHealth, 30000);
checkHealth();
</script>
```

## 🚨 Troubleshooting Deployment Issues

### Common Deployment Problems

#### 1. Build Failures

**Symptom**: Deployment fails during build phase
```bash
# Check build logs
heroku logs --tail --dyno=build --app your-app-name

# Common error messages:
# - "Module not found"
# - "npm install failed"
# - "Build step failed"
```

**Solutions**:
```bash
# Clear npm cache
heroku repo:purge_cache --app your-app-name

# Ensure all dependencies are in package.json
npm install --save missing-package

# Check Node.js version compatibility
heroku config:set NODE_ENV=production --app your-app-name
heroku config:set NPM_CONFIG_PRODUCTION=false --app your-app-name  # If dev dependencies needed for build
```

**Prevention**:
- Test builds locally with `npm ci`
- Ensure `package.json` and `package-lock.json` are committed
- Verify Node.js version in `engines` field

#### 2. Application Crashes

**Symptom**: App starts but immediately crashes
```bash
# Check crash logs
heroku logs --tail --app your-app-name

# Common errors:
# - "Cannot find module"
# - "Port binding failed"
# - "Environment variable missing"
```

**Solutions**:
```bash
# Check dyno status
heroku ps --app your-app-name

# Restart application
heroku restart --app your-app-name

# Check environment variables
heroku config --app your-app-name

# Scale dyno if needed
heroku ps:scale web=1 --app your-app-name
```

**Common fixes**:
```bash
# Fix port binding (Heroku provides PORT automatically)
heroku config:unset PORT --app your-app-name

# Set missing environment variables
heroku config:set NODE_ENV=production --app your-app-name
heroku config:set SESSION_SECRET=$(openssl rand -base64 32) --app your-app-name
```

#### 3. Environment Variable Issues

**Symptom**: Application starts but features don't work
```bash
# Symptoms:
# - Health check shows features disabled
# - API calls fail
# - Database connections fail
```

**Diagnosis**:
```bash
# Check current config
heroku config --app your-app-name

# Test environment validation
heroku run npm run health --app your-app-name

# Check application logs for environment errors
heroku logs --tail --app your-app-name | grep -i "environment\|config\|missing"
```

**Solutions**:
```bash
# Set missing required variables for production
heroku config:set OPENAI_API_KEY=sk-your-key-here --app your-app-name
heroku config:set BREVO_API_KEY=xkeysib-your-key-here --app your-app-name
heroku config:set FIREBASE_PROJECT_ID=your-project-id --app your-app-name

# Set Firebase private key (handle newlines properly)
heroku config:set FIREBASE_PRIVATE_KEY="$(cat your-firebase-key.json | jq -r .private_key)" --app your-app-name

# Verify configuration
heroku run node -e "console.log(require('./config/environment').features)" --app your-app-name
```

### Debugging Techniques

#### 1. Enable Debug Logging
```bash
# Temporarily enable debug logging
heroku config:set LOG_LEVEL=debug --app your-app-name
heroku restart --app your-app-name

# Monitor logs
heroku logs --tail --app your-app-name

# Remember to reset log level
heroku config:set LOG_LEVEL=info --app your-app-name
```

#### 2. Use One-Off Dynos for Testing
```bash
# Run commands in production environment
heroku run bash --app your-app-name

# Test specific functionality
heroku run npm test --app your-app-name
heroku run node -e "console.log(process.env.NODE_ENV)" --app your-app-name
```

### Emergency Procedures

#### 1. Rollback to Previous Version
```bash
# View releases
heroku releases --app your-app-name

# Rollback to previous release
heroku rollback v123 --app your-app-name

# Verify rollback
curl https://your-app-name.herokuapp.com/health
```

#### 2. Quick Health Diagnostics
```bash
# Run comprehensive diagnostics
curl -s https://your-app-name.herokuapp.com/health | jq .
heroku ps --app your-app-name
heroku logs --num 50 --app your-app-name
```

### Environment Variable Troubleshooting

**Startup fails with "Missing required environment variables":**
- Check that all required variables for your environment are set
- Verify `.env` file is in the project root  
- Ensure no trailing spaces in variable names

**Features not working:**
- Check the startup logs for feature status (✅ enabled, ❌ disabled)
- Verify API keys are valid and have proper permissions
- Test individual services using the health endpoint

**Firebase connection issues:**
- Ensure private key includes proper newline characters
- Verify service account has Firestore permissions
- Check project ID matches your Firebase project

#### Validation Commands

```bash
# Check environment validation
node -e "console.log(require('./config/environment').features)"

# Test specific service configurations  
node -e "const env = require('./config/environment'); console.log('OpenAI configured:', env.features.transcriptionEnabled)"
```

## 🌟 Getting Started for New Developers

1. **Read the documentation**
   - Review the [Product Requirements Document](References/PRD.md)
   - Explore the [frontend prototype](References/Web%20design/)

2. **Set up your development environment**
   - Follow the installation and setup steps above
   - Configure environment variables (see [Environment Setup](#-environment-setup))
   - Ensure all prerequisites are installed

3. **Start with small changes**
   - Make a simple change to `src/server.js`
   - Test that the development server restarts automatically
   - Verify your changes appear in the browser

4. **Explore the codebase**
   - Start with `src/server.js` to understand the server setup
   - Review `config/environment.js` to understand configuration structure
   - Look at the existing frontend prototype in `References/Web design/`

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test your changes locally
4. Submit a pull request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Need Help?

- Check the [CLAUDE.md](CLAUDE.md) file for detailed development guidance
- Review existing issues in the GitHub repository
- Create a new issue if you encounter problems

---

**Happy coding! 🚀**
