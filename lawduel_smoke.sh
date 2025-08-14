#!/bin/bash

# Law Duel Smoke Test Script
# Usage: BASE="https://your-app.replit.app" ./lawduel_smoke.sh
# Or: USER_A="user" PASS_A="pass" USER_B="friend" PASS_B="pass" BASE="url" ./lawduel_smoke.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
BASE=${BASE:-"http://localhost:5000"}
USER_A=${USER_A:-"smoketest_a"}
PASS_A=${PASS_A:-"test123"}
USER_B=${USER_B:-"smoketest_b"}
PASS_B=${PASS_B:-"test123"}
EMAIL_A="smoke_a_$(date +%s)@test.com"
EMAIL_B="smoke_b_$(date +%s)@test.com"

echo "==========================================="
echo "    Law Duel Smoke Test Suite"
echo "==========================================="
echo "Testing against: $BASE"
echo ""

# Track test results
PASSED=0
FAILED=0

# Helper function for test output
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $2"
        echo "  $3"
        ((FAILED++))
    fi
}

# Helper to check JSON field exists
check_json_field() {
    echo "$1" | grep -q "\"$2\""
}

# Clean up old test users if they exist
echo "Cleaning up test environment..."

# 1. Register User A
echo ""
echo "Test 1: Register User A"
REGISTER_A=$(curl -s -c cookies_a.txt -X POST "$BASE/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USER_A\",\"password\":\"$PASS_A\",\"confirmPassword\":\"$PASS_A\",\"email\":\"$EMAIL_A\",\"displayName\":\"Test User A\"}")

