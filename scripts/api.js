/**
 * API Communication Module for Hive Account Creation Service
 */

class ApiClient {
    constructor() {
        // Configure API endpoints
        this.config = {
            // Backend API base URL - will be configured based on environment
            baseUrl: this.getApiBaseUrl(),
            
            // Default timeout for requests (30 seconds)
            timeout: 30000,
            
            // API endpoints
            endpoints: {
                createAccount: '/api/create-account',
                checkStatus: '/api/status',
                healthCheck: '/api/health'
            },
            
            // Default headers
            defaultHeaders: {
                'Content-Type': 'application/json'
            }
        };

        // Track request status
        this.isRequesting = false;
        this.currentRequestId = null;
    }

    /**
     * Determine API base URL based on environment
     * @returns {string} - The base URL for API requests
     */
    getApiBaseUrl() {
        // Check if we're running locally for development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000'; // Local development server
        }
        
        // For production, use your deployed backend URL
        // This should be updated with your actual backend URL
        return 'https://your-backend-domain.com'; // Replace with actual backend URL
    }

    /**
     * Make HTTP request with timeout and error handling
     * @param {string} url - The URL to request
     * @param {object} options - Fetch options
     * @returns {Promise} - Promise resolving to response data
     */
    async makeRequest(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    ...this.config.defaultHeaders,
                    ...options.headers
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please check your connection and try again.');
            }
            
            throw error;
        }
    }

    /**
     * Submit account creation request
     * @param {object} formData - The form data for account creation
     * @returns {Promise} - Promise resolving to request result
     */
    async submitAccountRequest(formData) {
        if (this.isRequesting) {
            throw new Error('A request is already in progress. Please wait.');
        }

        this.isRequesting = true;

        try {
            const url = `${this.config.baseUrl}${this.config.endpoints.createAccount}`;
            
            const requestBody = {
                requestingUsername: formData.requestingUsername,
                requestedUsername: formData.requestedUsername,
                deliveryMethod: formData.deliveryMethod,
                notes: formData.notes || ''
            };

            const response = await this.makeRequest(url, {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });

            this.currentRequestId = response.requestId;
            return response;

        } finally {
            this.isRequesting = false;
        }
    }

    /**
     * Check the status of an account creation request
     * @param {string} requestId - The request ID to check
     * @returns {Promise} - Promise resolving to status data
     */
    async checkRequestStatus(requestId) {
        const url = `${this.config.baseUrl}${this.config.endpoints.checkStatus}/${requestId}`;
        
        return await this.makeRequest(url, {
            method: 'GET'
        });
    }

    /**
     * Check if a Hive account exists
     * @param {string} username - Username to check
     * @returns {Promise} - Promise resolving to availability status
     */
    async checkAccountAvailability(username) {
        try {
            // For now, use a public Hive RPC endpoint to check account existence
            // This is a direct blockchain call that doesn't require our backend
            const rpcEndpoint = 'https://api.hive.blog';
            
            const response = await this.makeRequest(rpcEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'condenser_api.get_accounts',
                    params: [[username]],
                    id: 1
                })
            });

            // If account exists, the result array will not be empty
            const accountExists = response.result && response.result.length > 0;
            
            return {
                available: !accountExists,
                exists: accountExists
            };
        } catch (error) {
            // If there's an error, we can't determine availability
            throw new Error('Unable to check account availability');
        }
    }

    /**
     * Check if user is authorized to use the faucet
     * @param {string} username - Username to check
     * @returns {Promise} - Promise resolving to authorization status
     */
    async checkUserAuthorization(username) {
        try {
            const url = `${this.config.baseUrl}/api/check-authorization/${username}`;
            return await this.makeRequest(url, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error('Unable to verify authorization');
        }
    }

    /**
     * Check if the API backend is healthy and responding
     * @returns {Promise} - Promise resolving to health status
     */
    async checkHealth() {
        try {
            const url = `${this.config.baseUrl}${this.config.endpoints.healthCheck}`;
            const response = await this.makeRequest(url, {
                method: 'GET'
            });
            return { healthy: true, ...response };
        } catch (error) {
            return { 
                healthy: false, 
                error: error.message,
                suggestion: 'The backend service may be temporarily unavailable. Please try again later.'
            };
        }
    }

    /**
     * Poll request status until completion or timeout
     * @param {string} requestId - The request ID to poll
     * @param {function} onUpdate - Callback for status updates
     * @param {number} maxAttempts - Maximum polling attempts (default: 60)
     * @param {number} interval - Polling interval in ms (default: 10000)
     * @returns {Promise} - Promise resolving when request completes or fails
     */
    async pollRequestStatus(requestId, onUpdate, maxAttempts = 60, interval = 10000) {
        let attempts = 0;

        const poll = async () => {
            try {
                attempts++;
                const status = await this.checkRequestStatus(requestId);
                
                // Call update callback
                if (onUpdate) {
                    onUpdate(status);
                }

                // Check if request is complete
                if (status.status === 'completed') {
                    return status;
                } else if (status.status === 'failed') {
                    throw new Error(status.message || 'Account creation failed');
                } else if (attempts >= maxAttempts) {
                    throw new Error('Request timed out. Please check your request status later.');
                }

                // Continue polling if still processing
                if (status.status === 'pending' || status.status === 'processing') {
                    await new Promise(resolve => setTimeout(resolve, interval));
                    return poll();
                }

            } catch (error) {
                if (attempts >= maxAttempts) {
                    throw new Error('Unable to check request status. Please try again later.');
                }
                
                // Retry on network errors
                await new Promise(resolve => setTimeout(resolve, interval));
                return poll();
            }
        };

        return poll();
    }

    /**
     * Format error messages for user display
     * @param {Error} error - The error to format
     * @returns {string} - User-friendly error message
     */
    formatErrorMessage(error) {
        const message = error.message || 'An unexpected error occurred';

        // Handle common error scenarios
        if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
            return 'Unable to connect to the service. Please check your internet connection and try again.';
        }

        if (message.includes('timeout') || message.includes('timed out')) {
            return 'The request is taking longer than expected. Please try again in a few minutes.';
        }

        if (message.includes('400')) {
            return 'There was an error with your request. Please check your information and try again.';
        }

        if (message.includes('401') || message.includes('403')) {
            return 'Authentication failed. Please refresh the page and try again.';
        }

        if (message.includes('429')) {
            return 'Too many requests. Please wait a few minutes before trying again.';
        }

        if (message.includes('500') || message.includes('502') || message.includes('503')) {
            return 'The service is temporarily unavailable. Please try again in a few minutes.';
        }

        // Return the original message if it's user-friendly, otherwise provide a generic message
        if (message.length < 200 && !message.includes('TypeError') && !message.includes('undefined')) {
            return message;
        }

        return 'An error occurred while processing your request. Please try again.';
    }

    /**
     * Get current request status
     * @returns {object} - Current request information
     */
    getCurrentRequestInfo() {
        return {
            isRequesting: this.isRequesting,
            requestId: this.currentRequestId
        };
    }

    /**
     * Reset request state
     */
    resetRequestState() {
        this.isRequesting = false;
        this.currentRequestId = null;
    }
}

