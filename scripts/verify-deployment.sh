#!/bin/bash

# =================================================================
# Itinerary Whisperer - Deployment Verification Script
# =================================================================
# This script verifies a deployed application across multiple
# environments and provides detailed health reports
# =================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
TIMEOUT=30
USER_AGENT="Itinerary-Whisperer-Verification/1.0"

print_header() {
    echo -e "${PURPLE}==================================================================="
    echo -e "    $1"
    echo -e "===================================================================${NC}"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to test endpoint with detailed reporting
test_endpoint() {
    local url=$1
    local endpoint=$2
    local expected_status=${3:-200}
    local description=$4
    
    echo
    print_status "Testing: $description"
    print_status "URL: ${url}${endpoint}"
    
    # Perform the request
    response=$(curl -s -w "%{http_code}|%{time_total}|%{size_download}" \
        -H "User-Agent: $USER_AGENT" \
        -H "Accept: application/json" \
        --max-time "$TIMEOUT" \
        "${url}${endpoint}" \
        -o /tmp/response_body.txt 2>/dev/null || echo "000|0|0")
    
    IFS='|' read -r http_code response_time response_size <<< "$response"
    
    # Check HTTP status
    if [ "$http_code" = "$expected_status" ]; then
        print_success "Status: $http_code (expected $expected_status)"
    else
        print_error "Status: $http_code (expected $expected_status)"
        return 1
    fi
    
    # Show response time
    if (( $(echo "$response_time > 2.0" | bc -l 2>/dev/null || echo 0) )); then
        print_warning "Response time: ${response_time}s (slow)"
    else
        print_success "Response time: ${response_time}s"
    fi
    
    # Show response size
    print_status "Response size: ${response_size} bytes"
    
    # Show response body (truncated)
    if [ -s /tmp/response_body.txt ]; then
        print_status "Response preview:"
        if command -v jq >/dev/null 2>&1 && jq . /tmp/response_body.txt >/dev/null 2>&1; then
            head -c 500 /tmp/response_body.txt | jq . | sed 's/^/  /'
        else
            head -c 200 /tmp/response_body.txt | sed 's/^/  /'
            if [ $(wc -c < /tmp/response_body.txt) -gt 200 ]; then
                echo "  ..."
            fi
        fi
    fi
    
    rm -f /tmp/response_body.txt
    return 0
}

# Function to test security headers
test_security_headers() {
    local url=$1
    
    print_status "Checking security headers..."
    
    headers=$(curl -s -I "$url/health" -H "User-Agent: $USER_AGENT" --max-time "$TIMEOUT" || echo "")
    
    if [ -z "$headers" ]; then
        print_error "Could not retrieve headers"
        return 1
    fi
    
    # Check for important security headers
    declare -A security_headers=(
        ["X-Content-Type-Options"]="nosniff"
        ["X-Frame-Options"]=".*"
        ["X-XSS-Protection"]=".*"
        ["X-DNS-Prefetch-Control"]=".*"
        ["Referrer-Policy"]=".*"
        ["Content-Security-Policy"]=".*"
    )
    
    for header in "${!security_headers[@]}"; do
        if echo "$headers" | grep -qi "^$header:"; then
            print_success "$header header present"
        else
            print_warning "$header header missing"
        fi
    done
    
    # Check for HTTPS redirect
    if echo "$headers" | grep -qi "strict-transport-security"; then
        print_success "HSTS header present"
    else
        print_warning "HSTS header missing (may be handled by proxy)"
    fi
}

# Function to test performance metrics
test_performance() {
    local url=$1
    
    print_status "Running performance tests..."
    
    # Test multiple endpoints for average response time
    endpoints=("/health" "/" "/nonexistent")
    total_time=0
    successful_requests=0
    
    for endpoint in "${endpoints[@]}"; do
        response_time=$(curl -s -w "%{time_total}" -o /dev/null --max-time "$TIMEOUT" \
            "${url}${endpoint}" 2>/dev/null || echo "0")
        
        if (( $(echo "$response_time > 0" | bc -l 2>/dev/null || echo 0) )); then
            total_time=$(echo "$total_time + $response_time" | bc -l 2>/dev/null || echo "$total_time")
            successful_requests=$((successful_requests + 1))
        fi
    done
    
    if [ $successful_requests -gt 0 ]; then
        avg_time=$(echo "scale=3; $total_time / $successful_requests" | bc -l 2>/dev/null || echo "0")
        print_status "Average response time: ${avg_time}s"
        
        if (( $(echo "$avg_time > 3.0" | bc -l 2>/dev/null || echo 0) )); then
            print_warning "Average response time is high"
        else
            print_success "Average response time is acceptable"
        fi
    else
        print_error "No successful requests for performance testing"
    fi
}

# Function to verify environment-specific features
verify_environment_features() {
    local url=$1
    local environment=$2
    
    print_status "Verifying environment-specific features for: $environment"
    
    # Get health check response
    health_response=$(curl -s "${url}/health" --max-time "$TIMEOUT" || echo "{}")
    
    if command -v jq >/dev/null 2>&1; then
        # Extract environment from health response
        reported_env=$(echo "$health_response" | jq -r '.environment // "unknown"' 2>/dev/null || echo "unknown")
        
        if [ "$reported_env" = "$environment" ]; then
            print_success "Environment correctly reported as: $reported_env"
        else
            print_warning "Environment mismatch - expected: $environment, reported: $reported_env"
        fi
        
        # Check version
        version=$(echo "$health_response" | jq -r '.version // "unknown"' 2>/dev/null || echo "unknown")
        if [ "$version" != "unknown" ] && [ "$version" != "null" ]; then
            print_success "Version: $version"
        else
            print_warning "Version not reported in health check"
        fi
        
        # Check timestamp format
        timestamp=$(echo "$health_response" | jq -r '.timestamp // "unknown"' 2>/dev/null || echo "unknown")
        if [[ "$timestamp" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2} ]]; then
            print_success "Timestamp format is valid: $timestamp"
        else
            print_warning "Invalid timestamp format: $timestamp"
        fi
    else
        print_warning "jq not available - skipping detailed health check analysis"
    fi
}

