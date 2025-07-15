#!/bin/bash

# =================================================================
# Itinerary Whisperer - Health Monitoring Script
# =================================================================
# This script provides continuous monitoring of deployed applications
# with alerts and reporting capabilities
# =================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default configuration
DEFAULT_INTERVAL=300  # 5 minutes
DEFAULT_TIMEOUT=10
DEFAULT_MAX_FAILURES=3

# Configuration from environment or defaults
MONITOR_INTERVAL="${MONITOR_INTERVAL:-$DEFAULT_INTERVAL}"
TIMEOUT="${TIMEOUT:-$DEFAULT_TIMEOUT}"
MAX_FAILURES="${MAX_FAILURES:-$DEFAULT_MAX_FAILURES}"
WEBHOOK_URL="${WEBHOOK_URL:-}"
EMAIL_ALERTS="${EMAIL_ALERTS:-}"
LOG_FILE="${LOG_FILE:-health-monitor.log}"

print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌${NC} $1"
}

# Function to send webhook notification
send_webhook() {
    local message=$1
    local color=${2:-"warning"}
    
    if [ -n "$WEBHOOK_URL" ]; then
        case $color in
            "good") emoji="✅" ;;
            "danger") emoji="🚨" ;;
            *) emoji="⚠️" ;;
        esac
        
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$emoji $message\"}" \
            "$WEBHOOK_URL" >/dev/null 2>&1 || true
    fi
}

# Function to send email alert
send_email_alert() {
    local subject=$1
    local message=$2
    
    if [ -n "$EMAIL_ALERTS" ] && command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "$subject" "$EMAIL_ALERTS" 2>/dev/null || true
    fi
}

# Function to log message
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Function to check health endpoint
check_health() {
    local url=$1
    local app_name=$2
    
    # Perform health check
    response=$(curl -s -w "%{http_code}|%{time_total}" \
        --max-time "$TIMEOUT" \
        --user-agent "Health-Monitor/1.0" \
        "${url}/health" \
        -o /tmp/health_response.json 2>/dev/null || echo "000|0")
    
    IFS='|' read -r http_code response_time <<< "$response"
    
    # Parse response if available
    local status="unknown"
    local environment="unknown"
    local version="unknown"
    local features=""
    
    if [ -f /tmp/health_response.json ] && [ "$http_code" = "200" ]; then
        if command -v jq >/dev/null 2>&1; then
            status=$(jq -r '.status // "unknown"' /tmp/health_response.json 2>/dev/null || echo "unknown")
            environment=$(jq -r '.environment // "unknown"' /tmp/health_response.json 2>/dev/null || echo "unknown")
            version=$(jq -r '.version // "unknown"' /tmp/health_response.json 2>/dev/null || echo "unknown")
        fi
    fi
    
    # Determine health status
    local is_healthy=false
    if [ "$http_code" = "200" ] && [ "$status" = "ok" ]; then
        is_healthy=true
    fi
    
    # Log result
    local log_entry="$app_name|$http_code|$response_time|$status|$environment|$version"
    log_message "$log_entry"
    
    # Return result
    echo "$is_healthy|$http_code|$response_time|$status|$environment|$version"
    
    rm -f /tmp/health_response.json
}

# Function to monitor single application
monitor_app() {
    local url=$1
    local app_name=$2
    local failure_count=0
    local last_status="unknown"
    
    print_status "Starting monitoring for $app_name ($url)"
    
    while true; do
        result=$(check_health "$url" "$app_name")
        IFS='|' read -r is_healthy http_code response_time status environment version <<< "$result"
        
        if [ "$is_healthy" = "true" ]; then
            # Healthy response
            if [ "$last_status" != "healthy" ]; then
                if [ "$last_status" = "unhealthy" ]; then
                    # Recovery from failure
                    message="🎉 $app_name is back online! (${response_time}s response time)"
                    print_success "$message"
                    send_webhook "$message" "good"
                    send_email_alert "✅ $app_name Recovery" "$message"
                else
                    # Initial healthy status
                    message="$app_name is healthy (${response_time}s response time)"
                    print_success "$message"
                fi
                last_status="healthy"
                failure_count=0
            else
                # Continuing healthy status (quiet)
                printf "."
            fi
            
        else
            # Unhealthy response
            failure_count=$((failure_count + 1))
            message="$app_name health check failed (attempt $failure_count/$MAX_FAILURES) - HTTP $http_code"
            print_warning "$message"
            
            if [ $failure_count -ge $MAX_FAILURES ]; then
                if [ "$last_status" != "unhealthy" ]; then
                    # First time failing after max attempts
                    alert_message="🚨 $app_name is DOWN after $MAX_FAILURES failed attempts (HTTP $http_code)"
                    print_error "$alert_message"
                    send_webhook "$alert_message" "danger"
                    send_email_alert "🚨 $app_name ALERT" "$alert_message"
                    last_status="unhealthy"
                fi
            fi
        fi
        
        # Sleep until next check
        sleep "$MONITOR_INTERVAL"
    done
}

