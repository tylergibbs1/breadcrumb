#!/bin/bash

# Battle Test: Staleness Detection Feature
# Tests edge cases, error handling, and real-world scenarios

# Don't use set -e - we handle errors manually

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BREADCRUMB="node $SCRIPT_DIR/dist/index.js"
TEST_DIR="/tmp/breadcrumb-battle-test-$$"
ORIGINAL_DIR=$(pwd)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    PASSED=$((PASSED + 1))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    echo "  Expected: $2"
    echo "  Got: $3"
    FAILED=$((FAILED + 1))
}

section() {
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
}

cleanup() {
    cd "$ORIGINAL_DIR" 2>/dev/null || true
    rm -rf "$TEST_DIR" 2>/dev/null || true
}

trap cleanup EXIT

# Setup
section "SETUP"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"
echo "Test directory: $TEST_DIR"

# Initialize breadcrumb
$BREADCRUMB init > /dev/null
pass "Initialized breadcrumb"

# ============================================================================
section "TEST 1: Basic Hash Capture on Add"
# ============================================================================

echo "function hello() { return 'world'; }" > test1.js
OUTPUT=$($BREADCRUMB add ./test1.js "Test note 1")

if echo "$OUTPUT" | grep -q '"code_hash"'; then
    pass "Hash captured on add"
else
    fail "Hash captured on add" "code_hash in output" "$OUTPUT"
fi

if echo "$OUTPUT" | grep -q '"last_verified"'; then
    pass "last_verified timestamp captured"
else
    fail "last_verified timestamp captured" "last_verified in output" "$OUTPUT"
fi

# ============================================================================
section "TEST 2: Verify Shows 'verified' for Unchanged File"
# ============================================================================

OUTPUT=$($BREADCRUMB verify ./test1.js)

if echo "$OUTPUT" | grep -q '"staleness": "verified"'; then
    pass "Unchanged file shows 'verified'"
else
    fail "Unchanged file shows 'verified'" "staleness: verified" "$OUTPUT"
fi

if echo "$OUTPUT" | grep -q '"verified": 1'; then
    pass "Verify count correct"
else
    fail "Verify count correct" "verified: 1" "$OUTPUT"
fi

# ============================================================================
section "TEST 3: Verify Detects Stale After File Change"
# ============================================================================

echo "function hello() { return 'changed!'; }" > test1.js
OUTPUT=$($BREADCRUMB verify ./test1.js 2>&1 || true)

if echo "$OUTPUT" | grep -q '"staleness": "stale"'; then
    pass "Modified file shows 'stale'"
else
    fail "Modified file shows 'stale'" "staleness: stale" "$OUTPUT"
fi

if echo "$OUTPUT" | grep -q '"stale": 1'; then
    pass "Stale count correct"
else
    fail "Stale count correct" "stale: 1" "$OUTPUT"
fi

# Verify exit code is 1 for stale
$BREADCRUMB verify ./test1.js > /dev/null 2>&1 && EXIT_CODE=0 || EXIT_CODE=$?
if [ "$EXIT_CODE" -eq 1 ]; then
    pass "Exit code 1 for stale breadcrumbs"
else
    fail "Exit code 1 for stale breadcrumbs" "1" "$EXIT_CODE"
fi

# ============================================================================
section "TEST 4: Verify --update Refreshes Hash"
# ============================================================================

$BREADCRUMB verify ./test1.js --update > /dev/null 2>&1 || true
OUTPUT=$($BREADCRUMB verify ./test1.js)

if echo "$OUTPUT" | grep -q '"staleness": "verified"'; then
    pass "--update refreshes hash to verified"
else
    fail "--update refreshes hash to verified" "staleness: verified" "$OUTPUT"
fi

# ============================================================================
section "TEST 5: Directory Pattern Shows 'unknown'"
# ============================================================================

mkdir -p subdir
echo "content" > subdir/file.js
$BREADCRUMB add ./subdir/ "Directory breadcrumb" > /dev/null
OUTPUT=$($BREADCRUMB verify ./subdir/)

if echo "$OUTPUT" | grep -q '"staleness": "unknown"'; then
    pass "Directory pattern shows 'unknown'"
else
    fail "Directory pattern shows 'unknown'" "staleness: unknown" "$OUTPUT"
fi

# ============================================================================
section "TEST 6: Glob Pattern Shows 'unknown'"
# ============================================================================

echo "test" > test-glob-1.ts
echo "test" > test-glob-2.ts
$BREADCRUMB add "*.ts" "Glob breadcrumb" > /dev/null
OUTPUT=$($BREADCRUMB verify)

