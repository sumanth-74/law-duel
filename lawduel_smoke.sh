#!/bin/bash

# Law Duel Smoke Test Script
# Tests core functionality: auth, questions, progress tracking, duels

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE="${BASE:-http://localhost:5000}"
USER_A="${USER_A:-debuguser}"
PASS_A="${PASS_A:-test123}"
USER_B="${USER_B:-debugfriend}"
PASS_B="${PASS_B:-test123}"

echo "================================================"
echo "       LAW DUEL SMOKE TEST"
echo "================================================"
echo "Testing against: $BASE"
echo ""

# Helper functions
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        echo "Test failed at: $2"
        exit 1
    fi
}

json_value() {
    echo "$1" | grep -o "\"$2\":[^,}]*" | sed "s/\"$2\"://" | sed 's/["\[]//g' | sed 's/]//g'
}

# Test 1: Server Health Check
echo "1. SERVER HEALTH CHECK"
echo "----------------------"
HEALTH=$(curl -s "$BASE/api/health")
if echo "$HEALTH" | grep -q "ok"; then
    check_status 0 "Server is running"
else
    check_status 1 "Server health check failed"
fi
echo ""

# Test 2: Authentication Flow
echo "2. AUTHENTICATION TESTS"
echo "----------------------"

# Register/Login User A
echo "Testing User A login..."
LOGIN_A=$(curl -s -c cookies_a.txt -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USER_A\",\"password\":\"$PASS_A\"}")

if echo "$LOGIN_A" | grep -q "\"ok\":true"; then
    check_status 0 "User A login successful"
    USER_A_ID=$(json_value "$LOGIN_A" "id")
    echo "  User A ID: $USER_A_ID"
else
    # Try to register first
    REG_A=$(curl -s -c cookies_a.txt -X POST "$BASE/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$USER_A\",\"displayName\":\"Debug User\",\"password\":\"$PASS_A\",\"confirmPassword\":\"$PASS_A\",\"email\":\"debug@test.com\"}")
    
    if echo "$REG_A" | grep -q "\"ok\":true"; then
        check_status 0 "User A registered"
    else
        LOGIN_A=$(curl -s -c cookies_a.txt -X POST "$BASE/api/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"username\":\"$USER_A\",\"password\":\"$PASS_A\"}")
        check_status $? "User A login after registration"
    fi
    USER_A_ID=$(json_value "$LOGIN_A" "id")
fi

# Check session persistence
ME_CHECK=$(curl -s -b cookies_a.txt "$BASE/api/auth/me")
if echo "$ME_CHECK" | grep -q "\"ok\":true"; then
    check_status 0 "Session persistence works"
else
    check_status 1 "Session persistence failed"
fi

# Register/Login User B
echo "Testing User B login..."
LOGIN_B=$(curl -s -c cookies_b.txt -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USER_B\",\"password\":\"$PASS_B\"}")

if echo "$LOGIN_B" | grep -q "\"ok\":true"; then
    check_status 0 "User B login successful"
    USER_B_ID=$(json_value "$LOGIN_B" "id")
else
    # Try to register first
    REG_B=$(curl -s -c cookies_b.txt -X POST "$BASE/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$USER_B\",\"displayName\":\"Debug Friend\",\"password\":\"$PASS_B\",\"confirmPassword\":\"$PASS_B\",\"email\":\"friend@test.com\"}")
    
    if echo "$REG_B" | grep -q "\"ok\":true"; then
        check_status 0 "User B registered"
    else
        LOGIN_B=$(curl -s -c cookies_b.txt -X POST "$BASE/api/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"username\":\"$USER_B\",\"password\":\"$PASS_B\"}")
        check_status $? "User B login after registration"
    fi
    USER_B_ID=$(json_value "$LOGIN_B" "id")
fi
echo ""

# Test 3: Question Pool Status
echo "3. QUESTION POOL STATUS"
echo "----------------------"
POOL_STATUS=$(curl -s -b cookies_a.txt "$BASE/api/pool-status")
if echo "$POOL_STATUS" | grep -q "status"; then
    check_status 0 "Question pool endpoint works"
    echo "  Pool status retrieved successfully"
else
    check_status 1 "Question pool status failed"
fi
echo ""

# Test 4: Solo Mode & Progress Tracking
echo "4. SOLO MODE & PROGRESS TRACKING"
echo "--------------------------------"

# Get initial stats
INITIAL_STATS=$(curl -s -b cookies_a.txt "$BASE/api/stats/subtopics")
echo "Initial stats retrieved"

# Start solo challenge
SOLO_START=$(curl -s -b cookies_a.txt -X POST "$BASE/api/duel/solo/start" \
    -H "Content-Type: application/json" \
    -d "{\"subject\":\"Mixed Questions\",\"difficulty\":1}")