# Function to test load capacity (basic)
test_load_capacity() {
    local url=$1
    
    print_status "Running basic load test (10 concurrent requests)..."
    
    # Create a temporary script for concurrent requests
    cat > /tmp/load_test.sh << 'EOF'
#!/bin/bash
url=$1
for i in {1..10}; do
    curl -s -w "%{http_code}|%{time_total}\n" -o /dev/null "$url/health" &
done
wait
EOF
    
    chmod +x /tmp/load_test.sh
    
    # Run the load test
    results=$(/tmp/load_test.sh "$url" 2>/dev/null || echo "")
    
    if [ -n "$results" ]; then
        success_count=$(echo "$results" | grep "^200|" | wc -l)
        total_count=$(echo "$results" | wc -l)
        
        print_status "Load test results: $success_count/$total_count requests successful"
        
        if [ "$success_count" -eq "$total_count" ]; then
            print_success "All concurrent requests handled successfully"
        else
            print_warning "Some requests failed under load"
        fi
        
        # Calculate average response time
        if command -v bc >/dev/null 2>&1; then
            avg_time=$(echo "$results" | grep "^200|" | cut -d'|' -f2 | \
                awk '{sum+=$1; count++} END {if(count>0) printf "%.3f", sum/count; else print "0"}')
            print_status "Average response time under load: ${avg_time}s"
        fi
    else
        print_error "Load test failed to execute"
    fi
    
    rm -f /tmp/load_test.sh
}

# Function to verify deployment completeness
verify_deployment_completeness() {
    local url=$1
    
    print_status "Verifying deployment completeness..."
    
    # Check if all expected endpoints respond appropriately
    declare -A endpoints=(
        ["/health"]="200"
        ["/"]="200"
        ["/nonexistent"]="404"
    )
    
    all_passed=true
    
    for endpoint in "${!endpoints[@]}"; do
        expected_status=${endpoints[$endpoint]}
        
        actual_status=$(curl -s -w "%{http_code}" -o /dev/null --max-time "$TIMEOUT" \
            "${url}${endpoint}" 2>/dev/null || echo "000")
        
        if [ "$actual_status" = "$expected_status" ]; then
            print_success "Endpoint $endpoint: $actual_status (✓)"
        else
            print_error "Endpoint $endpoint: $actual_status (expected $expected_status)"
            all_passed=false
        fi
    done
    
    if $all_passed; then
        print_success "All endpoints responding correctly"
    else
        print_error "Some endpoints not responding correctly"
        return 1
    fi
}