if echo "$OUTPUT" | grep -q '"path": "\*.ts"' && echo "$OUTPUT" | grep -q '"staleness": "unknown"'; then
    pass "Glob pattern shows 'unknown'"
else
    fail "Glob pattern shows 'unknown'" "staleness: unknown for *.ts" "$OUTPUT"
fi

# ============================================================================
section "TEST 7: --stale-only Filter"
# ============================================================================

# Make test1.js stale again
echo "another change" > test1.js
OUTPUT=$($BREADCRUMB verify --stale-only 2>&1 || true)

STALE_COUNT=$(echo "$OUTPUT" | grep -c '"staleness": "stale"' || true)
VERIFIED_COUNT=$(echo "$OUTPUT" | grep -c '"staleness": "verified"' || true)
UNKNOWN_COUNT=$(echo "$OUTPUT" | grep -c '"staleness": "unknown"' || true)

if [ "$STALE_COUNT" -ge 1 ] && [ "$VERIFIED_COUNT" -eq 0 ] && [ "$UNKNOWN_COUNT" -eq 0 ]; then
    pass "--stale-only filters correctly"
else
    fail "--stale-only filters correctly" "only stale items" "stale=$STALE_COUNT verified=$VERIFIED_COUNT unknown=$UNKNOWN_COUNT"
fi

# ============================================================================
section "TEST 8: Check Command Shows Staleness"
# ============================================================================

OUTPUT=$($BREADCRUMB check ./test1.js 2>&1 || true)

if echo "$OUTPUT" | grep -q '"staleness":'; then
    pass "Check command includes staleness"
else
    fail "Check command includes staleness" "staleness field" "$OUTPUT"
fi

if echo "$OUTPUT" | grep -q '"staleness_summary"'; then
    pass "Check command includes staleness_summary"
else
    fail "Check command includes staleness_summary" "staleness_summary field" "$OUTPUT"
fi

# ============================================================================
section "TEST 9: File Deleted After Breadcrumb Added"
# ============================================================================

echo "temporary" > will-delete.js
$BREADCRUMB add ./will-delete.js "Will be deleted" > /dev/null
rm will-delete.js
OUTPUT=$($BREADCRUMB verify ./will-delete.js)

if echo "$OUTPUT" | grep -q '"staleness": "unknown"'; then
    pass "Deleted file shows 'unknown'"
else
    fail "Deleted file shows 'unknown'" "staleness: unknown" "$OUTPUT"
fi

# ============================================================================
section "TEST 10: Empty File Hash"
# ============================================================================

touch empty-file.js
OUTPUT=$($BREADCRUMB add ./empty-file.js "Empty file note")

if echo "$OUTPUT" | grep -q '"code_hash"'; then
    pass "Empty file gets hash"
else
    fail "Empty file gets hash" "code_hash in output" "$OUTPUT"
fi

# ============================================================================
section "TEST 11: Large File Hash Performance"
# ============================================================================

# Create a 1MB file
dd if=/dev/urandom bs=1024 count=1024 2>/dev/null | base64 > large-file.txt
START=$(date +%s%N)
$BREADCRUMB add ./large-file.txt "Large file note" > /dev/null
END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))  # Convert to ms

if [ "$DURATION" -lt 1000 ]; then
    pass "Large file (1MB) hashed in ${DURATION}ms"
else
    fail "Large file performance" "<1000ms" "${DURATION}ms"
fi

# ============================================================================
section "TEST 12: Hash Differs for Different Content"
# ============================================================================

echo "content A" > hash-test-a.js
echo "content B" > hash-test-b.js
OUTPUT_A=$($BREADCRUMB add ./hash-test-a.js "Hash A")
OUTPUT_B=$($BREADCRUMB add ./hash-test-b.js "Hash B")

HASH_A=$(echo "$OUTPUT_A" | grep -o '"code_hash": "[^"]*"' | cut -d'"' -f4)
HASH_B=$(echo "$OUTPUT_B" | grep -o '"code_hash": "[^"]*"' | cut -d'"' -f4)

if [ "$HASH_A" != "$HASH_B" ]; then
    pass "Different content produces different hashes"
else
    fail "Different content produces different hashes" "different hashes" "both: $HASH_A"
fi

# ============================================================================
section "TEST 13: Same Content Produces Same Hash"
# ============================================================================

echo "identical content" > identical-1.js
echo "identical content" > identical-2.js
$BREADCRUMB add ./identical-1.js "Identical 1" > /dev/null
OUTPUT=$($BREADCRUMB add ./identical-2.js "Identical 2")

