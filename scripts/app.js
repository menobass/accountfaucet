/**
 * Main Application Logic for Hive Account Creation Frontend
 */

class HiveAccountApp {
    constructor() {
        this.form = null;
        this.statusMessage = null;
        this.submitButton = null;
        this.isProcessing = false;
        this.currentRequestId = null;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Initialize the application
     */
    async init() {
        this.setupDOMReferences();
        this.setupEventListeners();
        this.setupRealtimeValidation();
        
        // Initialize Keychain
        await window.keychainManager.init();
        
        console.log('Hive Account Faucet initialized');
    }

    /**
     * Setup DOM element references
     */
    setupDOMReferences() {
        this.form = document.getElementById('accountRequestForm');
        this.statusMessage = document.getElementById('statusMessage');
        this.submitButton = document.getElementById('submitBtn');
        
        if (!this.form || !this.statusMessage || !this.submitButton) {
            console.error('Required DOM elements not found');
            return;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.form) return;

        // Form submission
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Username availability check (debounced)
        const requestedUsernameField = document.getElementById('requestedUsername');
        
        if (requestedUsernameField) {
            let debounceTimeout;
            requestedUsernameField.addEventListener('input', (e) => {
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => {
                    this.checkUsernameAvailability(e.target.value, 'requested');
                }, 1000);
            });
        }

        // Delivery method help text
        const deliveryMethodField = document.getElementById('deliveryMethod');
        if (deliveryMethodField) {
            deliveryMethodField.addEventListener('change', (e) => {
                this.updateDeliveryMethodInfo(e.target.value);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                if (!this.isProcessing) {
                    this.form.requestSubmit();
                }
            }
        });
    }

    /**
     * Setup real-time validation for form fields
     */
    setupRealtimeValidation() {
        if (!window.formValidator) return;

        // Setup validation for requested username only
        window.formValidator.setupRealtimeValidation('requestedUsername', 'hiveUsername');
    }

    /**
     * Handle form submission
     * @param {Event} event - Form submit event
     */
    async handleFormSubmit(event) {
        event.preventDefault();

        if (this.isProcessing) {
            return;
        }

        // Check Keychain connection
        if (!window.keychainManager.isUserConnected()) {
            this.showStatusMessage('error', 'Not Connected', 'Please connect your Keychain first.');
            return;
        }

        // Clear previous status messages
        this.hideStatusMessage();

        // Validate form
        const validation = window.formValidator.validateForm(this.form);
        if (!validation.isValid) {
            window.formValidator.displayErrors(validation.errors);
            this.showStatusMessage('error', 'Please fix the errors below and try again.');
            return;
        }

        // Clear any validation errors
        window.formValidator.clearErrors();

        // Get form data
        const formData = this.getFormData();

        try {
            this.setProcessingState(true);
            this.showStatusMessage('info', 'Broadcasting to Hive blockchain...', 'Please confirm the transaction in Keychain.');

            // Submit request via Keychain custom JSON
            const response = await window.keychainManager.submitAccountRequest(formData);

            if (response.success) {
                this.currentRequestId = response.requestId;
                
                let successMessage = `Transaction ID: ${response.transactionId}<br>`;
                successMessage += `Request ID: ${response.requestId}<br>`;
                successMessage += `${response.message}`;
                
                this.showStatusMessage(
                    'success',
                    'Request submitted to blockchain!',
                    successMessage
                );

                // Reset form
                this.form.reset();
                
            } else {
                throw new Error(response.message || 'Failed to submit request');
            }

        } catch (error) {
            console.error('Form submission error:', error);
            
            let errorMessage = error.message;
            if (errorMessage.includes('User denied')) {
                errorMessage = 'Transaction was cancelled by user.';
            } else if (errorMessage.includes('Insufficient Resource Credits')) {
                errorMessage = 'Insufficient Resource Credits to broadcast transaction.';
            }
            
            this.showStatusMessage('error', 'Failed to submit request', errorMessage);
        } finally {
            this.setProcessingState(false);
        }
    }

    /**
     * Get form data as object
     * @returns {object} - Form data
     */
    getFormData() {
        const formData = new FormData(this.form);
        const connectedUser = window.keychainManager.getConnectedUser();
        
        return {
            requestingUsername: connectedUser.username, // From Keychain
            requestedUsername: formData.get('requestedUsername'),
            deliveryMethod: formData.get('deliveryMethod'),
            notes: formData.get('notes') || '',
            termsAccepted: formData.get('termsAccepted')
        };
    }



