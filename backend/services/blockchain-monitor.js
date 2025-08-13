const { Client, PrivateKey } = require('@hiveio/dhive');
const hive = require('@hiveio/hive-js'); // For proper memo encryption (hive-js has working memo.encode)
const fs = require('fs');
const path = require('path');
const UserManager = require('./user-manager');
const EmailService = require('./email-service');
require('dotenv').config();

class BlockchainMonitor {
    constructor() {
        // Configure hive-js API endpoint to match dhive (consistency)
        hive.api.setOptions({ url: process.env.HIVE_NODE_URL || 'https://api.hive.blog' });

        this.client = new Client([
            process.env.HIVE_NODE_URL || 'https://api.hive.blog',
            'https://api.hivekings.com',
            'https://anyx.io'
        ]);

        this.userManager = new UserManager();
        this.emailService = new EmailService();
        this.isRunning = false;
    this.lastProcessedBlock = 0; // Will be set by loadLastBlock() or env fallback
    this.blockSaveInterval = parseInt(process.env.BLOCK_SAVE_INTERVAL) || 20; // save every N blocks

        // Faucet operator credentials
        this.creatingAccount = process.env.CREATING_ACCOUNT_USERNAME;
        this.creatingActiveKey = process.env.CREATING_ACCOUNT_ACTIVE_KEY; // Needed for create_claimed_account + transfer
        this.creatingPostingKey = process.env.CREATING_ACCOUNT_POSTING_KEY; // (unused currently, reserved for future)
        this.creatingMemoKey = process.env.CREATING_ACCOUNT_MEMO_KEY; // Private memo key (starts with 5...)

        // Basic validation of required keys
        if (!this.creatingAccount) console.warn('⚠️  Missing CREATING_ACCOUNT_USERNAME');
        if (!this.creatingActiveKey || this.creatingActiveKey === 'your_active_key_here') console.warn('⚠️  Missing CREATING_ACCOUNT_ACTIVE_KEY');
        if (!this.creatingMemoKey || this.creatingMemoKey === 'your_memo_key_here') console.warn('⚠️  Missing CREATING_ACCOUNT_MEMO_KEY (needed for encrypted memos)');

        // Prepare recovery store (so we never “lose” generated credentials again)
        this.recoveryDir = path.join(__dirname, '..', 'data');
        this.recoveryFile = path.join(this.recoveryDir, 'pending_credentials.json');
        this.lastBlockFile = path.join(this.recoveryDir, 'last_block.json');
        this.ensureRecoveryFile();

        // Load last processed block from disk (for crash / reboot resilience)
        this.loadLastBlock();
        if (this.lastProcessedBlock === 0) {
            // fallback to env variable if provided
            const envBlock = parseInt(process.env.LAST_PROCESSED_BLOCK) || 0;
            if (envBlock > 0) {
                this.lastProcessedBlock = envBlock;
                console.log(`🗂️  Using LAST_PROCESSED_BLOCK from env: ${envBlock}`);
            }
        } else {
            console.log(`🗂️  Resuming from persisted block: ${this.lastProcessedBlock}`);
        }

        console.log('🔗 Blockchain Monitor initialized');
        console.log(`🏭 Faucet account: @${this.creatingAccount || 'NOT SET'}`);
    }

    ensureRecoveryFile() {
        try {
            if (!fs.existsSync(this.recoveryDir)) fs.mkdirSync(this.recoveryDir, { recursive: true });
            if (!fs.existsSync(this.recoveryFile)) fs.writeFileSync(this.recoveryFile, JSON.stringify({ pending: [] }, null, 2));
        } catch (e) {
            console.warn('⚠️  Could not prepare recovery file:', e.message);
        }
    }

    loadPending() {
        try {
            const raw = fs.readFileSync(this.recoveryFile, 'utf8');
            return JSON.parse(raw).pending || [];
        } catch {
            return [];
        }
    }

    savePending(list) {
        try {
            fs.writeFileSync(this.recoveryFile, JSON.stringify({ pending: list }, null, 2));
        } catch (e) {
            console.warn('⚠️  Failed to write recovery file:', e.message);
        }
    }

    addPending(record) {
        const list = this.loadPending();
        list.push(record);
        this.savePending(list);
    }

    removePending(username) {
        const list = this.loadPending().filter(r => r.username !== username);
        this.savePending(list);
    }

