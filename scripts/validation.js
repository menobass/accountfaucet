/**
 * Form Validation Functions for Hive Account Creation
 */

class FormValidator {
    constructor() {
        this.validators = {
            hiveUsername: this.validateHiveUsername.bind(this),
            email: this.validateEmail.bind(this),
            required: this.validateRequired.bind(this),
            url: this.validateUrl.bind(this),
            phone: this.validatePhone.bind(this)
        };
    }

    /**
     * Validate Hive username according to Hive blockchain rules
     * @param {string} username - The username to validate
     * @returns {object} - Validation result with isValid and message
     */
    validateHiveUsername(username) {
        if (!username) {
            return { isValid: false, message: 'Username is required.' };
        }

        // Remove whitespace
        username = username.trim().toLowerCase();

        // Check length (3-16 characters)
        if (username.length < 3) {
            return { isValid: false, message: 'Username must be at least 3 characters long.' };
        }

        if (username.length > 16) {
            return { isValid: false, message: 'Username cannot be longer than 16 characters.' };
        }

        // Check valid characters (lowercase letters, numbers, hyphens)
        const validCharsRegex = /^[a-z0-9-]+$/;
        if (!validCharsRegex.test(username)) {
            return { isValid: false, message: 'Username can only contain lowercase letters, numbers, and hyphens.' };
        }

        // Cannot start or end with hyphen
        if (username.startsWith('-') || username.endsWith('-')) {
            return { isValid: false, message: 'Username cannot start or end with a hyphen.' };
        }

        // Cannot have consecutive hyphens
        if (username.includes('--')) {
            return { isValid: false, message: 'Username cannot contain consecutive hyphens.' };
        }

        // Check for reserved words or patterns
        const reservedPatterns = [
            /^hive/i,
            /^steem/i,
            /^admin/i,
            /^system/i,
            /^null$/i,
            /^test$/i,
            /^api$/i,
            /^www$/i,
            /^blog$/i,
            /^wallet$/i
        ];

        for (const pattern of reservedPatterns) {
            if (pattern.test(username)) {
                return { isValid: false, message: 'This username contains reserved words and cannot be used.' };
            }
        }

        return { isValid: true, message: '' };
    }

    /**
     * Validate email address
     * @param {string} email - The email to validate
     * @returns {object} - Validation result
     */
    validateEmail(email) {
        if (!email) {
            return { isValid: false, message: 'Email address is required.' };
        }

        email = email.trim();

        // Basic email regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { isValid: false, message: 'Please enter a valid email address.' };
        }

        // Check length
        if (email.length > 254) {
            return { isValid: false, message: 'Email address is too long.' };
        }

