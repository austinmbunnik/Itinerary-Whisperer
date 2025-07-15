#!/bin/bash

# =================================================================
# Itinerary Whisperer - Staging Deployment Script
# =================================================================
# This script deploys the application to staging environment and
# verifies successful deployment
# =================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="${HEROKU_STAGING_APP:-itinerary-whisperer-staging}"
BRANCH="${DEPLOY_BRANCH:-main}"
TIMEOUT=300  # 5 minutes timeout for health checks
HEALTH_ENDPOINT="/health"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for deployment
wait_for_deployment() {
    local app_name=$1
    local timeout=$2
    local start_time=$(date +%s)
    
    print_status "Waiting for deployment to complete..."
    
    while true; do
        current_time=$(date +%s)
        elapsed=$((current_time - start_time))
        
        if [ $elapsed -gt $timeout ]; then
            print_error "Deployment timeout after ${timeout} seconds"
            return 1
        fi
        
        if heroku ps:scale --app "$app_name" | grep -q "web.*up"; then
            print_success "Deployment completed successfully"
            return 0
        fi
        
        echo -n "."
        sleep 5
    done
}

# Function to verify health endpoint
verify_health() {
    local app_url=$1
    local endpoint=$2
    local max_attempts=12
    local attempt=1
    
    print_status "Verifying health endpoint: ${app_url}${endpoint}"
    
    while [ $attempt -le $max_attempts ]; do
        print_status "Health check attempt $attempt/$max_attempts"
        
        if response=$(curl -s -w "%{http_code}" "${app_url}${endpoint}" -o /tmp/health_response.json 2>/dev/null); then
            http_code="${response: -3}"
            
            if [ "$http_code" = "200" ]; then
                print_success "Health check passed!"
                
                # Parse and display health information
                if command_exists jq; then
                    print_status "Health check response:"
                    jq '.' /tmp/health_response.json | sed 's/^/  /'
                else
                    print_status "Health check response:"
                    cat /tmp/health_response.json | sed 's/^/  /'
                fi
                
                rm -f /tmp/health_response.json
                return 0
            else
                print_warning "Health check returned HTTP $http_code"
            fi
        else
            print_warning "Health check request failed"
        fi
        
        attempt=$((attempt + 1))
        if [ $attempt -le $max_attempts ]; then
            sleep 10
        fi
    done
    
    print_error "Health check failed after $max_attempts attempts"
    rm -f /tmp/health_response.json
    return 1
}

# Function to run deployment verification tests
run_verification_tests() {
    local app_url=$1
    
    print_status "Running deployment verification tests..."
    
    # Test 1: Health endpoint
    print_status "Test 1: Health endpoint accessibility"
    if verify_health "$app_url" "$HEALTH_ENDPOINT"; then
        print_success "✓ Health endpoint test passed"
    else
        print_error "✗ Health endpoint test failed"
        return 1
    fi
    
    # Test 2: Static file serving
    print_status "Test 2: Static file serving"
    if curl -s -f "${app_url}/" -o /dev/null; then
        print_success "✓ Static file serving test passed"
    else
        print_warning "✗ Static file serving test failed (this may be expected if no index.html exists)"
    fi
    
    # Test 3: CORS headers
    print_status "Test 3: CORS configuration"
    cors_headers=$(curl -s -I -H "Origin: ${app_url}" "${app_url}${HEALTH_ENDPOINT}" | grep -i "access-control" || true)
    if [ -n "$cors_headers" ]; then
        print_success "✓ CORS headers present"
        echo "$cors_headers" | sed 's/^/    /'
    else
        print_warning "✗ CORS headers not found (this may be intentional)"
    fi
    
    # Test 4: Error handling
    print_status "Test 4: Error handling (404 test)"
    response=$(curl -s -w "%{http_code}" "${app_url}/nonexistent-endpoint" -o /tmp/error_response.json)
    http_code="${response: -3}"
    
    if [ "$http_code" = "404" ]; then
        print_success "✓ 404 error handling test passed"
        if command_exists jq && jq -e '.error.message' /tmp/error_response.json >/dev/null 2>&1; then
            print_status "Error response format is correct"
        fi
    else
        print_warning "✗ 404 error handling test failed (got HTTP $http_code)"
    fi
    rm -f /tmp/error_response.json
    
    # Test 5: Security headers
    print_status "Test 5: Security headers"
    security_headers=$(curl -s -I "${app_url}${HEALTH_ENDPOINT}" | grep -E "(X-.*|Strict-Transport|Content-Security)" || true)
    if [ -n "$security_headers" ]; then
        print_success "✓ Security headers present"
        echo "$security_headers" | sed 's/^/    /'
    else
        print_warning "✗ Security headers not found"
    fi
    
    print_success "Verification tests completed"
}

# Function to display deployment summary
show_deployment_summary() {
    local app_name=$1
    local app_url=$2
    
    echo
    echo "==================================================================="
    echo "                    DEPLOYMENT SUMMARY"
    echo "==================================================================="
    echo "App Name:     $app_name"
    echo "Environment:  staging"
    echo "URL:          $app_url"
    echo "Health Check: ${app_url}${HEALTH_ENDPOINT}"
    echo "Branch:       $BRANCH"
    echo "Timestamp:    $(date)"
    echo "==================================================================="
    echo
    echo "Useful commands:"
    echo "  View logs:     heroku logs --tail --app $app_name"
    echo "  Scale app:     heroku ps:scale web=1 --app $app_name"
    echo "  Run tests:     heroku run npm test --app $app_name"
    echo "  Health check:  curl ${app_url}${HEALTH_ENDPOINT}"
    echo "==================================================================="
}