# Main verification function
verify_deployment() {
    local url=$1
    local environment=${2:-"unknown"}
    
    print_header "DEPLOYMENT VERIFICATION: $url"
    
    echo "Environment: $environment"
    echo "Timestamp: $(date)"
    echo "URL: $url"
    echo
    
    # Test basic connectivity
    if ! test_endpoint "$url" "/health" "200" "Health endpoint"; then
        print_error "Basic connectivity test failed"
        return 1
    fi
    
    # Test error handling
    test_endpoint "$url" "/nonexistent" "404" "Error handling (404)"
    
    # Test static file serving
    test_endpoint "$url" "/" "200" "Static file serving (landing page)"
    
    # Test security headers
    test_security_headers "$url"
    
    # Test performance
    test_performance "$url"
    
    # Verify environment features
    verify_environment_features "$url" "$environment"
    
    # Test basic load capacity
    test_load_capacity "$url"
    
    # Verify deployment completeness
    if verify_deployment_completeness "$url"; then
        print_success "Deployment verification completed successfully!"
        return 0
    else
        print_error "Deployment verification failed"
        return 1
    fi
}

# Generate verification report
generate_report() {
    local url=$1
    local environment=$2
    local status=$3
    
    report_file="deployment-verification-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "==================================================================="
        echo "    DEPLOYMENT VERIFICATION REPORT"
        echo "==================================================================="
        echo "URL: $url"
        echo "Environment: $environment"
        echo "Timestamp: $(date)"
        echo "Status: $status"
        echo "==================================================================="
        echo
        
        # Capture health response
        echo "HEALTH CHECK RESPONSE:"
        curl -s "$url/health" --max-time "$TIMEOUT" | \
            (command -v jq >/dev/null 2>&1 && jq . || cat) || echo "Failed to get health response"
        echo
        
        # Capture headers
        echo "RESPONSE HEADERS:"
        curl -s -I "$url/health" --max-time "$TIMEOUT" || echo "Failed to get headers"
        echo
        
        echo "==================================================================="
        echo "Report generated at: $(date)"
        echo "==================================================================="
    } > "$report_file"
    
    print_status "Verification report saved to: $report_file"
}

# Usage function
usage() {
    echo "Usage: $0 <url> [environment]"
    echo
    echo "Examples:"
    echo "  $0 https://my-app-staging.herokuapp.com staging"
    echo "  $0 https://my-app.herokuapp.com production"
    echo "  $0 http://localhost:3000 development"
    echo
    echo "Environment parameter is optional and defaults to 'unknown'"
}

# Main script
main() {
    if [ $# -lt 1 ]; then
        usage
        exit 1
    fi
    
    local url=$1
    local environment=${2:-"unknown"}
    
    # Remove trailing slash from URL
    url=${url%/}
    
    # Validate URL format
    if [[ ! $url =~ ^https?:// ]]; then
        print_error "Invalid URL format. Must start with http:// or https://"
        exit 1
    fi
    
    # Check dependencies
    if ! command -v curl >/dev/null 2>&1; then
        print_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v bc >/dev/null 2>&1; then
        print_warning "bc is not installed - some calculations will be limited"
    fi
    
    # Run verification
    if verify_deployment "$url" "$environment"; then
        status="PASSED"
        print_success "Overall verification: PASSED ✅"
    else
        status="FAILED"
        print_error "Overall verification: FAILED ❌"
    fi
    
    # Generate report
    generate_report "$url" "$environment" "$status"
    
    if [ "$status" = "FAILED" ]; then
        exit 1
    fi
}

# Handle interruption
trap 'print_error "Verification interrupted"; exit 1' INT TERM

# Run main function
main "$@"