// Account Faucet App - Main Application Logic
// Based on SnapnPay authentication pattern

// Application state
let currentUser = null;
let isProcessing = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeUI();
    checkExistingSession();
});

// Initialize UI event listeners
function initializeUI() {
    // Login functionality
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Account form submission
    document.getElementById('accountForm').addEventListener('submit', handleFormSubmit);
    
    // Username validation
    document.getElementById('requestedUsername').addEventListener('input', function() {
        clearTimeout(this.validationTimeout);
        this.validationTimeout = setTimeout(() => {
            checkUsernameAvailability(this.value, 'requested');
        }, 500);
    });
    
    // Delivery method change - No longer need email input handling
    document.getElementById('deliveryMethod').addEventListener('change', function() {
        // Email is now sent to registered address only, no input field needed
    });
    
    // Enter key support for username input
    document.getElementById('usernameInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
}

// Check for existing session
function checkExistingSession() {
    const storedUsername = localStorage.getItem('hive_username');
    if (storedUsername) {
        currentUser = storedUsername;
        showLoggedInState();
    }
}

// Handle login with Hive Keychain
async function handleLogin() {
    const username = document.getElementById('usernameInput').value.trim();
    
    if (!username) {
        showStatus('Please enter a username', 'error');
        return;
    }
    
    if (!window.hive_keychain) {
        showStatus('Hive Keychain not found. Please install the Hive Keychain browser extension.', 'error');
        return;
    }
    
    showLoading('Authenticating with Hive Keychain...');
    
    try {
        // Create a buffer to sign for authentication
        const buffer = `Login to Hive Account Faucet - ${Date.now()}`;
        
        window.hive_keychain.requestSignBuffer(username, buffer, 'Posting', (response) => {
            hideLoading();
            
            if (response.success) {
                currentUser = username;
                localStorage.setItem('hive_username', username);
                showLoggedInState();
                showStatus(`Successfully logged in as @${username}`, 'success');
            } else {
                showStatus(`Login failed: ${response.message || 'Unknown error'}`, 'error');
            }
        });
        
    } catch (error) {
        hideLoading();
        console.error('Login error:', error);
        showStatus('Login failed. Please try again.', 'error');
    }
}

// Handle logout
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('hive_username');
    showLoggedOutState();
    showStatus('Logged out successfully', 'info');
}

// Show logged in state
function showLoggedInState() {
    // Hide login section
    document.getElementById('loginSection').style.display = 'none';
    
    // Show faucet section
    document.getElementById('faucetSection').style.display = 'block';
    
    // Show user info in header
    document.getElementById('userInfo').style.display = 'flex';
    document.getElementById('username').textContent = `@${currentUser}`;
    
    // Set user avatar
    const avatarImg = document.getElementById('userAvatar');
    avatarImg.src = `https://images.hive.blog/u/${currentUser}/avatar/small`;
    avatarImg.onerror = function() {
        this.src = 'https://via.placeholder.com/40/1da1f2/ffffff?text=' + currentUser.charAt(0).toUpperCase();
    };
}