    loadLastBlock() {
        try {
            if (fs.existsSync(this.lastBlockFile)) {
                const raw = fs.readFileSync(this.lastBlockFile, 'utf8');
                const data = JSON.parse(raw);
                if (data && typeof data.lastProcessedBlock === 'number') {
                    this.lastProcessedBlock = data.lastProcessedBlock;
                }
            }
        } catch (e) {
            console.warn('⚠️  Could not load last_block.json:', e.message);
        }
    }

    saveLastBlock(force = false) {
        try {
            if (!this.lastProcessedBlock || this.lastProcessedBlock <= 0) return;
            if (!force && this._lastSavedBlock === this.lastProcessedBlock) return; // no change
            const tmp = this.lastBlockFile + '.tmp';
            const payload = JSON.stringify({ lastProcessedBlock: this.lastProcessedBlock, savedAt: new Date().toISOString() }, null, 2);
            fs.writeFileSync(tmp, payload);
            fs.renameSync(tmp, this.lastBlockFile);
            this._lastSavedBlock = this.lastProcessedBlock;
        } catch (e) {
            console.warn('⚠️  Failed to save last processed block:', e.message);
        }
    }

    /**
     * Start monitoring the Hive blockchain for custom JSON operations
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️  Monitor already running');
            return;
        }

        console.log('🚀 Starting blockchain monitor...');
        this.isRunning = true;

        try {
            // Get current head block if we don't have a starting point
            if (this.lastProcessedBlock === 0) {
                const props = await this.client.database.getDynamicGlobalProperties();
                this.lastProcessedBlock = props.head_block_number - 1;
                console.log(`📍 Starting from block: ${this.lastProcessedBlock}`);
            }

            // Start streaming blocks
            await this.streamBlocks();
        } catch (error) {
            console.error('❌ Error starting monitor:', error);
            this.isRunning = false;
        }
    }

    /**
     * Stream Hive blocks and process custom JSON operations
     */
    async streamBlocks() {
        console.log('📡 Starting block stream...');
        
        while (this.isRunning) {
            try {
                // Get next block
                const nextBlock = this.lastProcessedBlock + 1;
                const block = await this.client.database.getBlock(nextBlock);
                
                if (block) {
                    await this.processBlock(block, nextBlock);
                    this.lastProcessedBlock = nextBlock;
                    // Periodically persist progress
                    if (nextBlock % this.blockSaveInterval === 0) {
                        this.saveLastBlock();
                    }
                } else {
                    // No new block yet, wait a bit
                    await this.sleep(3000); // Wait 3 seconds
                }
            } catch (error) {
                console.error(`❌ Error processing block ${this.lastProcessedBlock + 1}:`, error);
                await this.sleep(5000); // Wait 5 seconds on error
            }
        }
    }

    /**
     * Process a single block for our custom JSON operations
     */
    async processBlock(block, blockNumber) {
        if (!block.transactions || block.transactions.length === 0) {
            return;
        }

        console.log(`🔍 Processing block ${blockNumber} (${block.transactions.length} transactions)`);

        for (const transaction of block.transactions) {
            for (const operation of transaction.operations) {
                // Look for custom_json operations
                if (operation[0] === 'custom_json') {
                    await this.processCustomJson(operation[1], blockNumber, transaction.transaction_id);
                }
            }
        }
    }

    /**
     * Process custom JSON operations looking for our faucet requests
     */
    async processCustomJson(operation, blockNumber, transactionId) {
        try {
            // Check if this is our custom JSON ID
            if (operation.id !== 'hive_account_faucet') {
                return;
            }

            // Parse the JSON data first
            const requestData = JSON.parse(operation.json);
            const requester = operation.required_posting_auths[0] || operation.required_auths[0];
            
            // Validate the request format
            if (this.validateRequest(requestData)) {
                // Display the formatted request details
                this.displayRequestFound(requestData, requester, blockNumber, transactionId);
                
                // Process the account creation request
                await this.processAccountRequest({
                    ...requestData,
                    blockNumber,
                    transactionId,
                    requester
                });
            } else {
                console.log('❌ INVALID REQUEST FORMAT DETECTED');
                console.log(`📋 Block: ${blockNumber}, TX: ${transactionId}`);
                console.log(`👤 From: ${requester}`);
                console.log('📄 Raw data:', requestData);
            }

        } catch (error) {
            console.error('❌ Error processing custom JSON:', error);
            console.error(`📋 Block: ${blockNumber}, TX: ${transactionId}`);
        }
    }

