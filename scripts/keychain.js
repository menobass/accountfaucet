/**
 * Hive Keychain Integration for Account Faucet
 */

class KeychainManager {
    constructor() {
        this.isConnected = false;
        this.connectedUser = null;
        this.keychain = null;
        this.retryAttempts = 0;
        this.maxRetries = 3;
    }

    /**
     * Initialize Keychain integration
     */
    async init() {
        await this.checkKeychainAvailability();
        this.setupEventListeners();
    }

    /**
     * Check if Keychain is available
     */
    async checkKeychainAvailability() {
        return new Promise((resolve) => {
            const checkKeychain = () => {
                if (window.hive_keychain) {
                    this.keychain = window.hive_keychain;
                    console.log('Keychain detected');
                    resolve(true);
                } else {
                    this.retryAttempts++;
                    if (this.retryAttempts < this.maxRetries) {
                        setTimeout(checkKeychain, 1000);
                    } else {
                        console.warn('Keychain not detected after retries');
                        this.showKeychainStatus('error', '❌', 'Hive Keychain not detected. Please install Keychain extension.');
                        resolve(false);
                    }
                }
            };
            checkKeychain();
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const connectBtn = document.getElementById('connectKeychainBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');

        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectKeychain());
        }

        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnect());
        }
    }

    /**
     * Connect to Keychain
     */
    async connectKeychain() {
        if (!this.keychain) {
            this.showKeychainStatus('error', '❌', 'Keychain not available. Please install Hive Keychain extension.');
            return false;
        }

        try {
            this.showKeychainStatus('warning', '⏳', 'Requesting account access...');

            // Request account access
            return new Promise((resolve) => {
                this.keychain.requestHandshake((response) => {
                    if (response.success) {
                        this.isConnected = true;
                        this.connectedUser = response.data.username;
                        this.showConnectedState();
                        resolve(true);
                    } else {
                        this.showKeychainStatus('error', '❌', 'Failed to connect to Keychain: ' + (response.error || 'Unknown error'));
                        resolve(false);
                    }
                });
            });
        } catch (error) {
            console.error('Keychain connection error:', error);
            this.showKeychainStatus('error', '❌', 'Failed to connect to Keychain');
            return false;
        }
    }

    /**
     * Show connected state
     */
    showConnectedState() {
        this.showKeychainStatus('connected', '✅', `Connected as @${this.connectedUser}`);
        
        // Hide login section and show form
        const loginSection = document.getElementById('loginSection');
        const accountForm = document.getElementById('accountRequestForm');
        const connectedUsername = document.getElementById('connectedUsername');

        if (loginSection) loginSection.classList.add('hidden');
        if (accountForm) accountForm.classList.remove('hidden');
        if (connectedUsername) connectedUsername.textContent = '@' + this.connectedUser;
    }

    /**
     * Disconnect from Keychain
     */
    disconnect() {
        this.isConnected = false;
        this.connectedUser = null;

        // Show login section and hide form
        const loginSection = document.getElementById('loginSection');
        const accountForm = document.getElementById('accountRequestForm');
        const keychainStatus = document.getElementById('keychainStatus');

        if (loginSection) loginSection.classList.remove('hidden');
        if (accountForm) accountForm.classList.add('hidden');
        if (keychainStatus) keychainStatus.classList.add('hidden');

        console.log('Disconnected from Keychain');
    }

    /**
     * Show Keychain status message
     */
    showKeychainStatus(type, icon, message) {
        const statusElement = document.getElementById('keychainStatus');
        const iconElement = statusElement?.querySelector('.keychain-icon');
        const textElement = statusElement?.querySelector('.keychain-text');

        if (statusElement && iconElement && textElement) {
            iconElement.textContent = icon;
            textElement.textContent = message;
            statusElement.className = `keychain-status ${type}`;
            statusElement.classList.remove('hidden');
        }
    }

    /**
     * Broadcast custom JSON operation
     */
    async broadcastCustomJson(id, json, requiredPostingAuths = []) {
        if (!this.isConnected || !this.connectedUser) {
            throw new Error('Keychain not connected');
        }

        return new Promise((resolve, reject) => {
            if (!this.keychain) {
                reject(new Error('Keychain not available'));
                return;
            }

            this.keychain.requestCustomJson(
                this.connectedUser,
                id,
                'Posting',
                JSON.stringify(json),
                'Account Creation Request',
                (response) => {
                    if (response.success) {
                        resolve({
                            success: true,
                            transactionId: response.result.id,
                            blockNum: response.result.block_num,
                            message: 'Custom JSON broadcast successful'
                        });
                    } else {
                        reject(new Error(response.message || 'Failed to broadcast custom JSON'));
                    }
                }
            );
        });
    }

    /**
     * Create account request custom JSON
     */
    createAccountRequestJson(requestedUsername, deliveryMethod, notes = '') {
        return {
            app: 'hive-account-faucet',
            version: '1.0.0',
            action: 'create_account_request',
            timestamp: new Date().toISOString(),
            requestId: this.generateRequestId(),
            data: {
                requestedUsername: requestedUsername,
                deliveryMethod: deliveryMethod,
                notes: notes
            }
        };
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `req_${timestamp}_${random}`;
    }

    /**
     * Submit account creation request
     */
    async submitAccountRequest(formData) {
        try {
            if (!this.isConnected) {
                throw new Error('Please connect your Keychain first');
            }

            // Create custom JSON payload
            const customJson = this.createAccountRequestJson(
                formData.requestedUsername,
                formData.deliveryMethod,
                formData.notes
            );

            // Broadcast the custom JSON
            const result = await this.broadcastCustomJson(
                'hive_account_faucet',
                customJson,
                [this.connectedUser]
            );

            return {
                success: true,
                requestId: customJson.requestId,
                transactionId: result.transactionId,
                blockNum: result.blockNum,
                message: 'Account creation request submitted to Hive blockchain',
                estimatedTime: '5-10 minutes'
            };

        } catch (error) {
            console.error('Account request submission error:', error);
            throw error;
        }
    }

    /**
     * Get connected user info
     */
    getConnectedUser() {
        return {
            isConnected: this.isConnected,
            username: this.connectedUser
        };
    }

    /**
     * Check if user is connected
     */
    isUserConnected() {
        return this.isConnected && this.connectedUser;
    }
}

// Create global instance
window.keychainManager = new KeychainManager();
