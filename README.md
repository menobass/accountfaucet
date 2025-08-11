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
- **Technology**: Node.js, Express, @hiveio/dhive
- **Purpose**: Process requests and interact with Hive blockchain
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
- 🆓 **Free service** using account creation tokens
- ⚡ **Fast processing** (5-10 minutes typical)
- 🔒 **Secure key generation** for new accounts
- 📧 **Email delivery** of credentials
- 💬 **Encrypted memo** option for delivery
- 🔄 **Request queuing** and management

### Security
- 🛡️ **Input validation** and sanitization
- 🔑 **Secure key management** for creator accounts
- 🚦 **Rate limiting** to prevent abuse
- 📊 **Audit logging** of all operations
- 🔐 **HTTPS only** communication

## 🔧 Configuration

### Environment Variables
```bash
# Backend configuration
HIVE_CREATOR_ACCOUNT=your-creator-account
HIVE_CREATOR_ACTIVE_KEY=your-active-key
EMAIL_SERVICE_API_KEY=your-email-api-key
API_AUTH_KEY=your-api-auth-key
HIVE_RPC_ENDPOINTS=https://api.hive.blog,https://api.hivekings.com

# Optional
PORT=3000
NODE_ENV=production
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

### Phase 2: Backend Development 🚧
- [ ] Node.js server setup
- [ ] Hive blockchain integration
- [ ] Account creation service
- [ ] Email notification system
- [ ] API endpoints implementation

### Phase 3: Integration & Testing 📋
- [ ] Frontend-backend integration
- [ ] End-to-end testing
- [ ] Security testing
- [ ] Performance optimization

### Phase 4: Deployment & Launch 🚀
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] Documentation finalization
- [ ] Community announcement

### Future Enhancements 🔮
- [ ] Batch account creation
- [ ] Account recovery assistance
- [ ] Integration with popular business tools
- [ ] Analytics dashboard
- [ ] Multi-language support

---

**Made with ❤️ for the Hive community**