    /**
     * Display a nicely formatted request found message
     */
    displayRequestFound(requestData, requester, blockNumber, transactionId) {
        console.log('\n' + '='.repeat(60));
        console.log('🎯 ACCOUNT CREATION REQUEST FOUND!');
        console.log('='.repeat(60));
        console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
        console.log(`📋 Block: ${blockNumber}`);
        console.log(`🔗 Transaction ID: ${transactionId}`);
        console.log('');
        console.log(`Request Found from user: ${requester}`);
        console.log(`Requesting Creation of Account: ${requestData.data.requested_username}`);
        console.log(`Delivery Method: ${requestData.data.delivery_method}`);
        
        if (requestData.data.email) {
            console.log(`Email: ${requestData.data.email}`);
        }
        
        if (requestData.data.notes) {
            console.log(`Notes: ${requestData.data.notes}`);
        } else {
            console.log('Notes: (none provided)');
        }
        
        console.log('');
        console.log('📊 Request Details:');
        console.log(`   • App: ${requestData.app}`);
        console.log(`   • Version: ${requestData.version}`);
        console.log(`   • Action: ${requestData.action}`);
        console.log(`   • Request Time: ${requestData.data.timestamp}`);
        console.log('='.repeat(60));
        console.log('');
    }

    /**
     * Validate custom JSON request format
     */
    validateRequest(data) {
        return (
            data.app === 'hive_account_faucet' &&
            data.version === '1.0.0' &&
            data.action === 'create_account_request' &&
            data.data &&
            data.data.requested_username &&
            data.data.delivery_method
        );
    }

