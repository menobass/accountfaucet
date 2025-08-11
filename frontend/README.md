# Hive Account Faucet - Frontend

A static website for requesting Hive account creation using account creation tokens. This frontend provides a user-friendly interface for business owners to create accounts for their customers.

## Features

### 🎯 Core Functionality
- **Account Request Form**: Simple, intuitive form for requesting new Hive accounts
- **Real-time Validation**: Instant feedback on form fields including username validation
- **Status Tracking**: Real-time updates on account creation progress
- **Multiple Delivery Options**: Email, encrypted memo, or both delivery methods

### 📱 User Experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation
- **Progressive Enhancement**: Works with JavaScript disabled (basic functionality)
- **Error Handling**: User-friendly error messages and recovery suggestions

### 🔧 Technical Features
- **Pure JavaScript**: No framework dependencies for fast loading
- **Modular Architecture**: Separate modules for validation, API communication, and UI logic
- **Mock API Support**: Built-in mock API for development and testing
- **GitHub Pages Ready**: Optimized for static hosting

## File Structure

```
frontend/
├── index.html              # Main application page
├── styles/
│   ├── main.css           # Core styling and layout
│   └── responsive.css     # Mobile-first responsive design
├── scripts/
│   ├── app.js            # Main application logic
│   ├── validation.js     # Form validation and Hive username rules
│   └── api.js            # API communication and mock client
└── README.md             # This file
```

## Setup and Development

### Local Development

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd accountfaucet/frontend
   ```

2. **Serve locally**:
   You can use any static file server. Here are a few options:

   **Using Python**:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```

   **Using Node.js (http-server)**:
   ```bash
   npx http-server -p 8000
   ```

   **Using Live Server (VS Code extension)**:
   - Install the Live Server extension
   - Right-click `index.html` and select "Open with Live Server"

3. **Open in browser**:
   Navigate to `http://localhost:8000`

### Configuration

#### API Backend URL
Update the API base URL in `scripts/api.js`:

```javascript
getApiBaseUrl() {
    // For production, update this URL
    return 'https://your-backend-domain.com';
}
```

#### Mock API Mode
For development without a backend, the app automatically uses a mock API when running on localhost. To force real API usage during local development:

```javascript
// Add this to your browser console or before the API client initialization
window.FORCE_REAL_API = true;
```

## Deployment

### GitHub Pages

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add frontend files"
   git push origin main
   ```

2. **Enable GitHub Pages**:
   - Go to repository Settings
   - Scroll to Pages section
   - Select source: "Deploy from a branch"
   - Choose branch: `main`
   - Choose folder: `/frontend` (or root if frontend is in root)

3. **Update API URL**:
   Update the production API URL in `scripts/api.js` to point to your deployed backend.

### Other Static Hosting Services

The frontend works with any static hosting service:
- **Netlify**: Drag and drop the `frontend` folder
- **Vercel**: Import GitHub repository
- **AWS S3**: Upload files to S3 bucket with static website hosting
- **Firebase Hosting**: Use Firebase CLI to deploy

## Form Validation

### Username Validation
Follows Hive blockchain rules:
- 3-16 characters long
- Lowercase letters, numbers, and hyphens only
- Cannot start or end with hyphen
- No consecutive hyphens
- Excludes reserved words/patterns

### Email Validation
- Standard email format validation
- Maximum length restrictions
- Real-time validation feedback

### Other Field Validation
- Required field validation
- URL format validation for website
- Phone number format validation (flexible international formats)

## API Integration

### Endpoints Used

#### POST `/api/create-account`
Submit new account creation request.

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
  "deliveryMethod": "email",
  "notes": "Optional notes"
}
```

#### GET `/api/status/:requestId`
Check request status for real-time updates.

#### GET `/api/health`
Backend health check for service availability.

### Error Handling

The frontend handles various error scenarios:
- **Network errors**: Connection issues, timeouts
- **Validation errors**: Invalid input data
- **Backend errors**: Service unavailable, rate limiting
- **Request failures**: Account creation failures

