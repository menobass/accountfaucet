const fs = require('fs');
const path = require('path');

class UserManager {
    constructor() {
        this.dataFile = path.join(__dirname, '../data/authorized_users.json');
        this.ensureDataFile();
    }

    /**
     * Ensure the data file exists
     */
    ensureDataFile() {
        const dataDir = path.dirname(this.dataFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        if (!fs.existsSync(this.dataFile)) {
            const initialData = {
                authorized_users: {},
                metadata: {
                    created_at: new Date().toISOString(),
                    last_updated: new Date().toISOString(),
                    total_users: 0,
                    total_tokens_allocated: 0,
                    total_tokens_used: 0
                }
            };
            this.saveData(initialData);
        }
    }

    /**
     * Load user data from JSON file
     */
    loadData() {
        try {
            const data = fs.readFileSync(this.dataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading user data:', error);
            return null;
        }
    }

    /**
     * Save user data to JSON file
     */
    saveData(data) {
        try {
            data.metadata.last_updated = new Date().toISOString();
            fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('Error saving user data:', error);
            return false;
        }
    }

    /**
     * Check if a user is authorized and has tokens available
     */
    checkAuthorization(username) {
        const data = this.loadData();
        if (!data || !data.authorized_users) {
            return { authorized: false, reason: 'Database error' };
        }

        const user = data.authorized_users[username];
        if (!user) {
            return { 
                authorized: false, 
                reason: 'User not found in authorized list' 
            };
        }

        if (!user.is_active) {
            return { 
                authorized: false, 
                reason: 'User account is deactivated' 
            };
        }

        if (user.tokens_remaining <= 0) {
            return { 
                authorized: false, 
                reason: 'No tokens remaining',
                tokens_used: user.tokens_used,
                tokens_allocated: user.tokens_allocated
            };
        }

        return { 
            authorized: true, 
            tokens_remaining: user.tokens_remaining,
            tokens_used: user.tokens_used,
            tokens_allocated: user.tokens_allocated,
            user_info: user
        };
    }

    /**
     * Use a token for a user (when account is successfully created)
     */
    useToken(username) {
        const data = this.loadData();
        if (!data || !data.authorized_users[username]) {
            return false;
        }

        const user = data.authorized_users[username];
        if (user.tokens_remaining <= 0) {
            return false;
        }

        user.tokens_used += 1;
        user.tokens_remaining -= 1;
        user.last_used = new Date().toISOString();
        
        // Update metadata
        data.metadata.total_tokens_used += 1;

        return this.saveData(data);
    }

    /**
     * Add a new authorized user
     */
    addUser(username, tokens = 5, email = null, notes = '') {
        const data = this.loadData();
        if (!data) return false;

        if (data.authorized_users[username]) {
            return { success: false, message: 'User already exists' };
        }

        data.authorized_users[username] = {
            tokens_allocated: tokens,
            tokens_used: 0,
            tokens_remaining: tokens,
            email: email,
            created_at: new Date().toISOString(),
            last_used: null,
            is_active: true,
            notes: notes
        };

        // Update metadata
        data.metadata.total_users += 1;
        data.metadata.total_tokens_allocated += tokens;

        const saved = this.saveData(data);
        return { 
            success: saved, 
            message: saved ? `User ${username} added with ${tokens} tokens` : 'Failed to save'
        };
    }

    /**
     * Give tokens to a user
     */
    giveTokens(username, additionalTokens) {
        const data = this.loadData();
        if (!data || !data.authorized_users[username]) {
            return { success: false, message: 'User not found' };
        }

        const user = data.authorized_users[username];
        user.tokens_allocated += additionalTokens;
        user.tokens_remaining += additionalTokens;

        // Update metadata
        data.metadata.total_tokens_allocated += additionalTokens;

        const saved = this.saveData(data);
        return { 
            success: saved, 
            message: saved ? `Added ${additionalTokens} tokens to ${username}. New total: ${user.tokens_allocated}` : 'Failed to save'
        };
    }

    /**
     * Set user token allocation
     */
    setTokens(username, newTotal) {
        const data = this.loadData();
        if (!data || !data.authorized_users[username]) {
            return { success: false, message: 'User not found' };
        }

        const user = data.authorized_users[username];
        const difference = newTotal - user.tokens_allocated;
        
        user.tokens_allocated = newTotal;
        user.tokens_remaining = newTotal - user.tokens_used;

        // Update metadata
        data.metadata.total_tokens_allocated += difference;

        const saved = this.saveData(data);
        return { 
            success: saved, 
            message: saved ? `Set ${username} tokens to ${newTotal}. Remaining: ${user.tokens_remaining}` : 'Failed to save'
        };
    }

    /**
     * Deactivate/activate a user
     */
    setUserStatus(username, isActive) {
        const data = this.loadData();
        if (!data || !data.authorized_users[username]) {
            return { success: false, message: 'User not found' };
        }

        data.authorized_users[username].is_active = isActive;
        const saved = this.saveData(data);
        return { 
            success: saved, 
            message: saved ? `User ${username} ${isActive ? 'activated' : 'deactivated'}` : 'Failed to save'
        };
    }

    /**
     * Get all users
     */
    getAllUsers() {
        const data = this.loadData();
        if (!data) return null;
        return data;
    }

    /**
     * Get user info
     */
    getUser(username) {
        const data = this.loadData();
        if (!data || !data.authorized_users[username]) {
            return null;
        }
        return data.authorized_users[username];
    }
}

module.exports = UserManager;