    /**
     * Process a valid account creation request
     */
    async processAccountRequest(request) {
        console.log('🏭 PROCESSING ACCOUNT CREATION REQUEST...');
        console.log('');
        console.log('📝 Request Summary:');
        console.log(`   👤 Requester: ${request.requester}`);
        console.log(`   🆕 New Account: ${request.data.requested_username}`);
        console.log(`   📧 Delivery: ${request.data.delivery_method}`);
        console.log(`   📋 Block: ${request.blockNumber}`);
        console.log(`   🔗 TX: ${request.transactionId}`);
        console.log('');

        // Step 1: Check authorization
        console.log('🔐 STEP 1: Checking authorization...');
        const authCheck = this.userManager.checkAuthorization(request.requester);
        
        if (!authCheck.authorized) {
            console.log(`❌ AUTHORIZATION FAILED: ${authCheck.reason}`);
            if (authCheck.tokens_allocated) {
                console.log(`   📊 User has used ${authCheck.tokens_used}/${authCheck.tokens_allocated} tokens`);
            }
            console.log('🚫 REQUEST REJECTED');
            console.log('=' .repeat(60));
            console.log('');
            return;
        }

        console.log('✅ AUTHORIZATION SUCCESSFUL');
        console.log(`   📊 Tokens: ${authCheck.tokens_used}/${authCheck.tokens_allocated} used`);
        console.log(`   🎫 Remaining tokens: ${authCheck.tokens_remaining}`);
        console.log('');

        // Step 2: Create REAL Hive Account
        console.log('🔨 STEP 2: Creating REAL Hive account...');
        const masterPassword = this.generateMasterPassword();
        const keys = this.generateAccountKeys(request.data.requested_username, masterPassword);
        
        const accountCreationResult = await this.createHiveAccount(
            request.data.requested_username,
            keys,
            this.creatingAccount,
            this.creatingActiveKey
        );

        if (!accountCreationResult.success) {
            console.log('❌ ACCOUNT CREATION FAILED');
            console.log(`   Error: ${accountCreationResult.error}`);
            console.log('🚫 REQUEST REJECTED - No token deducted');
            console.log('=' .repeat(60));
            console.log('');
            return;
        }

        console.log('✅ Account created successfully on blockchain');
        console.log(`   👤 Username: ${accountCreationResult.username}`);
    console.log(`   🔗 Transaction: ${accountCreationResult.transactionId}`);
        console.log('');

        // Create account data object for delivery
        const accountData = {
            username: request.data.requested_username,
            masterPassword: masterPassword,
            ownerKey: keys.ownerKey,
            activeKey: keys.activeKey,
            postingKey: keys.postingKey,
            memoKey: keys.memoKey,
            transactionId: accountCreationResult.transactionId,
            requester: request.requester
        };

        // Persist credentials to recovery store BEFORE attempting delivery
        this.addPending({
            username: accountData.username,
            created_at: new Date().toISOString(),
            requester: accountData.requester,
            masterPassword: accountData.masterPassword,
            ownerKey: accountData.ownerKey,
            activeKey: accountData.activeKey,
            postingKey: accountData.postingKey,
            memoKey: accountData.memoKey,
            transactionId: accountData.transactionId
        });

        // Step 3: Credential delivery
        const deliveryMethod = request.data.delivery_method;
        console.log('📧 STEP 3: Delivering credentials...');
        console.log(`   � Requested: ${deliveryMethod}`);

        let emailResult = { success: false };
        let memoResult = { success: false };
        // Avoid optional chaining for older Node versions
        const requesterEmail = (authCheck.user_info && authCheck.user_info.email)
            ? authCheck.user_info.email
            : null;

        // EMAIL
        if (deliveryMethod === 'email' || deliveryMethod === 'both') {
            if (requesterEmail && requesterEmail.trim()) {
                console.log(`📧 Attempting email delivery to ${requesterEmail}`);
                emailResult = await this.emailService.sendAccountCredentials(requesterEmail, accountData);
            } else {
                console.log('❌ No registered email for requester');
                emailResult = { success: false, error: 'No registered email' };
            }
        } else {
            console.log('📧 Email not requested');
        }

        // MEMO
        if (deliveryMethod === 'hive_memo' || deliveryMethod === 'both') {
            console.log('📝 Attempting encrypted memo delivery...');
            const canSend = await this.canSendMemo(this.creatingAccount);
            if (!canSend) {
                console.log('⚠️  Insufficient HBD balance for memo transfer (need ≥ 0.001)');
                memoResult = { success: false, error: 'Insufficient HBD for memo transfer' };
            } else if (!this.creatingMemoKey) {
                console.log('⚠️  Missing faucet memo private key');
                memoResult = { success: false, error: 'Missing faucet memo key' };
            } else {
                memoResult = await this.sendAccountMemo(request.requester, accountData);
            }
        } else {
            console.log('📝 Memo not requested');
        }

        const overallSuccess = (deliveryMethod === 'both')
            ? (emailResult.success && memoResult.success) // For BOTH require both to truly succeed
            : (emailResult.success || memoResult.success);

        console.log('📊 DELIVERY SUMMARY');
        console.log(`   📧 Email: ${emailResult.success ? '✅' : '❌'}${emailResult.error ? ' (' + emailResult.error + ')' : ''}`);
        console.log(`   📝 Memo: ${memoResult.success ? '✅' : '❌'}${memoResult.error ? ' (' + memoResult.error + ')' : ''}`);

        if (overallSuccess) {
            console.log('✅ Delivery success criteria met');
            console.log('🎫 STEP 4: Deducting token...');
            const tokenUsed = this.userManager.useToken(request.requester);
            if (tokenUsed) {
                console.log('✅ Token deducted');
            } else {
                console.log('⚠️  Token deduction failed');
            }
            // Remove from recovery store only after at least one successful delivery path (or both if required)
            this.removePending(accountData.username);
            console.log('🎉 ACCOUNT CREATION FLOW COMPLETE');
        } else {
            console.log('🚨 DELIVERY FAILED – credentials retained in recovery store for manual retrieval');
        }

        console.log('='.repeat(60));
        console.log('');
    }