## Browser Support

- **Modern browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile browsers**: iOS Safari 12+, Chrome Mobile 60+
- **Features used**:
  - ES6+ JavaScript (async/await, classes, arrow functions)
  - CSS Grid and Flexbox
  - Fetch API for HTTP requests
  - CSS Custom Properties (variables)

### Polyfills
For older browser support, consider adding:
- Fetch API polyfill
- Promise polyfill
- CSS Grid polyfill

## Accessibility

### Features Implemented
- **Semantic HTML**: Proper heading hierarchy, form labels, landmarks
- **ARIA attributes**: Labels, descriptions, invalid states
- **Keyboard navigation**: Tab order, focus management, keyboard shortcuts
- **Screen reader support**: Descriptive text, status announcements
- **Color contrast**: WCAG AA compliant color ratios
- **Focus indicators**: Visible focus states for all interactive elements

### Testing
Test with:
- Screen readers (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation
- High contrast mode
- Browser zoom (up to 200%)

## Security Considerations

### Frontend Security
- **Input validation**: All inputs validated client-side and server-side
- **XSS prevention**: No direct HTML insertion, uses textContent
- **HTTPS only**: All API calls use HTTPS in production
- **No sensitive data**: No private keys or sensitive information stored

### API Communication
- **CORS headers**: Proper cross-origin request handling
- **Request validation**: All requests validated before submission
- **Error information**: Limited error details to prevent information disclosure

## Performance Optimization

### Loading Performance
- **Minimal dependencies**: No external frameworks
- **Optimized images**: Use appropriate formats and sizes
- **CSS optimization**: Minimal and well-structured stylesheets
- **JavaScript optimization**: Modular code with efficient loading

### Runtime Performance
- **Debounced validation**: Prevents excessive API calls
- **Efficient DOM manipulation**: Minimal reflows and repaints
- **Memory management**: Proper event listener cleanup

## Customization

### Styling
Customize the appearance by modifying CSS custom properties in `styles/main.css`:

```css
:root {
    --primary-color: #e31337;    /* Main brand color */
    --secondary-color: #2c3e50;  /* Text and headings */
    --accent-color: #3498db;     /* Links and highlights */
    /* ... other variables */
}
```

### Form Fields
Add or modify form fields by:
1. Adding HTML in `index.html`
2. Adding validation rules in `scripts/validation.js`
3. Updating form data collection in `scripts/app.js`

### API Client
Customize API behavior in `scripts/api.js`:
- Timeout settings
- Error handling
- Request/response formatting
- Mock responses for testing

## Testing

### Manual Testing Checklist
- [ ] Form validation works for all fields
- [ ] Submit process shows loading states
- [ ] Error messages are user-friendly
- [ ] Success flow completes properly
- [ ] Mobile responsiveness works
- [ ] Keyboard navigation works
- [ ] Screen reader announces status changes

### Browser Testing
Test in multiple browsers and devices:
- Desktop: Chrome, Firefox, Safari, Edge
- Mobile: iOS Safari, Chrome Mobile, Samsung Internet
- Tablet: iPad Safari, Android Chrome

## Troubleshooting

### Common Issues

**Form not submitting**:
- Check browser console for JavaScript errors
- Verify API backend is running and accessible
- Check network connectivity

**Validation not working**:
- Ensure `validation.js` is loaded before `app.js`
- Check for JavaScript errors in console
- Verify form field IDs match validation setup

**Styling issues**:
- Check if CSS files are loading properly
- Verify no conflicting styles
- Test in different browsers

**API connection fails**:
- Verify backend URL is correct
- Check CORS configuration on backend
- Ensure backend is running and accessible

### Debug Mode
Enable debug logging by adding to browser console:
```javascript
window.DEBUG = true;
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly across browsers
5. Submit a pull request

### Code Style
- Use meaningful variable and function names
- Comment complex logic
- Follow existing indentation and formatting
- Keep functions small and focused

## License

This project is part of the Hive Account Faucet service. See the main project repository for license information.
