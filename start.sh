#!/bin/bash
# start.sh — launches the entire Smart Gym Trainer with one command

echo "🏋️  Starting Smart Gym Trainer..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR=~/Documents/smart-gym-trainer
DROIDCAM_IP="192.168.1.39"
DROIDCAM_PORT="4747"

# ── Step 1: DroidCam ─────────────────────────────────────────────────
echo -e "${YELLOW}[1/4] Connecting DroidCam...${NC}"
echo "      Make sure DroidCam app is open on your phone!"
droidcam-cli $DROIDCAM_IP $DROIDCAM_PORT &
DROIDCAM_PID=$!
sleep 3
echo -e "${GREEN}      DroidCam connected (PID: $DROIDCAM_PID)${NC}"

# ── Step 2: FastAPI backend ──────────────────────────────────────────
echo -e "${YELLOW}[2/4] Starting FastAPI backend...${NC}"
cd $PROJECT_DIR
source venv/bin/activate
uvicorn backend.main:app --port 8000 &
BACKEND_PID=$!
sleep 2
echo -e "${GREEN}      Backend running on http://localhost:8000${NC}"

# ── Step 3: React dashboard ──────────────────────────────────────────
echo -e "${YELLOW}[3/4] Starting React dashboard...${NC}"
cd $PROJECT_DIR/frontend
npm start &
FRONTEND_PID=$!
sleep 5
echo -e "${GREEN}      Dashboard running on http://localhost:3000${NC}"

# ── Step 4: Open browser ─────────────────────────────────────────────
echo -e "${YELLOW}[4/4] Opening dashboard in browser...${NC}"
xdg-open http://localhost:3000 &
sleep 2

# ── Step 5: Start trainer ────────────────────────────────────────────
echo ""
echo -e "${GREEN}✅ Everything is running!${NC}"
echo ""
echo "  Dashboard : http://localhost:3000"
echo "  API docs  : http://localhost:8000/docs"
echo ""
echo -e "${BLUE}Starting trainer app... (Press Q inside window to quit)${NC}"
echo ""

cd $PROJECT_DIR
source venv/bin/activate
python trainer.py

# ── Cleanup on exit ──────────────────────────────────────────────────
echo ""
echo "🛑 Shutting down all services..."
kill $DROIDCAM_PID  2>/dev/null
kill $BACKEND_PID   2>/dev/null
kill $FRONTEND_PID  2>/dev/null
pkill -f "uvicorn"  2>/dev/null
pkill -f "npm start" 2>/dev/null
echo "✅ All services stopped."


# Instructions to run the app:

# cd ~/Documents/smart-gym-trainer
# chmod +x start.sh

# cd ~/Documents/smart-gym-trainer
# source venv/bin/activate
# ./start.sh