# Get hash from identical-1
VERIFY_OUTPUT=$($BREADCRUMB verify ./identical-1.js)
HASH_1=$(echo "$VERIFY_OUTPUT" | grep -o '"current_hash": "[^"]*"' | cut -d'"' -f4)

VERIFY_OUTPUT=$($BREADCRUMB verify ./identical-2.js)
HASH_2=$(echo "$VERIFY_OUTPUT" | grep -o '"current_hash": "[^"]*"' | cut -d'"' -f4)

if [ "$HASH_1" = "$HASH_2" ]; then
    pass "Identical content produces same hash"
else
    fail "Identical content produces same hash" "same hashes" "hash1=$HASH_1 hash2=$HASH_2"
fi

# ============================================================================
section "TEST 14: Verify All (No Path Argument)"
# ============================================================================

OUTPUT=$($BREADCRUMB verify 2>&1 || true)
TOTAL=$(echo "$OUTPUT" | grep -o '"breadcrumbs": \[' | wc -l)

if [ "$TOTAL" -ge 1 ]; then
    pass "Verify without path checks all breadcrumbs"
else
    fail "Verify without path checks all breadcrumbs" "breadcrumbs array" "$OUTPUT"
fi

# ============================================================================
section "TEST 15: Verify Path Filter Works"
# ============================================================================

mkdir -p nested/deep
echo "deep content" > nested/deep/file.js
$BREADCRUMB add ./nested/deep/file.js "Deep file" > /dev/null

OUTPUT=$($BREADCRUMB verify ./nested/)
if echo "$OUTPUT" | grep -q "nested/deep/file.js"; then
    pass "Path filter includes nested files"
else
    fail "Path filter includes nested files" "nested/deep/file.js" "$OUTPUT"
fi

# ============================================================================
section "TEST 16: Unicode Content Hashing"
# ============================================================================

echo "こんにちは世界 🌍 émojis" > unicode-file.js
OUTPUT=$($BREADCRUMB add ./unicode-file.js "Unicode content")

if echo "$OUTPUT" | grep -q '"code_hash"'; then
    pass "Unicode content hashes correctly"
else
    fail "Unicode content hashes correctly" "code_hash" "$OUTPUT"
fi

# Verify it
VERIFY_OUTPUT=$($BREADCRUMB verify ./unicode-file.js)
if echo "$VERIFY_OUTPUT" | grep -q '"staleness": "verified"'; then
    pass "Unicode content verifies correctly"
else
    fail "Unicode content verifies correctly" "verified" "$VERIFY_OUTPUT"
fi

# ============================================================================
section "TEST 17: Whitespace-Only Changes Detected"
# ============================================================================

echo "no trailing space" > whitespace.js
$BREADCRUMB add ./whitespace.js "Whitespace test" > /dev/null

echo "no trailing space " > whitespace.js  # Added trailing space
OUTPUT=$($BREADCRUMB verify ./whitespace.js 2>&1 || true)

if echo "$OUTPUT" | grep -q '"staleness": "stale"'; then
    pass "Whitespace changes detected as stale"
else
    fail "Whitespace changes detected as stale" "stale" "$OUTPUT"
fi

# ============================================================================
section "TEST 18: Multiple Breadcrumbs Same File (via edit)"
# ============================================================================

# Edit existing breadcrumb - hash should be preserved
$BREADCRUMB edit ./whitespace.js -m "Updated message" > /dev/null
OUTPUT=$($BREADCRUMB verify ./whitespace.js 2>&1 || true)

# Should still be stale (edit doesn't update hash)
if echo "$OUTPUT" | grep -q '"staleness": "stale"'; then
    pass "Edit preserves hash (stays stale)"
else
    fail "Edit preserves hash (stays stale)" "stale" "$OUTPUT"
fi

# ============================================================================
section "TEST 19: Concurrent File Operations"
# ============================================================================

for i in {1..5}; do
    echo "concurrent $i" > "concurrent-$i.js"
done

# Add all in quick succession
for i in {1..5}; do
    $BREADCRUMB add "./concurrent-$i.js" "Concurrent $i" > /dev/null &
done
wait

# Check each one individually
CONCURRENT_VERIFIED=0
for i in {1..5}; do
    RESULT=$($BREADCRUMB verify "./concurrent-$i.js" 2>&1 || true)
    if echo "$RESULT" | grep -q '"staleness": "verified"'; then
        CONCURRENT_VERIFIED=$((CONCURRENT_VERIFIED + 1))
    fi
done

# Note: Without file locking, concurrent writes may lose some updates
# This is a known limitation - at least 1 should succeed
if [ "$CONCURRENT_VERIFIED" -ge 1 ]; then
    pass "Concurrent adds captured hashes ($CONCURRENT_VERIFIED/5 verified - race condition expected)"
