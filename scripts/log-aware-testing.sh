#!/bin/bash

# Log-Aware E2E Testing Script for PDFCraft.Pro
# Integrates comprehensive log analysis into CI/CD pipeline

set -e

PROJECT_ROOT="/c/Users/Mac/OneDrive/Desktop/Projects/PDFCraft.Pro"
LOG_DIR="$PROJECT_ROOT/backend/logs"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-output"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "🚀 Starting Log-Aware E2E Testing Pipeline"
echo "Timestamp: $TIMESTAMP"
echo "Project Root: $PROJECT_ROOT"

# Create test results directory
mkdir -p "$TEST_RESULTS_DIR"

# Function to check service health
check_service_health() {
    local service_name=$1
    local health_url=$2
    local max_attempts=30
    local attempt=1

    echo "🔍 Checking $service_name health..."

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            echo "✅ $service_name is healthy"
            return 0
        fi

        echo "⏳ Attempt $attempt/$max_attempts: $service_name not ready, waiting..."
        sleep 2
        ((attempt++))
    done

    echo "❌ $service_name failed health check after $max_attempts attempts"
    return 1
}

# Function to backup existing logs
backup_logs() {
    echo "📋 Backing up existing logs..."

    if [ -d "$LOG_DIR" ]; then
        local backup_dir="$TEST_RESULTS_DIR/logs_backup_$TIMESTAMP"
        mkdir -p "$backup_dir"
        cp -r "$LOG_DIR"/* "$backup_dir/" 2>/dev/null || true
        echo "✅ Logs backed up to: $backup_dir"
    else
        echo "ℹ️  No existing logs to backup"
    fi
}

# Function to reset log files for clean testing
reset_logs() {
    echo "🔄 Resetting log files for clean test environment..."

    # Create logs directory if it doesn't exist
    mkdir -p "$LOG_DIR"

    # Reset log files
    > "$LOG_DIR/combined.log"
    > "$LOG_DIR/error.log"
    > "$LOG_DIR/backend.log"

    echo "✅ Log files reset"
}

# Function to capture log baselines
capture_log_baseline() {
    echo "📊 Capturing log baseline before tests..."

    local baseline_file="$TEST_RESULTS_DIR/log_baseline_$TIMESTAMP.json"

    cat > "$baseline_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "logFiles": {
        "combined": {
            "path": "$LOG_DIR/combined.log",
            "size": $(stat -f%z "$LOG_DIR/combined.log" 2>/dev/null || echo 0),
            "lines": $(wc -l < "$LOG_DIR/combined.log" 2>/dev/null || echo 0)
        },
        "error": {
            "path": "$LOG_DIR/error.log",
            "size": $(stat -f%z "$LOG_DIR/error.log" 2>/dev/null || echo 0),
            "lines": $(wc -l < "$LOG_DIR/error.log" 2>/dev/null || echo 0)
        },
        "backend": {
            "path": "$LOG_DIR/backend.log",
            "size": $(stat -f%z "$LOG_DIR/backend.log" 2>/dev/null || echo 0),
            "lines": $(wc -l < "$LOG_DIR/backend.log" 2>/dev/null || echo 0)
        }
    }
}
EOF

    echo "✅ Log baseline captured: $baseline_file"
}

# Function to run enhanced E2E tests
run_enhanced_tests() {
    echo "🧪 Running Enhanced E2E Tests with Log Analysis..."

    cd "$PROJECT_ROOT"

    # Run the enhanced test suite
    if node test-e2e-with-log-analysis.js; then
        echo "✅ Enhanced E2E tests completed successfully"
        return 0
    else
        echo "❌ Enhanced E2E tests failed"
        return 1
    fi
}

# Function to analyze logs post-test
analyze_test_logs() {
    echo "🔍 Performing post-test log analysis..."

    local analysis_file="$TEST_RESULTS_DIR/log_analysis_$TIMESTAMP.txt"

    echo "=== POST-TEST LOG ANALYSIS ===" > "$analysis_file"
    echo "Timestamp: $(date -Iseconds)" >> "$analysis_file"
    echo "" >> "$analysis_file"

    # Analyze error logs
    echo "=== ERROR LOG ANALYSIS ===" >> "$analysis_file"
    if [ -f "$LOG_DIR/error.log" ] && [ -s "$LOG_DIR/error.log" ]; then
        echo "Error log entries found:" >> "$analysis_file"
        tail -n 50 "$LOG_DIR/error.log" >> "$analysis_file"
    else
        echo "No errors detected in error log ✅" >> "$analysis_file"
    fi
    echo "" >> "$analysis_file"

    # Analyze critical patterns in combined log
    echo "=== CRITICAL PATTERN ANALYSIS ===" >> "$analysis_file"
    if [ -f "$LOG_DIR/combined.log" ]; then
        echo "Searching for critical patterns..." >> "$analysis_file"

        # Search for critical keywords
        grep -i "error\|failed\|timeout\|crash\|exception" "$LOG_DIR/combined.log" | tail -n 20 >> "$analysis_file" || echo "No critical patterns found ✅" >> "$analysis_file"
    fi
    echo "" >> "$analysis_file"

    # Performance metrics
    echo "=== PERFORMANCE METRICS ===" >> "$analysis_file"
    if [ -f "$LOG_DIR/combined.log" ]; then
        echo "Processing time analysis:" >> "$analysis_file"
        grep -o "processing time.*[0-9]\+ms" "$LOG_DIR/combined.log" | tail -n 10 >> "$analysis_file" || echo "No processing time data found" >> "$analysis_file"
    fi

    echo "✅ Log analysis saved: $analysis_file"
}

# Function to generate test report
generate_test_report() {
    echo "📄 Generating comprehensive test report..."

    local report_file="$TEST_RESULTS_DIR/test_report_$TIMESTAMP.md"

    cat > "$report_file" << EOF
# PDFCraft.Pro E2E Test Report with Log Analysis

**Test Execution Time:** $(date -Iseconds)
**Test Environment:** Development
**Frontend:** http://localhost:3007
**Backend:** http://localhost:3025

## Test Results Summary

$(if [ -f "e2e-test-results-with-logs.json" ]; then
    echo "### Test Statistics"
    echo "\`\`\`json"
    jq '.summary' e2e-test-results-with-logs.json 2>/dev/null || echo "Could not parse test results"
    echo "\`\`\`"
fi)

## Log Analysis Summary

$(if [ -f "$TEST_RESULTS_DIR/log_analysis_$TIMESTAMP.txt" ]; then
    echo "### Critical Issues"
    echo "\`\`\`"
    cat "$TEST_RESULTS_DIR/log_analysis_$TIMESTAMP.txt"
    echo "\`\`\`"
fi)

## Recommendations

- **Performance:** Monitor processing times for consistency
- **Reliability:** Address any critical log issues immediately
- **Security:** Review authentication-related log entries
- **Monitoring:** Establish continuous log monitoring in production

## Files Generated

- Test Results: \`e2e-test-results-with-logs.json\`
- Log Analysis: \`$TEST_RESULTS_DIR/log_analysis_$TIMESTAMP.txt\`
- Log Backup: \`$TEST_RESULTS_DIR/logs_backup_$TIMESTAMP/\`

---
*Generated by Log-Aware E2E Testing Pipeline*
EOF

    echo "✅ Test report generated: $report_file"
}

# Main execution flow
main() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Step 1: Check service health
    if ! check_service_health "Frontend" "http://localhost:3007"; then
        echo "❌ Frontend service check failed"
        exit 1
    fi

    if ! check_service_health "Backend" "http://localhost:3025/health"; then
        echo "❌ Backend service check failed"
        exit 1
    fi

    # Step 2: Backup and reset logs
    backup_logs
    reset_logs
    capture_log_baseline

    # Step 3: Run enhanced tests
    if ! run_enhanced_tests; then
        echo "❌ Enhanced E2E tests failed"
        analyze_test_logs
        generate_test_report
        exit 1
    fi

    # Step 4: Post-test analysis
    analyze_test_logs
    generate_test_report

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 Log-Aware E2E Testing Pipeline Completed Successfully!"
    echo "📁 Results available in: $TEST_RESULTS_DIR"

    return 0
}

# Execute main function
main "$@"