    /**
     * Send encrypted memo with account credentials
     */
    async sendAccountMemo(recipientUsername, accountData) {
        try {
            console.log(`📝 Sending encrypted memo to @${recipientUsername}`);
            
            // Create the memo message (short and clean)
            const memoMessage = `Account created: ${accountData.username}\nMaster Password: ${accountData.masterPassword}\n\nImport this to Keychain to access your account.`;
            
            // Get recipient's public memo key using hive-js
            return new Promise((resolve, reject) => {
                hive.api.getAccounts([recipientUsername], (err, result) => {
                    if (err) {
                        console.error('❌ Error fetching recipient account:', err);
                        resolve({ success: false, error: err.message });
                        return;
                    }

                    if (!result || result.length === 0) {
                        const error = `Recipient account @${recipientUsername} not found`;
                        console.error('❌', error);
                        resolve({ success: false, error });
                        return;
                    }

                    const recipientMemoKey = result[0].memo_key;
                    console.log(`   🔑 Recipient memo key: ${recipientMemoKey}`);

                    try {
                        // Encrypt the memo using hive-js (PROPER encryption with # prefix)
                        const encryptedMemo = hive.memo.encode(
                            this.creatingMemoKey, 
                            recipientMemoKey, 
                            `#${memoMessage}`
                        );
                        
                        console.log(`   🔒 Memo encrypted successfully`);
                        console.log(`   📏 Encrypted length: ${encryptedMemo.length} characters`);
                        
                        // Verify encryption worked (should not contain plain text)
                        if (encryptedMemo.includes(accountData.username) || encryptedMemo.includes(accountData.masterPassword)) {
                            console.error('🚨 SECURITY ALERT: Memo encryption failed - contains plain text!');
                            resolve({ success: false, error: 'Memo encryption failed - security risk detected' });
                            return;
                        }
                        
                        console.log(`   ✅ Memo properly encrypted (no plain text visible)`);

                        // Send via transfer using hive-js
                        hive.broadcast.transfer(
                            this.creatingActiveKey, // Sign with active key
                            this.creatingAccount,    // From
                            recipientUsername,       // To
                            '0.001 HBD',            // Amount
                            encryptedMemo,          // Encrypted memo
                            (transferErr, transferResult) => {
                                if (transferErr) {
                                    console.error('❌ Error sending memo transfer:', transferErr);
                                    resolve({ success: false, error: transferErr.message });
                                } else {
                                    console.log(`   🎉 Encrypted memo sent successfully!`);
                                    console.log(`   🔗 Transfer TX: ${transferResult.id}`);
                                    console.log(`   📦 Block: ${transferResult.block_num}`);
                                    resolve({ 
                                        success: true, 
                                        method: 'memo',
                                        transactionId: transferResult.id,
                                        blockNum: transferResult.block_num
                                    });
                                }
                            }
                        );

                    } catch (encryptError) {
                        console.error('❌ Memo encryption error:', encryptError);
                        resolve({ success: false, error: encryptError.message });
                    }
                });
            });
            
        } catch (error) {
            console.error('❌ Error in sendAccountMemo:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check HBD balance for memo sending capability
     */
    async checkHBDBalance(username) {
        try {
            const accounts = await this.client.database.getAccounts([username]);
            if (accounts.length === 0) {
                console.log(`⚠️  Account @${username} not found`);
                return 0;
            }

            const account = accounts[0];
            const hbdBalance = parseFloat(account.hbd_balance.split(' ')[0]);
            console.log(`💰 @${username} HBD balance: ${hbdBalance} HBD`);
            return hbdBalance;
        } catch (error) {
            console.error('❌ Error checking HBD balance:', error);
            return 0;
        }
    }

    /**
     * Check if account has sufficient HBD for memo (for transfer-based memo delivery)
     */
    async canSendMemo(username) {
        const balance = await this.checkHBDBalance(username);
        const minimumRequired = 0.001; // Minimum for transfer with memo (if we use transfer method)
        console.log(`   📋 Required: ${minimumRequired} HBD, Available: ${balance} HBD`);
        
        // Note: If using custom JSON for memo, no HBD is required
        // But if using transfer with memo, minimum transfer amount is needed
        return balance >= minimumRequired;
    }

    /**
     * Generate secure master password for Hive account (real format)
     */
    generateMasterPassword() {
        // Hive uses Base58 characters (no 0, O, I, l to avoid confusion)
        const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        
        // Generate cryptographically secure random bytes
        const crypto = require('crypto');
        const randomBytes = crypto.randomBytes(32); // 256 bits of entropy
        
        // Convert to Base58-like format
        let password = 'P5'; // Hive convention prefix
        
        // Generate 50 more characters from the random bytes
        for (let i = 0; i < 50; i++) {
            const randomIndex = randomBytes[i % randomBytes.length] % base58Chars.length;
            password += base58Chars[randomIndex];
        }
        
        return password;
    }

    /**
     * Check if username is available on Hive blockchain
     */
    async checkUsernameAvailability(username) {
        try {
            const accounts = await this.client.database.getAccounts([username]);
            return accounts.length === 0; // Available if not found
        } catch (error) {
            console.error('Error checking username availability:', error);
            return false;
        }
    }

    /**
     * Create actual Hive account using Account Creation Tokens
     */
    async createHiveAccount(username, keys, creatorAccount, creatorActiveKey) {
        try {
            console.log(`🔨 Creating account @${username} on Hive blockchain...`);
            
            // Check username availability first
            const isAvailable = await this.checkUsernameAvailability(username);
            if (!isAvailable) {
                throw new Error(`Username @${username} is already taken`);
            }
            console.log(`✅ Username @${username} is available`);

            // Create the account creation operation using ACTs
            const accountCreateOp = [
                'create_claimed_account',
                {
                    creator: creatorAccount,
                    new_account_name: username,
                    owner: {
                        weight_threshold: 1,
                        account_auths: [],
                        key_auths: [[keys.ownerPublic, 1]]
                    },
                    active: {
                        weight_threshold: 1,
                        account_auths: [],
                        key_auths: [[keys.activePublic, 1]]
                    },
                    posting: {
                        weight_threshold: 1,
                        account_auths: [],
                        key_auths: [[keys.postingPublic, 1]]
                    },
                    memo_key: keys.memoPublic,
                    json_metadata: JSON.stringify({
                        profile: {
                            name: username,
                            about: `Account created by ${creatorAccount}`,
                            created: new Date().toISOString()
                        }
                    }),
                    extensions: []
                }
            ];

            // Sign and broadcast the transaction
            const privateKey = PrivateKey.fromString(creatorActiveKey);
            const result = await this.client.broadcast.sendOperations([accountCreateOp], privateKey);
            
            console.log(`✅ Account @${username} created successfully!`);
            console.log(`🔗 Transaction ID: ${result.id}`);
            
            return { 
                success: true, 
                transactionId: result.id,
                username: username 
            };
            
        } catch (error) {
            console.error(`❌ Error creating account @${username}:`, error.message);
            return { 
                success: false, 
                error: error.message,
                username: username 
            };
        }
    }

    /**
     * Generate real Hive account keys from master password
     */
    generateAccountKeys(username, masterPassword) {
        const { PrivateKey } = require('@hiveio/dhive');
        
        // Derive keys using Hive's standard derivation method
        const ownerKey = PrivateKey.fromSeed(`${username}owner${masterPassword}`);
        const activeKey = PrivateKey.fromSeed(`${username}active${masterPassword}`);
        const postingKey = PrivateKey.fromSeed(`${username}posting${masterPassword}`);
        const memoKey = PrivateKey.fromSeed(`${username}memo${masterPassword}`);
        
        return {
            masterPassword: masterPassword,
            ownerKey: ownerKey.toString(),
            activeKey: activeKey.toString(),
            postingKey: postingKey.toString(),
            memoKey: memoKey.toString(),
            // Also include public keys for account creation
            ownerPublic: ownerKey.createPublic().toString(),
            activePublic: activeKey.createPublic().toString(),
            postingPublic: postingKey.createPublic().toString(),
            memoPublic: memoKey.createPublic().toString()
        };
    }

    /**
     * Generate mock account data for testing (now with real key derivation)
     */
    generateMockAccountData(username, requester) {
        const masterPassword = this.generateMasterPassword();
        const keys = this.generateAccountKeys(username, masterPassword);
        
        return {
            username: username,
            masterPassword: masterPassword,
            ownerKey: keys.ownerKey,
            activeKey: keys.activeKey,
            postingKey: keys.postingKey,
            memoKey: keys.memoKey,
            ownerPublic: keys.ownerPublic,
            activePublic: keys.activePublic,
            postingPublic: keys.postingPublic,
            memoPublic: keys.memoPublic,
            requester: requester
        };
    }

    /**
     * Stop the blockchain monitor
     */
    stop() {
        console.log('🛑 Stopping blockchain monitor...');
    // Force save current block height for resume
    this.saveLastBlock(true);
        this.isRunning = false;
    }

    /**
     * Sleep utility function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = BlockchainMonitor;