if check_json_field "$REGISTER_A" "user"; then
    test_result 0 "User A registered successfully"
    USER_A_ID=$(echo "$REGISTER_A" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
else
    # Try to login if already exists
    LOGIN_A=$(curl -s -b cookies_a.txt -c cookies_a.txt -X POST "$BASE/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$USER_A\",\"password\":\"$PASS_A\"}")
    
    if check_json_field "$LOGIN_A" "user"; then
        test_result 0 "User A logged in (already exists)"
        USER_A_ID=$(echo "$LOGIN_A" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    else
        test_result 1 "Failed to register/login User A" "$REGISTER_A"
    fi
fi

# 2. Check User A is authenticated
echo ""
echo "Test 2: Verify User A authentication"
AUTH_CHECK=$(curl -s -b cookies_a.txt "$BASE/api/auth/me")
if check_json_field "$AUTH_CHECK" "user"; then
    test_result 0 "User A authenticated"
else
    test_result 1 "User A not authenticated" "$AUTH_CHECK"
fi

# 3. Start Solo Duel for User A
echo ""
echo "Test 3: Start Solo Duel"
SOLO_START=$(curl -s -b cookies_a.txt -X POST "$BASE/api/duel/solo/start" \
    -H "Content-Type: application/json" \
    -d '{"subject":"Contracts"}')

if check_json_field "$SOLO_START" "duelId" && check_json_field "$SOLO_START" "questions"; then
    test_result 0 "Solo duel started successfully"
    DUEL_ID=$(echo "$SOLO_START" | grep -o '"duelId":"[^"]*' | cut -d'"' -f4)
    echo "  Duel ID: $DUEL_ID"
    
    # Check if questions have required fields
    if check_json_field "$SOLO_START" "questionId" && check_json_field "$SOLO_START" "subject" && check_json_field "$SOLO_START" "subtopic"; then
        test_result 0 "Questions have required fields (questionId, subject, subtopic)"
    else
        test_result 1 "Questions missing required fields" "$SOLO_START"
    fi
else
    test_result 1 "Failed to start solo duel" "$SOLO_START"
    DUEL_ID=""
fi

# 4. Submit Answer to Solo Duel
if [ ! -z "$DUEL_ID" ]; then
    echo ""
    echo "Test 4: Submit Answer to Solo Duel"
    ANSWER_RESP=$(curl -s -b cookies_a.txt -X POST "$BASE/api/duel/answer" \
        -H "Content-Type: application/json" \
        -d "{\"duelId\":\"$DUEL_ID\",\"answerIndex\":0,\"responseTime\":5000}")
    
    if check_json_field "$ANSWER_RESP" "ok" && check_json_field "$ANSWER_RESP" "xpGained" && check_json_field "$ANSWER_RESP" "masteryDelta"; then
        test_result 0 "Answer accepted with XP and mastery delta"
        
        # Check mastery delta structure
        if check_json_field "$ANSWER_RESP" "subtopicId" && check_json_field "$ANSWER_RESP" "before" && check_json_field "$ANSWER_RESP" "after"; then
            test_result 0 "Mastery delta has correct structure"
        else
            test_result 1 "Mastery delta missing fields" "$ANSWER_RESP"
        fi
    else
        test_result 1 "Answer submission failed or missing fields" "$ANSWER_RESP"
    fi
fi

# 5. Check Stats/Subtopics
echo ""
echo "Test 5: Get Subtopic Stats"
STATS=$(curl -s -b cookies_a.txt "$BASE/api/stats/subtopics")
if echo "$STATS" | grep -q "subject" && echo "$STATS" | grep -q "subtopics"; then
    test_result 0 "Stats endpoint returns subjects with subtopics"
    
    # Check if subtopics have attempts field
    if check_json_field "$STATS" "attempts"; then
        test_result 0 "Subtopics include attempts counter"
    else
        test_result 1 "Subtopics missing attempts field" "$STATS"
    fi
else
    test_result 1 "Stats endpoint failed" "$STATS"
fi

# 6. Register User B
echo ""
echo "Test 6: Register User B"
REGISTER_B=$(curl -s -c cookies_b.txt -X POST "$BASE/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USER_B\",\"password\":\"$PASS_B\",\"confirmPassword\":\"$PASS_B\",\"email\":\"$EMAIL_B\",\"displayName\":\"Test User B\"}")

if check_json_field "$REGISTER_B" "user"; then
    test_result 0 "User B registered successfully"
    USER_B_ID=$(echo "$REGISTER_B" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
else
    # Try to login if already exists
    LOGIN_B=$(curl -s -b cookies_b.txt -c cookies_b.txt -X POST "$BASE/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$USER_B\",\"password\":\"$PASS_B\"}")
    
    if check_json_field "$LOGIN_B" "user"; then
        test_result 0 "User B logged in (already exists)"
        USER_B_ID=$(echo "$LOGIN_B" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    else
        test_result 1 "Failed to register/login User B" "$REGISTER_B"
    fi
fi

# 7. Start Async Duel (User A vs User B)
echo ""
echo "Test 7: Start Async Duel"
ASYNC_START=$(curl -s -b cookies_a.txt -X POST "$BASE/api/duel/async/start" \
    -H "Content-Type: application/json" \
    -d "{\"subject\":\"Torts\",\"opponentUsername\":\"$USER_B\"}")

if check_json_field "$ASYNC_START" "duelId" && check_json_field "$ASYNC_START" "questions"; then
    test_result 0 "Async duel started successfully"
    ASYNC_DUEL_ID=$(echo "$ASYNC_START" | grep -o '"duelId":"[^"]*' | cut -d'"' -f4)
    echo "  Async Duel ID: $ASYNC_DUEL_ID"
    
    # Store questions for comparison
    ASYNC_QUESTIONS_A="$ASYNC_START"
else
    test_result 1 "Failed to start async duel" "$ASYNC_START"
    ASYNC_DUEL_ID=""
fi

# 8. User B fetches the same async duel
if [ ! -z "$ASYNC_DUEL_ID" ]; then
    echo ""
    echo "Test 8: User B fetches async duel"
    ASYNC_FETCH_B=$(curl -s -b cookies_b.txt "$BASE/api/duel/async/$ASYNC_DUEL_ID")
    
    if check_json_field "$ASYNC_FETCH_B" "questions"; then
        test_result 0 "User B can fetch async duel"
        
        # Compare question IDs to ensure parity
        QUESTIONS_A_IDS=$(echo "$ASYNC_QUESTIONS_A" | grep -o '"questionId":"[^"]*"' | sort)
        QUESTIONS_B_IDS=$(echo "$ASYNC_FETCH_B" | grep -o '"questionId":"[^"]*"' | sort)
        
        if [ "$QUESTIONS_A_IDS" = "$QUESTIONS_B_IDS" ]; then
            test_result 0 "Async parity OK: both players have same question set"
        else
            test_result 1 "Async parity FAILED: different questions for A and B" "A: $QUESTIONS_A_IDS\nB: $QUESTIONS_B_IDS"
        fi
    else
        test_result 1 "User B cannot fetch async duel" "$ASYNC_FETCH_B"
    fi
fi

# 9. Both users submit answers to async duel
if [ ! -z "$ASYNC_DUEL_ID" ]; then
    echo ""
    echo "Test 9: Submit async answers"
    
    # User A answers
    ASYNC_ANSWER_A=$(curl -s -b cookies_a.txt -X POST "$BASE/api/duel/async/answer" \
        -H "Content-Type: application/json" \
        -d "{\"duelId\":\"$ASYNC_DUEL_ID\",\"answerIndex\":1,\"responseTime\":3000}")
    
    if check_json_field "$ASYNC_ANSWER_A" "ok"; then
        test_result 0 "User A submitted async answer"
    else
        test_result 1 "User A failed to submit async answer" "$ASYNC_ANSWER_A"
    fi
    
    # User B answers
    ASYNC_ANSWER_B=$(curl -s -b cookies_b.txt -X POST "$BASE/api/duel/async/answer" \
        -H "Content-Type: application/json" \
        -d "{\"duelId\":\"$ASYNC_DUEL_ID\",\"answerIndex\":2,\"responseTime\":4000}")
    
    if check_json_field "$ASYNC_ANSWER_B" "ok"; then
        test_result 0 "User B submitted async answer"
    else
        test_result 1 "User B failed to submit async answer" "$ASYNC_ANSWER_B"
    fi
fi

# 10. Check duel result endpoint
if [ ! -z "$ASYNC_DUEL_ID" ]; then
    echo ""
    echo "Test 10: Get duel result"
    DUEL_RESULT=$(curl -s -b cookies_a.txt "$BASE/api/duel/result/$ASYNC_DUEL_ID")
    
    if check_json_field "$DUEL_RESULT" "winnerId" && check_json_field "$DUEL_RESULT" "yourScore" && \
       check_json_field "$DUEL_RESULT" "oppScore" && check_json_field "$DUEL_RESULT" "eloDelta" && \
       check_json_field "$DUEL_RESULT" "xpGained"; then
        test_result 0 "Duel result endpoint responded with all fields"
        echo "  Result: $DUEL_RESULT"
    else
        test_result 1 "Duel result missing required fields" "$DUEL_RESULT"
    fi
fi

# Clean up
rm -f cookies_a.txt cookies_b.txt

# Summary
echo ""
echo "==========================================="
echo "Test Summary"
echo "==========================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed. Review the output above.${NC}"
    exit 1
fi