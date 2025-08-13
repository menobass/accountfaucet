/**
 * Simple script to check Account Creation Tokens (ACTs) for an account
 */

const { Client } = require('@hiveio/dhive');
require('dotenv').config();

// Initialize Hive client
const client = new Client([
    process.env.HIVE_NODE_URL || 'https://api.hive.blog',
    'https://api.hivekings.com',
    'https://anyx.io'
]);

async function checkAccountCreationTokens(username) {
    try {
        console.log(`🔍 Checking Account Creation Tokens for @${username}...`);
        console.log('');

        // Get account data
        const accounts = await client.database.getAccounts([username]);
        
        if (accounts.length === 0) {
            console.log(`❌ Account @${username} not found!`);
            return;
        }

        const account = accounts[0];
        
        // Display account creation token information
        console.log('📊 ACCOUNT CREATION TOKEN STATUS:');
        console.log('=' .repeat(50));
        console.log(`👤 Account: @${username}`);
        console.log(`🎫 Pending ACTs: ${account.pending_claimed_accounts || 0}`);
        console.log(`⏰ Can claim free account: ${account.can_vote ? 'Yes' : 'No'}`);
        console.log('');
        
        // Also show other relevant account info
        console.log('💰 ACCOUNT BALANCES:');
        console.log('=' .repeat(50));
        console.log(`💎 HIVE: ${account.balance}`);
        console.log(`💵 HBD: ${account.hbd_balance}`);
        console.log(`⚡ Hive Power: ${account.vesting_shares}`);
        console.log('');
        
        console.log('🔑 ACCOUNT DETAILS:');
        console.log('=' .repeat(50));
        console.log(`📅 Created: ${account.created}`);
        console.log(`🗳️  Voting Power: ${account.voting_power / 100}%`);
        console.log(`📈 Reputation: ${account.reputation}`);
        console.log('');

        // Check if account has enough ACTs for account creation
        const pendingACTs = parseInt(account.pending_claimed_accounts) || 0;
        if (pendingACTs > 0) {
            console.log(`✅ SUCCESS: @${username} has ${pendingACTs} Account Creation Tokens!`);
            console.log(`🚀 Ready to create ${pendingACTs} new accounts!`);
        } else {
            console.log(`⚠️  WARNING: @${username} has no Account Creation Tokens!`);
            console.log(`📋 To get ACTs: Need to claim them or receive delegation`);
        }

    } catch (error) {
        console.error('❌ Error checking account:', error.message);
    }
}

// Main execution
async function main() {
    const accountToCheck = process.env.CREATING_ACCOUNT_USERNAME || 'thelittlebank';
    
    console.log('🏦 HIVE ACCOUNT CREATION TOKEN CHECKER');
    console.log('=' .repeat(60));
    console.log('');
    
    await checkAccountCreationTokens(accountToCheck);
    
    console.log('');
    console.log('✅ Check complete!');
    process.exit(0);
}

// Run the script
main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});
