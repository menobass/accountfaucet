# 🚰 Hive Account Faucet

A free service that allows business owners to create Hive accounts for their customers using account creation tokens, eliminating the 3 HIVE fee barrier for new users.

## 🎯 Project Overview

This tool solves a common problem for businesses onboarding customers to Hive: the initial 3 HIVE account creation fee can be a significant barrier for small businesses and their customers. By using account creation tokens from larger Hive accounts, businesses can create accounts for their customers at no cost.

### Key Benefits
- **Free account creation** for business customers
- **Simple request process** via web interface
- **Secure credential delivery** via email or encrypted memo
- **Fast processing** (typically 5-10 minutes)
- **No technical knowledge required** for business owners

## 🏗️ Architecture

The system is split into two main components:

### Frontend (Static Website)
- **Technology**: HTML5, CSS3, Vanilla JavaScript
- **Hosting**: GitHub Pages
- **Purpose**: User-friendly interface for account creation requests
- **Location**: `/frontend/` directory

### Backend (Node.js Service)
- **Technology**: Node.js, Express, @hiveio/dhive, @hiveio/hive-js (encrypted memos)
- **Purpose**: Stream blocks, detect signed custom_json requests, create accounts using ACTs, deliver credentials (email / encrypted memo / both)
- **Location**: `/backend/` directory

## 🚀 Quick Start

### Frontend Only (Static Website)
```bash
# Clone the repository
git clone <repository-url>
cd accountfaucet/frontend

# Serve locally
python -m http.server 8000
# or
npx http-server -p 8000

# Open browser
open http://localhost:8000
```

### Full Stack Development
```bash
# Start backend
cd backend
npm install
npm start

# Start frontend (in another terminal)
cd frontend
python -m http.server 8000
```

## 📁 Project Structure

```
accountfaucet/
├── frontend/                 # Static website
│   ├── index.html           # Main request form
│   ├── styles/              # CSS files
│   ├── scripts/             # JavaScript modules
│   └── README.md            # Frontend documentation
├── backend/                 # Node.js API service
│   ├── server.js            # Main server file
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── middleware/          # Express middleware
│   ├── config/              # Configuration files
│   └── README.md            # Backend documentation
├── docs/                    # Project documentation
│   └── PROJECT_PLAN.md      # Detailed project plan
├── .github/                 # GitHub configuration
│   └── copilot-instructions.md
└── README.md                # This file
```

## 🎨 Features

### User Interface
- 📱 **Responsive design** for all devices
- ✅ **Real-time validation** with helpful feedback
- 🔄 **Status tracking** with live updates
- 🎯 **Intuitive form** design
- ♿ **Accessibility** compliant (WCAG)

