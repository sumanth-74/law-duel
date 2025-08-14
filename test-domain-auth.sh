#!/bin/bash

echo "==================================="
echo "Testing Authentication on Both Domains"
echo "==================================="

# Test 1: Replit Domain
echo -e "\n1. Testing on Replit domain (law-duel-savannah41.replit.app):"
echo "----------------------------------------------"

# Login on Replit domain
echo "Logging in..."
curl -c replit_cookies.txt -s -X POST https://law-duel-savannah41.replit.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"testuser","password":"testpass123"}' | jq '.ok'

# Check session on Replit domain
echo "Checking session..."
curl -b replit_cookies.txt -s https://law-duel-savannah41.replit.app/api/auth/me | jq '.ok'

# Test 2: Custom Domain
echo -e "\n2. Testing on custom domain (lawduel.net):"
echo "----------------------------------------------"

# Login on custom domain
echo "Logging in..."
curl -c custom_cookies.txt -s -X POST https://lawduel.net/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"testuser","password":"testpass123"}' | jq '.ok'

# Check session on custom domain
echo "Checking session..."
curl -b custom_cookies.txt -s https://lawduel.net/api/auth/me | jq '.ok'

echo -e "\n==================================="
echo "Cookie Comparison:"
echo "==================================="
echo "Replit domain cookies:"
cat replit_cookies.txt | grep sid
echo ""
echo "Custom domain cookies:"
cat custom_cookies.txt | grep sid