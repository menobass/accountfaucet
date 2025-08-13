# Hive Account Faucet - Backend

## 🎯 Purpose
Backend service that streams Hive blocks, detects signed custom_json requests (ID: `hive_account_faucet`) from authorized sponsor accounts, creates real Hive accounts using Account Creation Tokens (ACTs), and securely delivers credentials via email, encrypted memo, or both.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Setup
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# - Add your Hive account credentials
# - Configure database connection
# - Set up email service (optional)
```

### 3. Run the Service
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## 📡 How It Works

### Blockchain Monitoring
- Streams Hive blockchain blocks continuously (resumes from `data/last_block.json` after restarts)
- Filters for custom JSON ops with ID `hive_account_faucet`
- Parses + validates payload (structure, version, action)
- Authorization enforced via `backend/data/authorized_users.json` (tokens allocated / used)

### Request Processing
1. Validation & authorization
2. Secure master password + key derivation
3. Real `create_claimed_account` broadcast (consumes ACT)
4. Store credentials temporarily in `pending_credentials.json` (recovery safety)
5. Delivery:
	- Email (registered email from authorization data)
	- Encrypted memo (hive-js transfer of 0.001 HBD with encrypted memo) 
	- Both (requires both to succeed before token deduction)
6. On success: remove from pending store & deduct token
7. On failure: credentials remain in pending store for manual recovery (prevents “lost” accounts)

## 🔧 API Endpoints

### Health Check
```
GET /health
```
Returns service status and monitoring information.

### Status
```
GET /status  
```
Returns detailed operational status.

### Manual Control
```
POST /monitor/start  # Start blockchain monitoring
POST /monitor/stop   # Stop blockchain monitoring
```

## ⚙️ Configuration

### Environment Variables (see `.env.example`)
Mandatory for account creation & memo:
```
CREATING_ACCOUNT_USERNAME=
CREATING_ACCOUNT_ACTIVE_KEY=
CREATING_ACCOUNT_MEMO_KEY=
```
Recommended (email delivery):
```
EMAIL_HOST=
EMAIL_PORT=
EMAIL_SECURE=
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=
```
Optional tuning:
```
HIVE_NODE_URL=
BLOCK_SAVE_INTERVAL=
PORT=3000
```

## 🔍 Monitoring

### Console Output
The service provides detailed console logging:
- Block processing progress
- Custom JSON detection
- Request processing status
- Error reporting

### Status Endpoints
Monitor service health via HTTP endpoints for integration with monitoring tools.

## 🏗️ Current Implementation Status

### ✅ Implemented
- [x] Continuous block streaming
- [x] Resume from persisted last block
- [x] Custom JSON detection & validation
- [x] Authorization + token usage (JSON store)
- [x] Real ACT-based account creation (`create_claimed_account`)
- [x] Secure memo encryption (hive-js, # prefix)
- [x] Email delivery (Nodemailer)
- [x] Dual delivery mode (“both” requires both success)
- [x] Pending credential recovery store

### 🚧 Planned / Hardening
- [ ] Rate limiting (per sponsor)
- [ ] Structured JSON logging output option
- [ ] Endpoint auth (`API_AUTH_KEY` enforcement)
- [ ] Automated cleanup of stale pending credentials
- [ ] Optional database persistence
- [ ] Metrics / Prometheus export

## 🧪 Testing

### Local Testing
1. Start the backend service
2. Use the frontend to submit a test request
3. Watch console output for request detection

### Manual Testing
```bash
# Check if service is running
curl http://localhost:3000/health

# Check detailed status
curl http://localhost:3000/status
```

## � Security Notes
- Never commit real keys (.env is gitignored)
- `pending_credentials.json` is transient; remove entries promptly after manual recovery if needed
- Requires faucet account to maintain minimal HBD (≥ 0.001) for memo transfers
- For production, run behind HTTPS reverse proxy and enable firewall rules

## 🛠 Recovery
If a delivery fails, inspect `backend/data/pending_credentials.json` for the account credentials and re-deliver manually (or re-run delivery once issue fixed). Remove the entry after manual handling.

---

**Note**: This README reflects the current implemented feature set; update alongside feature changes.