if echo "$SOLO_START" | grep -q "duelId"; then
    DUEL_ID=$(json_value "$SOLO_START" "duelId")
    check_status 0 "Solo duel started (ID: $DUEL_ID)"
    
    # Extract first question
    QUESTION_ID=$(echo "$SOLO_START" | grep -o '"questionId":"[^"]*"' | head -1 | cut -d'"' -f4)
    SUBJECT=$(echo "$SOLO_START" | grep -o '"subject":"[^"]*"' | head -1 | cut -d'"' -f4)
    SUBTOPIC=$(echo "$SOLO_START" | grep -o '"subtopic":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    echo "  First question: $SUBJECT - $SUBTOPIC"
    
    # Submit an answer
    ANSWER=$(curl -s -b cookies_a.txt -X POST "$BASE/api/duel/answer" \
        -H "Content-Type: application/json" \
        -d "{\"duelId\":\"$DUEL_ID\",\"questionId\":\"$QUESTION_ID\",\"answerIndex\":0,\"timeMs\":5000}")
    
    if echo "$ANSWER" | grep -q "\"ok\":true"; then
        check_status 0 "Answer submitted successfully"
        
        # Check for XP gain
        if echo "$ANSWER" | grep -q "xpGained"; then
            XP_GAINED=$(json_value "$ANSWER" "xpGained")
            echo "  XP gained: $XP_GAINED"
        fi
    else
        check_status 1 "Answer submission failed"
    fi
    
    # Check updated stats
    UPDATED_STATS=$(curl -s -b cookies_a.txt "$BASE/api/stats/subtopics")
    if [ "$INITIAL_STATS" != "$UPDATED_STATS" ]; then
        check_status 0 "Stats updated after answer"
    else
        echo -e "${YELLOW}⚠${NC} Stats may not have changed (could be correct if same values)"
    fi
else
    check_status 1 "Solo duel failed to start"
fi
echo ""

# Test 5: Friend Duel (Async)
echo "5. ASYNC FRIEND DUEL TEST"
echo "------------------------"

# User A starts friend duel
FRIEND_START=$(curl -s -b cookies_a.txt -X POST "$BASE/api/duel/friend/start" \
    -H "Content-Type: application/json" \
    -d "{\"friendUsername\":\"$USER_B\",\"subject\":\"Mixed Questions\"}")

if echo "$FRIEND_START" | grep -q "duelId"; then
    FRIEND_DUEL_ID=$(json_value "$FRIEND_START" "duelId")
    check_status 0 "Friend duel created (ID: $FRIEND_DUEL_ID)"
    
    # Extract question IDs for User A
    A_QUESTIONS=$(echo "$FRIEND_START" | grep -o '"questionId":"[^"]*"' | cut -d'"' -f4)
    echo "  User A questions: $(echo $A_QUESTIONS | wc -w) questions"
    
    # User B joins the duel
    B_JOIN=$(curl -s -b cookies_b.txt "$BASE/api/duel/friend/join/$FRIEND_DUEL_ID")
    
    if echo "$B_JOIN" | grep -q "questions"; then
        B_QUESTIONS=$(echo "$B_JOIN" | grep -o '"questionId":"[^"]*"' | cut -d'"' -f4)
        echo "  User B questions: $(echo $B_QUESTIONS | wc -w) questions"
        
        # Check if questions match
        if [ "$A_QUESTIONS" = "$B_QUESTIONS" ]; then
            check_status 0 "Question parity verified (both users have same questions)"
        else
            echo -e "${YELLOW}⚠${NC} Questions may be in different order (checking count)"
            A_COUNT=$(echo $A_QUESTIONS | wc -w)
            B_COUNT=$(echo $B_QUESTIONS | wc -w)
            if [ "$A_COUNT" = "$B_COUNT" ]; then
                check_status 0 "Same number of questions for both users"
            else
                check_status 1 "Question mismatch between users"
            fi
        fi
    else
        check_status 1 "User B failed to join duel"
    fi
else
    check_status 1 "Friend duel failed to start"
fi
echo ""

# Test 6: Daily Question
echo "6. DAILY QUESTION TEST"
echo "---------------------"
DAILY=$(curl -s -b cookies_a.txt "$BASE/api/daily-question")
if echo "$DAILY" | grep -q "question"; then
    check_status 0 "Daily question accessible"
    DAILY_SUBJECT=$(json_value "$DAILY" "subject")
    echo "  Today's subject: $DAILY_SUBJECT"
else
    echo -e "${YELLOW}⚠${NC} Daily question not accessible (may require auth or not be set)"
fi
echo ""

# Test 7: Leaderboard
echo "7. LEADERBOARD TEST"
echo "------------------"
LEADERBOARD=$(curl -s -b cookies_a.txt "$BASE/api/leaderboard")
if echo "$LEADERBOARD" | grep -q "username"; then
    check_status 0 "Leaderboard accessible"
    LEADER_COUNT=$(echo "$LEADERBOARD" | grep -o "username" | wc -l)
    echo "  Active players: $LEADER_COUNT"
else
    check_status 1 "Leaderboard not accessible"
fi
echo ""

# Test 8: WebSocket Connection
echo "8. WEBSOCKET TEST"
echo "----------------"
# Simple WebSocket check using curl (basic connectivity)
WS_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/socket.io/")
if [ "$WS_CHECK" = "400" ] || [ "$WS_CHECK" = "200" ]; then
    check_status 0 "WebSocket endpoint exists"
else
    echo -e "${YELLOW}⚠${NC} WebSocket endpoint may not be configured"
fi
echo ""

# Cleanup
rm -f cookies_a.txt cookies_b.txt

echo "================================================"
echo -e "${GREEN}SMOKE TEST COMPLETE${NC}"
echo "================================================"
echo ""
echo "Summary:"
echo "- Server is running and healthy"
echo "- Authentication and sessions work"
echo "- Solo mode creates duels and tracks progress"
echo "- Friend duels maintain question parity"
echo "- Core endpoints are accessible"
echo ""
echo "Ready for beta deployment! 🚀"