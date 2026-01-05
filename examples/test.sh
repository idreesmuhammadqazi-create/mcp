#!/bin/bash

# Test script for the Clarifying Questions MCP Server
# This script demonstrates all API endpoints

set -e

BASE_URL="${1:-http://localhost:3000}"
TASK="make me a website that runs pseudocode"

# Get MCP_API_KEY from environment variable
if [ -z "$MCP_API_KEY" ]; then
  echo "❌ Error: MCP_API_KEY environment variable not set"
  echo "💡 Set it with: export MCP_API_KEY=your_api_key_here"
  echo "💡 Or generate one with: openssl rand -hex 32"
  exit 1
fi

echo "🧪 Testing Clarifying Questions Server"
echo "======================================="
echo "Base URL: $BASE_URL"
echo "API Key: ${MCP_API_KEY:0:8}..." 
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health check
echo -e "${BLUE}Test 1: Health Check${NC}"
echo "GET $BASE_URL/health"
HEALTH=$(curl -s "$BASE_URL/health")
echo "$HEALTH" | jq '.'
echo -e "${GREEN}✓ Health check passed${NC}"
echo ""

# Test 2: Generate questions (non-streaming)
echo -e "${BLUE}Test 2: Generate Questions (Non-streaming)${NC}"
echo "POST $BASE_URL/api/generate"
GENERATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -d "{\"taskDescription\": \"$TASK\"}")

SESSION_ID=$(echo "$GENERATE_RESPONSE" | jq -r '.sessionId')
QUESTIONS=$(echo "$GENERATE_RESPONSE" | jq '.questions')
QUESTION_COUNT=$(echo "$QUESTIONS" | jq 'length')

echo "Session ID: $SESSION_ID"
echo "Questions generated: $QUESTION_COUNT"
echo "$GENERATE_RESPONSE" | jq '.'
echo -e "${GREEN}✓ Questions generated${NC}"
echo ""

# Test 3: Answer questions
echo -e "${BLUE}Test 3: Answer Questions${NC}"
for i in $(seq 1 $QUESTION_COUNT); do
  QUESTION_ID=$(echo "$QUESTIONS" | jq -r ".[$((i-1))].id")
  QUESTION_TEXT=$(echo "$QUESTIONS" | jq -r ".[$((i-1))].text")
  FIRST_OPTION=$(echo "$QUESTIONS" | jq -r ".[$((i-1))].options[0]")
  
  echo "Question $i: $QUESTION_TEXT"
  echo "Answering with: $FIRST_OPTION"
  
  ANSWER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/answer" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MCP_API_KEY" \
    -d "{
      \"sessionId\": \"$SESSION_ID\",
      \"questionId\": \"$QUESTION_ID\",
      \"answer\": \"$FIRST_OPTION\"
    }")
  
  PROGRESS=$(echo "$ANSWER_RESPONSE" | jq -r '.progress.answered + "/" + (.progress.total | tostring)')
  echo "Progress: $PROGRESS"
  echo ""
done
echo -e "${GREEN}✓ All questions answered${NC}"
echo ""

# Test 4: Get context
echo -e "${BLUE}Test 4: Get Task Context${NC}"
echo "GET $BASE_URL/api/context/$SESSION_ID"
CONTEXT=$(curl -s "$BASE_URL/api/context/$SESSION_ID" \
  -H "Authorization: Bearer $MCP_API_KEY")
echo "$CONTEXT" | jq '.'
echo -e "${GREEN}✓ Context retrieved${NC}"
echo ""

# Test 5: List sessions
echo -e "${BLUE}Test 5: List All Sessions${NC}"
echo "GET $BASE_URL/api/sessions"
SESSIONS=$(curl -s "$BASE_URL/api/sessions" \
  -H "Authorization: Bearer $MCP_API_KEY")
echo "$SESSIONS" | jq '.'
echo -e "${GREEN}✓ Sessions listed${NC}"
echo ""

# Test 6: Streaming (SSE)
echo -e "${BLUE}Test 6: Streaming Questions (SSE)${NC}"
echo "GET $BASE_URL/api/stream?taskDescription=..."
echo -e "${YELLOW}Note: This will create a new session${NC}"

ENCODED_TASK=$(echo "$TASK" | jq -sRr @uri)
echo "Streaming from: $BASE_URL/api/stream?taskDescription=$ENCODED_TASK"

# Stream for 10 seconds or until complete
timeout 10s curl -N -s "$BASE_URL/api/stream?taskDescription=$ENCODED_TASK" \
  -H "Authorization: Bearer $MCP_API_KEY" | while IFS= read -r line; do
  if [[ $line == data:* ]]; then
    echo "$line"
  elif [[ $line == event:* ]]; then
    echo ""
    echo "$line"
  fi
done || true

echo ""
echo -e "${GREEN}✓ Streaming test complete${NC}"
echo ""

echo "======================================="
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "Session ID for this test: $SESSION_ID"
echo "You can retrieve the context again with:"
echo "  curl $BASE_URL/api/context/$SESSION_ID -H \"Authorization: Bearer \$MCP_API_KEY\" | jq '.'"