// Mock API responses for development/testing
class MockApiClient extends ApiClient {
    constructor() {
        super();
        this.mockDelay = 2000; // 2 second delay to simulate network
    }

    async makeRequest(url, options = {}) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, this.mockDelay));

        // Mock responses based on endpoint
        if (url.includes('/create-account')) {
            return this.mockCreateAccount(options.body);
        } else if (url.includes('/status/')) {
            return this.mockStatusCheck(url);
        } else if (url.includes('/health')) {
            return this.mockHealthCheck();
        }

        throw new Error('Endpoint not found');
    }

    mockCreateAccount(requestBody) {
        const data = JSON.parse(requestBody);
        
        // Simulate validation errors
        if (data.requestedUsername === 'taken') {
            throw new Error('Username is already taken');
        }

        // Simulate unauthorized user
        if (data.requestingUsername === 'unauthorized') {
            throw new Error('You are not authorized to use this faucet service');
        }

        // Simulate insufficient tokens
        if (data.requestingUsername === 'notokens') {
            throw new Error('You have no remaining account creation tokens. Please contact the administrator.');
        }

        return {
            success: true,
            requestId: 'req_' + Date.now(),
            message: 'Account creation request submitted successfully',
            estimatedTime: '5-10 minutes',
            tokensRemaining: 9 // Mock remaining tokens
        };
    }

    mockStatusCheck(url) {
        const requestId = url.split('/').pop();
        
        // Simulate different states based on request ID
        const states = ['pending', 'processing', 'completed'];
        const randomState = states[Math.floor(Math.random() * states.length)];

        return {
            requestId: requestId,
            status: randomState,
            createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
            completedAt: randomState === 'completed' ? new Date().toISOString() : null,
            accountName: randomState === 'completed' ? 'newuser123' : null,
            message: randomState === 'completed' ? 'Account created successfully' : 'Processing request...'
        };
    }

    mockHealthCheck() {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
    }
}

// Create global API client instance
// Use mock client for development if no backend is available
window.apiClient = window.location.hostname === 'localhost' && !window.FORCE_REAL_API 
    ? new MockApiClient() 
    : new ApiClient();