    /**
     * Check username availability
     * @param {string} username - Username to check
     * @param {string} type - Type of username ('requested')
     */
    async checkUsernameAvailability(username, type) {
        // Only check requested username availability
        if (type !== 'requested') return;

        // First validate format
        const validation = window.formValidator.validateHiveUsername(username);
        
        const usernameField = document.getElementById(`${type}Username`);
        const errorElement = document.getElementById(`${type}UsernameError`);
        const successElement = document.getElementById(`${type}UsernameSuccess`);
        
        // Clear previous messages
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
        if (successElement) {
            successElement.textContent = '';
            successElement.style.display = 'none';
        }
        if (usernameField) {
            usernameField.classList.remove('error');
        }

        // If username is empty or too short, don't check availability
        if (!username || username.length < 3) {
            return;
        }

        // Check format validation first
        if (!validation.isValid) {
            if (errorElement) {
                errorElement.textContent = validation.message;
                errorElement.style.display = 'block';
                usernameField.classList.add('error');
            }
            return;
        }

        // Check if it's the same as connected user
        const connectedUser = window.keychainManager?.getConnectedUser();
        if (connectedUser && connectedUser.username && 
            username.toLowerCase() === connectedUser.username.toLowerCase()) {
            if (errorElement) {
                errorElement.textContent = 'The new account name cannot be the same as your connected username.';
                errorElement.style.display = 'block';
                usernameField.classList.add('error');
            }
            return;
        }
        
        // Check availability on Hive blockchain
        await this.checkHiveAccountAvailability(username, usernameField, errorElement, successElement);
    }

    /**
     * Check if account name is available on Hive blockchain
     * @param {string} username - Username to check
     * @param {HTMLElement} field - Input field element
     * @param {HTMLElement} errorElement - Error message element
     * @param {HTMLElement} successElement - Success message element
     */
    async checkHiveAccountAvailability(username, field, errorElement, successElement) {
        try {
            // Add loading indicator
            if (successElement) {
                successElement.textContent = '⏳ Checking availability on Hive blockchain...';
                successElement.style.display = 'block';
                successElement.style.color = 'var(--text-light)';
            }

            // Use the API client to check account availability
            const availability = await window.apiClient.checkAccountAvailability(username);
            
            if (!availability.available) {
                if (errorElement) {
                    errorElement.textContent = 'This username is already taken on Hive.';
                    errorElement.style.display = 'block';
                    field.classList.add('error');
                }
                if (successElement) {
                    successElement.style.display = 'none';
                }
            } else {
                if (successElement) {
                    successElement.textContent = '✓ Username is available on Hive!';
                    successElement.style.display = 'block';
                    successElement.style.color = 'var(--success-color)';
                }
            }
        } catch (error) {
            console.warn('Availability check failed:', error);
            if (successElement) {
                successElement.textContent = '⚠️ Could not check availability - please verify manually';
                successElement.style.color = 'var(--warning-color)';
                successElement.style.display = 'block';
            }
        }
    }

    /**
     * Update delivery method information
     * @param {string} method - Selected delivery method
     */
    updateDeliveryMethodInfo(method) {
        const infoTexts = {
            email: 'Account credentials will be sent to your registered email address.',
            memo: 'Account credentials will be sent as an encrypted memo to your Hive account.',
            both: 'Account credentials will be sent via both your registered email and encrypted Hive memo for redundancy.'
        };

        // You could add a help text element to show this information
        console.log(`Delivery method selected: ${method} - ${infoTexts[method]}`);
    }

    /**
     * Set processing state
     * @param {boolean} processing - Whether form is processing
     */
    setProcessingState(processing) {
        this.isProcessing = processing;

        if (!this.submitButton) return;

        const btnText = this.submitButton.querySelector('.btn-text');
        const btnSpinner = this.submitButton.querySelector('.btn-spinner');

        if (processing) {
            this.submitButton.disabled = true;
            if (btnText) btnText.classList.add('hidden');
            if (btnSpinner) btnSpinner.classList.remove('hidden');
        } else {
            this.submitButton.disabled = false;
            if (btnText) btnText.classList.remove('hidden');
            if (btnSpinner) btnSpinner.classList.add('hidden');
        }
    }

    /**
     * Show status message
     * @param {string} type - Message type (success, error, info, warning)
     * @param {string} title - Message title
     * @param {string} description - Optional description
     */
    showStatusMessage(type, title, description = '') {
        if (!this.statusMessage) return;

        const statusContent = this.statusMessage.querySelector('.status-content');
        const statusIcon = this.statusMessage.querySelector('.status-icon');
        const statusText = this.statusMessage.querySelector('.status-text');

        if (!statusContent || !statusIcon || !statusText) return;

        // Set message content
        statusText.innerHTML = description 
            ? `<strong>${title}</strong><br>${description}`
            : `<strong>${title}</strong>`;

        // Set icon based on type
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        statusIcon.textContent = icons[type] || icons.info;

        // Set CSS classes
        this.statusMessage.className = `status-message ${type}`;
        this.statusMessage.classList.remove('hidden');

        // Scroll to status message
        this.statusMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Hide status message
     */
    hideStatusMessage() {
        if (this.statusMessage) {
            this.statusMessage.classList.add('hidden');
        }
    }
}

// Initialize the application
window.hiveAccountApp = new HiveAccountApp();