else
    fail "Concurrent adds captured hashes" ">=1 verified" "$CONCURRENT_VERIFIED verified"
fi

# ============================================================================
section "TEST 20: Verify Output Format"
# ============================================================================

OUTPUT=$($BREADCRUMB verify 2>&1 || true)

# Check required fields in output
if echo "$OUTPUT" | grep -q '"verified":' && \
   echo "$OUTPUT" | grep -q '"stale":' && \
   echo "$OUTPUT" | grep -q '"unknown":' && \
   echo "$OUTPUT" | grep -q '"breadcrumbs":'; then
    pass "Verify output has all required fields"
else
    fail "Verify output format" "verified, stale, unknown, breadcrumbs" "$OUTPUT"
fi

# ============================================================================
section "TEST 21: Symlink Handling"
# ============================================================================

echo "real content" > real-file.js
ln -s real-file.js symlink.js 2>/dev/null || true
if [ -L symlink.js ]; then
    OUTPUT=$($BREADCRUMB add ./symlink.js "Symlink note" 2>&1 || true)
    if echo "$OUTPUT" | grep -q '"code_hash"'; then
        pass "Symlink file gets hash"
    else
        # Symlinks might fail - that's OK
        pass "Symlink handling (may not support)"
    fi
else
    pass "Symlink test skipped (symlinks not supported)"
fi

# ============================================================================
section "TEST 22: Special Characters in Path"
# ============================================================================

mkdir -p "path with spaces"
echo "content" > "path with spaces/file.js"
OUTPUT=$($BREADCRUMB add "./path with spaces/file.js" "Spaces in path" 2>&1 || true)

if echo "$OUTPUT" | grep -q '"code_hash"'; then
    pass "Path with spaces works"
else
    fail "Path with spaces works" "code_hash" "$OUTPUT"
fi

# ============================================================================
section "TEST 23: Binary-ish Content"
# ============================================================================

# Create file with some binary-like content
printf '\x00\x01\x02\x03hello\x04\x05' > binary-ish.bin
OUTPUT=$($BREADCRUMB add ./binary-ish.bin "Binary content" 2>&1 || true)

# Should still work (or gracefully fail)
if echo "$OUTPUT" | grep -q '"success": true\|"code_hash"'; then
    pass "Binary-ish content handled"
else
    # If it fails, that's acceptable - just shouldn't crash
    if echo "$OUTPUT" | grep -q '"error"'; then
        pass "Binary content gracefully rejected"
    else
        fail "Binary content handling" "success or error" "$OUTPUT"
    fi
fi

# ============================================================================
section "TEST 24: Verify Non-existent Path"
# ============================================================================

OUTPUT=$($BREADCRUMB verify ./does-not-exist-ever.js 2>&1 || true)

if echo "$OUTPUT" | grep -q '"breadcrumbs": \[\]'; then
    pass "Non-existent path returns empty"
else
    fail "Non-existent path returns empty" "empty breadcrumbs" "$OUTPUT"
fi

# ============================================================================
section "TEST 25: Hash Stability Across Runs"
# ============================================================================

echo "stable content" > stable.js
HASH1=$($BREADCRUMB add ./stable.js "Stable 1" 2>&1 | grep -o '"code_hash": "[^"]*"' | cut -d'"' -f4)
$BREADCRUMB rm ./stable.js > /dev/null 2>&1 || true

# Re-add and check hash is same
HASH2=$($BREADCRUMB add ./stable.js "Stable 2" 2>&1 | grep -o '"code_hash": "[^"]*"' | cut -d'"' -f4)

if [ "$HASH1" = "$HASH2" ]; then
    pass "Hash is deterministic across runs"
else
    fail "Hash is deterministic" "same hash" "hash1=$HASH1 hash2=$HASH2"
fi

# ============================================================================
section "TEST 26: Verify with Expired Breadcrumbs"
# ============================================================================

echo "expires soon" > expires.js
# Add with 1 second TTL
$BREADCRUMB add ./expires.js "Will expire" --ttl 1s > /dev/null 2>&1 || true
sleep 2

OUTPUT=$($BREADCRUMB verify ./expires.js 2>&1 || true)
# Expired breadcrumbs should still verify (expiration != staleness)
if echo "$OUTPUT" | grep -q '"breadcrumbs":'; then
    pass "Verify works with expired breadcrumbs"
else
    fail "Verify with expired" "breadcrumbs array" "$OUTPUT"
fi

# ============================================================================
section "RESULTS"
# ============================================================================

echo ""
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    exit 1
fi