// Show logged out state
function showLoggedOutState() {
    // Show login section
    document.getElementById('loginSection').style.display = 'block';
    
    // Hide other sections
    document.getElementById('faucetSection').style.display = 'none';
    
    // Hide user info
    document.getElementById('userInfo').style.display = 'none';
    
    // Reset form
    document.getElementById('usernameInput').value = '';
    document.getElementById('accountForm').reset();
}

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (isProcessing) return;
    
    const formData = new FormData(event.target);
    const requestData = {
        requestedUsername: formData.get('requestedUsername'),
        deliveryMethod: formData.get('deliveryMethod'),
        email: formData.get('email'),
        notes: formData.get('notes')
    };
    
    // Validate required fields
    if (!requestData.requestedUsername) {
        showStatus('Please enter a username for the new account', 'error');
        return;
    }
    
    if (!requestData.deliveryMethod) {
        showStatus('Please select a credential delivery method', 'error');
        return;
    }
    
    if (requestData.deliveryMethod === 'email' && !requestData.email) {
        showStatus('Please enter an email address', 'error');
        return;
    }
    
    // Validate username format
    const validation = window.formValidator.validateHiveUsername(requestData.requestedUsername);
    if (!validation.isValid) {
        showStatus(`Username validation failed: ${validation.errors.join(', ')}`, 'error');
        return;
    }
    
    isProcessing = true;
    document.getElementById('submitBtn').disabled = true;
    showLoading('Broadcasting account request...');
    
    try {
        // Create custom JSON for account request
        const customJson = {
            app: 'hive_account_faucet',
            version: '1.0.0',
            action: 'create_account_request',
            data: {
                requester: currentUser,
                requested_username: requestData.requestedUsername,
                delivery_method: requestData.deliveryMethod,
                email: requestData.email || null,
                notes: requestData.notes || null,
                timestamp: new Date().toISOString()
            }
        };
        
        // Broadcast custom JSON using Keychain
        window.hive_keychain.requestCustomJson(
            currentUser,
            'hive_account_faucet',
            'Posting',
            JSON.stringify(customJson),
            'Account Creation Request',
            (response) => {
                hideLoading();
                isProcessing = false;
                document.getElementById('submitBtn').disabled = false;
                
                if (response.success) {
                    showStatus('Account request submitted successfully! Your request has been broadcast to the blockchain and will be processed shortly.', 'success');
                    
                    // Reset form after successful submission
                    setTimeout(() => {
                        document.getElementById('accountForm').reset();
                        // No longer need to hide email group since it's removed
                    }, 2000);
                } else {
                    showStatus(`Failed to submit request: ${response.message || 'Unknown error'}`, 'error');
                }
            }
        );
        
    } catch (error) {
        hideLoading();
        isProcessing = false;
        document.getElementById('submitBtn').disabled = false;
        console.error('Request submission error:', error);
        showStatus('Failed to submit request. Please try again.', 'error');
    }
}

/**
 * Check username availability
 * @param {string} username - Username to check
 * @param {string} type - Type of username ('requested')
 */
async function checkUsernameAvailability(username, type) {
    // Only check requested username availability
    if (type !== 'requested') return;

    // First validate format
    const validation = window.formValidator.validateHiveUsername(username);
    
    const usernameField = document.getElementById(`${type}Username`);
    const errorElement = document.getElementById(`${type}UsernameError`);
    const successElement = document.getElementById(`${type}UsernameSuccess`);
    
    // Clear previous messages
    if (errorElement) errorElement.textContent = '';
    if (successElement) successElement.textContent = '';
    
    // Show format validation errors
    if (!validation.isValid) {
        if (errorElement) {
            errorElement.textContent = validation.errors.join(', ');
        }
        if (usernameField) {
            usernameField.classList.add('error');
            usernameField.classList.remove('success');
        }
        return;
    }
    
    // Check availability on blockchain
    try {
        const isAvailable = await window.apiClient.checkAccountAvailability(username);
        
        if (usernameField) {
            if (isAvailable) {
                usernameField.classList.remove('error');
                usernameField.classList.add('success');
                if (successElement) {
                    successElement.textContent = `✓ Username "${username}" is available`;
                }
            } else {
                usernameField.classList.add('error');
                usernameField.classList.remove('success');
                if (errorElement) {
                    errorElement.textContent = `Username "${username}" is already taken`;
                }
            }
        }
    } catch (error) {
        console.error('Error checking username availability:', error);
        if (errorElement) {
            errorElement.textContent = 'Unable to check username availability. Please try again.';
        }
        if (usernameField) {
            usernameField.classList.add('error');
            usernameField.classList.remove('success');
        }
    }
}

// Show status message
function showStatus(message, type = 'info') {
    const statusContent = document.getElementById('statusContent');
    const statusClass = `status-${type}`;
    
    const iconMap = {
        info: 'fas fa-info-circle',
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    statusContent.innerHTML = `
        <div class="status-message ${statusClass}">
            <i class="${iconMap[type] || iconMap.info}"></i>
            ${message}
        </div>
    `;
    
    // Auto-clear success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            if (statusContent.innerHTML.includes(message)) {
                statusContent.innerHTML = '<p class="text-muted">Ready for next action...</p>';
            }
        }, 5000);
    }
}

// Show loading overlay
function showLoading(message = 'Loading...') {
    document.getElementById('loadingText').textContent = message;
    document.getElementById('loadingOverlay').style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Error handler for uncaught errors
window.addEventListener('error', function(event) {
    console.error('Uncaught error:', event.error);
    showStatus('An unexpected error occurred. Please refresh the page.', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showStatus('An unexpected error occurred. Please refresh the page.', 'error');
});
