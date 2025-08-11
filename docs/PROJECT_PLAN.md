# Hive Account Creation Faucet - Project Plan

## Overview
A two-part system allowing business owners to create Hive accounts for their customers using account creation tokens from larger Hive accounts.

## System Architecture

### Frontend (Static Website - GitHub Pages)
- **Purpose**: Account request interface for business owners
- **Technology**: HTML5, CSS3, Vanilla JavaScript
- **Hosting**: GitHub Pages (static hosting)
- **Features**:
  - Simple form for account creation requests
  - Email validation
  - Client-side form validation
  - Request status display
  - Responsive design for mobile/desktop

### Backend (Node.js Service)
- **Purpose**: Process account creation requests and manage Hive blockchain interactions
- **Technology**: Node.js, Express, @hiveio/dhive
- **Features**:
  - RESTful API for account creation
  - Hive blockchain integration
  - Email notifications
  - Encrypted memo support
  - Request queue management
  - Rate limiting and security

## Data Flow

1. **Request Submission**:
   - Business owner fills form on frontend
   - Frontend sends request to backend API
   - Backend validates request and queues it

2. **Account Creation**:
   - Backend processes queued requests
   - Creates Hive account using account creation tokens
   - Generates secure keys for new account

3. **Delivery**:
   - Email with account credentials sent to business owner
   - Optional: Encrypted memo sent to Hive account
   - Frontend shows confirmation/status

## Frontend Structure
```
frontend/
├── index.html              # Main request form
├── styles/
│   ├── main.css            # Main stylesheet
│   └── responsive.css      # Mobile responsiveness
├── scripts/
│   ├── app.js              # Main application logic
│   ├── validation.js       # Form validation
│   └── api.js              # API communication
├── assets/
│   ├── images/             # Logo, icons
│   └── fonts/              # Custom fonts
└── README.md               # Frontend documentation
```

## Backend Structure
```
backend/
├── server.js               # Main server file
├── routes/
│   ├── accounts.js         # Account creation routes
│   └── status.js           # Status/health routes
├── services/
│   ├── hiveService.js      # Hive blockchain interactions
│   ├── emailService.js     # Email notifications
│   └── queueService.js     # Request queue management
├── middleware/
│   ├── auth.js             # API authentication
│   ├── validation.js       # Request validation
│   └── rateLimit.js        # Rate limiting
├── config/
│   ├── config.json         # Configuration file
│   └── keys.json           # Hive account keys (secure)
├── package.json            # Dependencies
└── README.md               # Backend documentation
```

## Key Features

### Frontend Features
1. **Simple Request Form**:
   - Business owner email
   - Requested account name
   - Business description
   - Contact information

2. **Validation**:
   - Email format validation
   - Hive account name validation (3-16 chars, lowercase, numbers, hyphens)
   - Required field validation

3. **Status Display**:
   - Request submission confirmation
   - Processing status
   - Error handling with user-friendly messages

### Backend Features
1. **Account Creation**:
   - Use account creation tokens from configured Hive accounts
   - Generate secure key pairs for new accounts
   - Proper authority structure setup

2. **Communication Options**:
   - **Email**: Send account credentials via secure email
   - **Encrypted Memo**: Send credentials via Hive encrypted memo
   - **Both**: Dual delivery for redundancy

3. **Security**:
   - API key authentication
   - Rate limiting per IP/user
   - Request validation and sanitization
   - Secure key generation and storage

4. **Queue Management**:
   - Process requests in order
   - Retry failed attempts
   - Status tracking and logging

## API Specification

### Endpoints

#### POST `/api/create-account`
Request a new Hive account creation.

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <api-key>
```

**Request Body**:
```json
{
  "requestedUsername": "newuser123",
  "businessEmail": "owner@business.com",
  "businessName": "My Business",
  "contactInfo": {
    "phone": "+1234567890",
    "website": "https://mybusiness.com"
  },
  "deliveryMethod": "email", // "email", "memo", or "both"
  "notes": "Optional notes about the account"
}
```

**Response**:
```json
{
  "success": true,
  "requestId": "req_123456789",
  "message": "Account creation request submitted successfully",
  "estimatedTime": "5-10 minutes"
}
```

#### GET `/api/status/:requestId`
Check the status of an account creation request.

**Response**:
```json
{
  "requestId": "req_123456789",
  "status": "completed", // "pending", "processing", "completed", "failed"
  "createdAt": "2025-08-11T10:00:00Z",
  "completedAt": "2025-08-11T10:05:00Z",
  "accountName": "newuser123",
  "message": "Account created successfully"
}
```

## Implementation Phases

### Phase 1: Frontend Development
- [x] Create project structure
- [ ] Design and implement HTML form
- [ ] Add CSS styling and responsive design
- [ ] Implement JavaScript form validation
- [ ] Add API integration functions
- [ ] Test frontend functionality

### Phase 2: Backend Development
- [ ] Set up Node.js server with Express
- [ ] Implement Hive blockchain integration
- [ ] Create account creation service
- [ ] Add email notification service
- [ ] Implement API endpoints
- [ ] Add security middleware
- [ ] Test backend functionality

### Phase 3: Integration & Testing
- [ ] Connect frontend to backend
- [ ] End-to-end testing
- [ ] Security testing
- [ ] Performance optimization
- [ ] Documentation updates

### Phase 4: Deployment
- [ ] Deploy frontend to GitHub Pages
- [ ] Configure backend hosting
- [ ] Set up monitoring and logging
- [ ] Production testing
- [ ] Go-live

## Security Considerations

1. **Key Management**:
   - Store Hive private keys securely
   - Use environment variables for sensitive data
   - Regular key rotation if needed

2. **API Security**:
   - API key authentication
   - HTTPS only
   - Input validation and sanitization
   - Rate limiting

3. **Account Security**:
   - Generate cryptographically secure keys
   - Secure delivery of credentials
   - Audit logging of all operations

## Configuration Requirements

### Backend Configuration
- Hive RPC endpoints
- Account creation token holders (accounts with keys)
- Email service configuration (SMTP)
- API authentication keys
- Rate limiting settings

### Environment Variables
- `HIVE_CREATOR_ACCOUNT`: Main account with creation tokens
- `HIVE_CREATOR_ACTIVE_KEY`: Active key for the creator account
- `EMAIL_SERVICE_API_KEY`: Email service API key
- `API_AUTH_KEY`: Authentication key for API access
- `HIVE_RPC_ENDPOINTS`: Comma-separated list of Hive RPC endpoints

This plan provides a comprehensive roadmap for building the Hive account creation faucet system with clear separation between frontend and backend responsibilities.