# Main deployment function
main() {
    echo "==================================================================="
    echo "    Itinerary Whisperer - Staging Deployment Script"
    echo "==================================================================="
    echo
    
    # Check prerequisites
    print_status "Checking prerequisites..."
    
    if ! command_exists heroku; then
        print_error "Heroku CLI is not installed. Please install it from https://devcenter.heroku.com/articles/heroku-cli"
        exit 1
    fi
    
    if ! command_exists git; then
        print_error "Git is not installed. Please install Git."
        exit 1
    fi
    
    if ! command_exists curl; then
        print_error "curl is not installed. Please install curl."
        exit 1
    fi
    
    if ! command_exists jq; then
        print_warning "jq is not installed. JSON parsing will be limited."
        print_status "Install jq for better output formatting: brew install jq (macOS) or apt-get install jq (Ubuntu)"
    fi
    
    # Check if logged into Heroku
    if ! heroku auth:whoami >/dev/null 2>&1; then
        print_error "Not logged into Heroku. Please run: heroku login"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
    
    # Check if app exists
    print_status "Checking if staging app '$APP_NAME' exists..."
    
    if ! heroku apps:info --app "$APP_NAME" >/dev/null 2>&1; then
        print_warning "Staging app '$APP_NAME' does not exist"
        read -p "Do you want to create it? (y/n): " create_app
        
        if [ "$create_app" = "y" ] || [ "$create_app" = "Y" ]; then
            print_status "Creating staging app '$APP_NAME'..."
            heroku create "$APP_NAME"
            
            # Set staging-specific environment variables
            print_status "Setting staging environment variables..."
            heroku config:set NODE_ENV=staging --app "$APP_NAME"
            heroku config:set SESSION_SECRET="$(openssl rand -base64 32)" --app "$APP_NAME"
            
            print_success "Staging app created successfully"
        else
            print_error "Deployment cancelled"
            exit 1
        fi
    else
        print_success "Staging app '$APP_NAME' exists"
    fi
    
    # Get app URL
    APP_URL=$(heroku apps:info --app "$APP_NAME" --json | python3 -c "import sys, json; print(json.load(sys.stdin)['app']['web_url'])" 2>/dev/null | sed 's/\/$//')
    
    if [ -z "$APP_URL" ]; then
        APP_URL="https://${APP_NAME}.herokuapp.com"
        print_warning "Could not retrieve app URL automatically, using: $APP_URL"
    else
        print_status "App URL: $APP_URL"
    fi
    
    # Check git status
    print_status "Checking git repository status..."
    
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "Working directory has uncommitted changes"
        git status --short
        read -p "Continue with deployment? (y/n): " continue_deploy
        
        if [ "$continue_deploy" != "y" ] && [ "$continue_deploy" != "Y" ]; then
            print_error "Deployment cancelled"
            exit 1
        fi
    fi
    
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "$BRANCH" ]; then
        print_warning "Current branch is '$current_branch', but deploying from '$BRANCH'"
    fi
    
    # Pre-deployment checks
    print_status "Running pre-deployment checks..."
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in current directory"
        exit 1
    fi
    
    # Check if required files exist
    required_files=("src/server.js" "config/environment.js" "Procfile")
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Required file not found: $file"
            exit 1
        fi
    done
    
    print_success "Pre-deployment checks passed"
    
    # Deploy to staging
    print_status "Deploying to staging environment..."
    print_status "App: $APP_NAME"
    print_status "Branch: $BRANCH"
    
    if [ "$current_branch" = "$BRANCH" ]; then
        git push heroku "$BRANCH":main --app "$APP_NAME"
    else
        git push heroku "$BRANCH":main --app "$APP_NAME"
    fi
    
    # Wait for deployment to complete
    if wait_for_deployment "$APP_NAME" "$TIMEOUT"; then
        print_success "Deployment completed"
    else
        print_error "Deployment failed or timed out"
        print_status "Checking application logs..."
        heroku logs --tail --num 50 --app "$APP_NAME"
        exit 1
    fi
    
    # Run verification tests
    print_status "Running post-deployment verification..."
    
    if run_verification_tests "$APP_URL"; then
        print_success "All verification tests passed!"
    else
        print_error "Some verification tests failed"
        print_status "Checking application logs for errors..."
        heroku logs --tail --num 20 --app "$APP_NAME"
        exit 1
    fi
    
    # Display deployment summary
    show_deployment_summary "$APP_NAME" "$APP_URL"
    
    print_success "Staging deployment completed successfully! 🚀"
    
    # Optional: Open the app in browser
    read -p "Do you want to open the app in your browser? (y/n): " open_app
    if [ "$open_app" = "y" ] || [ "$open_app" = "Y" ]; then
        heroku open --app "$APP_NAME"
    fi
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"