# Function to monitor multiple applications
monitor_multiple() {
    local config_file=$1
    
    if [ ! -f "$config_file" ]; then
        print_error "Configuration file not found: $config_file"
        exit 1
    fi
    
    print_status "Starting multi-app monitoring from $config_file"
    
    # Read configuration file and start monitoring processes
    while IFS='|' read -r app_name url; do
        if [ -n "$app_name" ] && [ -n "$url" ] && [[ ! "$app_name" =~ ^# ]]; then
            print_status "Starting monitor for $app_name"
            monitor_app "$url" "$app_name" &
        fi
    done < "$config_file"
    
    # Wait for all background processes
    wait
}

# Function to create sample configuration
create_sample_config() {
    local config_file=$1
    
    cat > "$config_file" << 'EOF'
# Health Monitor Configuration
# Format: app_name|url
# Lines starting with # are ignored

# Production
production|https://itinerary-whisperer.herokuapp.com

# Staging  
staging|https://itinerary-whisperer-staging.herokuapp.com

# Development (if accessible)
# development|http://localhost:3000
EOF
    
    print_status "Sample configuration created: $config_file"
    print_status "Edit this file to match your applications"
}

# Function to show monitoring status
show_status() {
    local config_file=$1
    
    print_status "Current monitoring status:"
    echo
    
    if [ -f "$config_file" ]; then
        while IFS='|' read -r app_name url; do
            if [ -n "$app_name" ] && [ -n "$url" ] && [[ ! "$app_name" =~ ^# ]]; then
                printf "%-20s " "$app_name:"
                
                result=$(check_health "$url" "$app_name")
                IFS='|' read -r is_healthy http_code response_time status environment version <<< "$result"
                
                if [ "$is_healthy" = "true" ]; then
                    printf "${GREEN}✅ Healthy${NC} (${response_time}s, v$version)\n"
                else
                    printf "${RED}❌ Unhealthy${NC} (HTTP $http_code)\n"
                fi
            fi
        done < "$config_file"
    else
        print_warning "No configuration file found"
    fi
    
    echo
}

# Function to generate monitoring report
generate_report() {
    local hours=${1:-24}
    local report_file="health-report-$(date +%Y%m%d-%H%M%S).txt"
    
    print_status "Generating $hours-hour health report..."
    
    {
        echo "==================================================================="
        echo "    HEALTH MONITORING REPORT"
        echo "==================================================================="
        echo "Generated: $(date)"
        echo "Period: Last $hours hours"
        echo "==================================================================="
        echo
        
        if [ -f "$LOG_FILE" ]; then
            # Get logs from last N hours
            cutoff_time=$(date -d "$hours hours ago" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -v-${hours}H '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "")
            
            if [ -n "$cutoff_time" ]; then
                echo "HEALTH CHECK SUMMARY:"
                echo
                
                # Summary by application
                awk -F'|' -v cutoff="$cutoff_time" '
                $1 >= cutoff {
                    apps[$2]++; 
                    if($3 == "200") success[$2]++; 
                    total_time[$2] += $4;
                }
                END {
                    for(app in apps) {
                        success_rate = (success[app] / apps[app]) * 100;
                        avg_time = total_time[app] / apps[app];
                        printf "%-20s: %d checks, %.1f%% success, %.3fs avg response\n", 
                               app, apps[app], success_rate, avg_time;
                    }
                }' "$LOG_FILE"
                
                echo
                echo "RECENT FAILURES:"
                echo
                
                # Show recent failures
                awk -F'|' -v cutoff="$cutoff_time" '
                $1 >= cutoff && $3 != "200" {
                    printf "%s: %s (HTTP %s)\n", $1, $2, $3;
                }' "$LOG_FILE" | tail -20
                
            else
                echo "Could not parse time range"
                echo "Showing last 100 log entries:"
                tail -100 "$LOG_FILE"
            fi
        else
            echo "No log file found: $LOG_FILE"
        fi
        
        echo
        echo "==================================================================="
    } > "$report_file"
    
    print_success "Report generated: $report_file"
}

# Usage function
usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  monitor <url> <name>     Monitor single application"
    echo "  multi <config_file>      Monitor multiple applications"
    echo "  status <config_file>     Show current status of all apps"
    echo "  report [hours]           Generate health report (default: 24 hours)"
    echo "  config <file>            Create sample configuration file"
    echo
    echo "Environment Variables:"
    echo "  MONITOR_INTERVAL         Check interval in seconds (default: 300)"
    echo "  TIMEOUT                  Request timeout in seconds (default: 10)"
    echo "  MAX_FAILURES             Max failures before alert (default: 3)"
    echo "  WEBHOOK_URL              Slack/Discord webhook URL for alerts"
    echo "  EMAIL_ALERTS             Email address for alerts"
    echo "  LOG_FILE                 Log file path (default: health-monitor.log)"
    echo
    echo "Examples:"
    echo "  $0 monitor https://my-app.herokuapp.com my-app"
    echo "  $0 multi apps.conf"
    echo "  $0 status apps.conf"
    echo "  $0 report 12"
    echo "  $0 config apps.conf"
    echo
    echo "Configuration file format (app_name|url):"
    echo "  production|https://my-app.herokuapp.com"
    echo "  staging|https://my-app-staging.herokuapp.com"
}

# Main script
main() {
    case "${1:-}" in
        "monitor")
            if [ $# -lt 3 ]; then
                print_error "Usage: $0 monitor <url> <name>"
                exit 1
            fi
            monitor_app "$2" "$3"
            ;;
        "multi")
            if [ $# -lt 2 ]; then
                print_error "Usage: $0 multi <config_file>"
                exit 1
            fi
            monitor_multiple "$2"
            ;;
        "status")
            if [ $# -lt 2 ]; then
                print_error "Usage: $0 status <config_file>"
                exit 1
            fi
            show_status "$2"
            ;;
        "report")
            generate_report "${2:-24}"
            ;;
        "config")
            if [ $# -lt 2 ]; then
                print_error "Usage: $0 config <config_file>"
                exit 1
            fi
            create_sample_config "$2"
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

# Handle interruption
trap 'print_error "Monitoring interrupted"; exit 1' INT TERM

# Run main function
main "$@"