        return { isValid: true, message: '' };
    }

    /**
     * Validate required fields
     * @param {string} value - The value to validate
     * @param {string} fieldName - Name of the field for error message
     * @returns {object} - Validation result
     */
    validateRequired(value, fieldName = 'This field') {
        if (!value || value.trim() === '') {
            return { isValid: false, message: `${fieldName} is required.` };
        }
        return { isValid: true, message: '' };
    }

    /**
     * Validate URL
     * @param {string} url - The URL to validate
     * @returns {object} - Validation result
     */
    validateUrl(url) {
        if (!url || url.trim() === '') {
            return { isValid: true, message: '' }; // URL is optional
        }

        url = url.trim();

        try {
            new URL(url);
            return { isValid: true, message: '' };
        } catch {
            return { isValid: false, message: 'Please enter a valid URL (e.g., https://example.com).' };
        }
    }

    /**
     * Validate phone number (optional field, flexible format)
     * @param {string} phone - The phone number to validate
     * @returns {object} - Validation result
     */
    validatePhone(phone) {
        if (!phone || phone.trim() === '') {
            return { isValid: true, message: '' }; // Phone is optional
        }

        phone = phone.trim();

        // Remove common formatting characters
        const cleanPhone = phone.replace(/[\s\-\(\)\+\.]/g, '');

        // Check if it contains only digits after cleaning
        if (!/^\d+$/.test(cleanPhone)) {
            return { isValid: false, message: 'Phone number should contain only numbers and common formatting characters.' };
        }

        // Check reasonable length (7-15 digits)
        if (cleanPhone.length < 7 || cleanPhone.length > 15) {
            return { isValid: false, message: 'Phone number should be between 7 and 15 digits.' };
        }

        return { isValid: true, message: '' };
    }

    /**
     * Validate entire form
     * @param {HTMLFormElement} form - The form to validate
     * @returns {object} - Validation result with errors object
     */
    validateForm(form) {
        const formData = new FormData(form);
        const errors = {};
        let isValid = true;

        // Validate requested username
        const requestedUsername = formData.get('requestedUsername');
        const requestedUsernameResult = this.validateHiveUsername(requestedUsername);
        if (!requestedUsernameResult.isValid) {
            errors.requestedUsername = requestedUsernameResult.message;
            isValid = false;
        }

        // Check if requested username is the same as connected user (if available)
        const connectedUser = window.keychainManager?.getConnectedUser();
        if (connectedUser && connectedUser.username && requestedUsername && 
            connectedUser.username.toLowerCase() === requestedUsername.toLowerCase()) {
            errors.requestedUsername = 'The new account name cannot be the same as your connected username.';
            isValid = false;
        }

        // Validate terms acceptance
        const termsAccepted = formData.get('termsAccepted');
        if (!termsAccepted) {
            errors.termsAccepted = 'You must confirm authorization to continue.';
            isValid = false;
        }

        return { isValid, errors };
    }

    /**
     * Display validation errors in the form
     * @param {object} errors - Object containing field errors
     */
    displayErrors(errors) {
        // Clear previous errors
        this.clearErrors();

        // Display new errors
        Object.keys(errors).forEach(fieldName => {
            const errorElement = document.getElementById(`${fieldName}Error`) || 
                                document.getElementById(`${fieldName.replace(/([A-Z])/g, (match, letter) => letter.toLowerCase())}Error`);
            
            if (errorElement) {
                errorElement.textContent = errors[fieldName];
                errorElement.style.display = 'block';
            }

            // Add error styling to input
            const inputElement = document.getElementById(fieldName) || 
                               document.querySelector(`[name="${fieldName}"]`);
            if (inputElement) {
                inputElement.classList.add('error');
                inputElement.setAttribute('aria-invalid', 'true');
                inputElement.setAttribute('aria-describedby', `${fieldName}Error`);
            }
        });
    }

    /**
     * Clear all validation errors
     */
    clearErrors() {
        // Clear error messages
        const errorElements = document.querySelectorAll('.field-error');
        errorElements.forEach(element => {
            element.textContent = '';
            element.style.display = 'none';
        });

        // Remove error styling from inputs
        const inputElements = document.querySelectorAll('.error');
        inputElements.forEach(element => {
            element.classList.remove('error');
            element.removeAttribute('aria-invalid');
            element.removeAttribute('aria-describedby');
        });
    }

    /**
     * Setup real-time validation for a field
     * @param {string} fieldId - The ID of the field to validate
     * @param {string} validatorType - The type of validator to use
     */
    setupRealtimeValidation(fieldId, validatorType) {
        const field = document.getElementById(fieldId);
        if (!field || !this.validators[validatorType]) return;

        const validator = this.validators[validatorType];
        const errorElement = document.getElementById(`${fieldId}Error`);

        // Validate on blur
        field.addEventListener('blur', () => {
            const result = validatorType === 'required' 
                ? validator(field.value, field.getAttribute('data-field-name') || 'This field')
                : validator(field.value);

            if (errorElement) {
                if (!result.isValid) {
                    errorElement.textContent = result.message;
                    errorElement.style.display = 'block';
                    field.classList.add('error');
                    field.setAttribute('aria-invalid', 'true');
                } else {
                    errorElement.textContent = '';
                    errorElement.style.display = 'none';
                    field.classList.remove('error');
                    field.removeAttribute('aria-invalid');
                }
            }
        });

        // Clear errors on focus
        field.addEventListener('focus', () => {
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.style.display = 'none';
                field.classList.remove('error');
                field.removeAttribute('aria-invalid');
            }
        });
    }
}

// Create global instance
window.formValidator = new FormValidator();