### Account Creation
- 🆓 **Free service** using Account Creation Tokens (ACTs)
- 🔑 **Deterministic key derivation** from secure master password
- 📧 **Email delivery** (registered sponsor email)
- 💬 **Encrypted memo** (0.001 HBD transfer with # encrypted memo)
- 🔄 **Recovery safety** (credentials stored until successful delivery)
- ✅ **Dual-mode delivery** ("both" enforces both paths succeed)

### Security (Current)
- 🛡️ Input validation (structure & required fields)
- 🔑 Creator keys only in `.env` (gitignored)
- � Encrypted memo via hive-js (# prefix + plaintext sanity check)
- 📝 Pending credential store prevents loss on delivery failure
- ♻️ Block height persistence for crash resilience
### Security (Planned)
- 🚦 Rate limiting & API key auth
- 📊 Structured logging / metrics
- 🧪 Additional input sanitization layers

## 🔧 Configuration

### Core Environment Variables (see `backend/.env.example`)
```bash
CREATING_ACCOUNT_USERNAME=yourfaucet
CREATING_ACCOUNT_ACTIVE_KEY=5XXXXXXXXXXXXXXXX
CREATING_ACCOUNT_POSTING_KEY=5XXXXXXXXXXXXXXXX
CREATING_ACCOUNT_MEMO_KEY=5XXXXXXXXXXXXXXXX
HIVE_NODE_URL=https://api.hive.blog
BLOCK_SAVE_INTERVAL=20
PORT=3000

# Email (optional if only using memos)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=youraddress@gmail.com
EMAIL_PASS=app_password
EMAIL_FROM="Hive Faucet <youraddress@gmail.com>"
```

### Frontend Configuration
Update API endpoint in `frontend/scripts/api.js`:
```javascript
getApiBaseUrl() {
    return 'https://your-backend-domain.com';
}
```

## 📋 API Documentation

### Create Account Request
```http
POST /api/create-account
Content-Type: application/json

{
  "requestedUsername": "newuser123",
  "businessEmail": "owner@business.com",
  "businessName": "My Business",
  "contactInfo": {
    "phone": "+1234567890",
    "website": "https://mybusiness.com"
  },
  "deliveryMethod": "email",
  "notes": "Optional notes"
}
```

### Check Request Status
```http
GET /api/status/:requestId
```

### Health Check
```http
GET /api/health
```

## 🚀 Deployment

### Frontend (GitHub Pages)
1. Push frontend code to GitHub
2. Enable GitHub Pages in repository settings
3. Select source branch and folder
4. Access via `https://username.github.io/accountfaucet`

### Backend (Various Options)

#### Heroku
```bash
# Install Heroku CLI
heroku create your-app-name
heroku config:set HIVE_CREATOR_ACCOUNT=your-account
heroku config:set HIVE_CREATOR_ACTIVE_KEY=your-key
# ... set other environment variables
git push heroku main
```

#### VPS/Cloud Server
```bash
# Clone repository
git clone <repository-url>
cd accountfaucet/backend

# Install dependencies
npm install --production

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Start with PM2
npm install -g pm2
pm2 start server.js --name hive-faucet
pm2 startup
pm2 save
```

#### Docker
```bash
# Build image
docker build -t hive-faucet .

# Run container
docker run -d \
  -p 3000:3000 \
  -e HIVE_CREATOR_ACCOUNT=your-account \
  -e HIVE_CREATOR_ACTIVE_KEY=your-key \
  --name hive-faucet \
  hive-faucet
```

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
# Open index.html in multiple browsers
# Test form validation
# Test responsive design
# Test accessibility with screen readers
```

### Backend Testing
```bash
cd backend
npm test
# Or manual testing
npm start
curl -X POST http://localhost:3000/api/create-account \
  -H "Content-Type: application/json" \
  -d '{"requestedUsername":"test123","businessEmail":"test@example.com",...}'
```

## 🔒 Security Considerations

### Key Management
- **Never commit private keys** to version control
- **Use environment variables** for sensitive configuration
- **Rotate keys regularly** if possible
- **Monitor account activity** for unauthorized usage

### Rate Limiting
- **Implement IP-based limits** to prevent abuse
- **Monitor request patterns** for suspicious activity
- **Set daily/hourly limits** per user/IP

### Input Validation
- **Validate all inputs** on both client and server
- **Sanitize user data** before processing
- **Use parameterized queries** if using databases

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new functionality
- Update documentation as needed
- Test across different browsers and devices
- Consider accessibility in all UI changes

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 📞 Support

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Email**: contact@example.com (replace with actual contact)

## 🙏 Acknowledgments

- **Hive Blockchain** for the robust account creation system
- **@christianfuerst/creator-api** for reference implementation patterns
- **Hive Community** for supporting onboarding initiatives

## 🗺️ Roadmap

### Phase 1: MVP ✅
- [x] Basic frontend form
- [x] Form validation
- [x] API client setup
- [x] Project structure

### Phase 2: Backend Development ✅
- [x] Node.js server setup
- [x] Hive blockchain integration (stream + filter)
- [x] ACT-based account creation
- [x] Email notification system
- [x] Encrypted memo delivery
- [x] Token authorization / usage tracking
- [x] Resume from persisted block
- [x] Recovery store for pending credentials

### Phase 3: Integration & Testing �
- [x] Frontend-backend integration
- [ ] Expanded automated tests
- [ ] Security hardening tests
- [ ] Performance / load profiling

### Phase 4: Deployment & Launch 🚀
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] Documentation finalization
- [ ] Community announcement

### Future Enhancements 🔮
- [ ] Batch account creation
- [ ] Automatic stale pending cleanup + alerting
- [ ] Rate limiting & abuse detection
- [ ] Analytics dashboard / metrics endpoint
- [ ] Multi-language UI
- [ ] Optional database persistence

---

**Made with ❤️ for the Hive community**
