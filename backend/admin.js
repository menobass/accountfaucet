#!/usr/bin/env node

const UserManager = require('./services/user-manager');
const userManager = new UserManager();

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];

function printUsage() {
    console.log('\n🔧 Hive Account Faucet - User Management');
    console.log('==========================================');
    console.log('Usage: node admin.js <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  list-users                     List all authorized users');
    console.log('  user <username>                Show specific user details');
    console.log('  add-user <username> [tokens]   Add new user (default: 5 tokens)');
    console.log('  give-tokens <username> <num>   Give additional tokens to user');
    console.log('  set-tokens <username> <num>    Set total tokens for user');
    console.log('  activate <username>            Activate user');
    console.log('  deactivate <username>          Deactivate user');
    console.log('  stats                          Show database statistics');
    console.log('');
    console.log('Examples:');
    console.log('  node admin.js list-users');
    console.log('  node admin.js add-user newuser 10');
    console.log('  node admin.js give-tokens ankapolo 5');
    console.log('  node admin.js user meno');
    console.log('');
}

function formatUser(username, user) {
    const status = user.is_active ? '✅ Active' : '❌ Inactive';
    const lastUsed = user.last_used ? new Date(user.last_used).toLocaleDateString() : 'Never';
    
    console.log(`👤 ${username}`);
    console.log(`   Status: ${status}`);
    console.log(`   Tokens: ${user.tokens_used}/${user.tokens_allocated} used (${user.tokens_remaining} remaining)`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
    console.log(`   Last Used: ${lastUsed}`);
    if (user.email) console.log(`   Email: ${user.email}`);
    if (user.notes) console.log(`   Notes: ${user.notes}`);
    console.log('');
}

async function main() {
    if (!command) {
        printUsage();
        return;
    }

    switch (command) {
        case 'list-users':
        case 'list':
            const data = userManager.getAllUsers();
            if (!data) {
                console.log('❌ Error loading user data');
                return;
            }
            
            console.log('\n📋 Authorized Users');
            console.log('===================');
            console.log(`Total Users: ${data.metadata.total_users}`);
            console.log(`Total Tokens Allocated: ${data.metadata.total_tokens_allocated}`);
            console.log(`Total Tokens Used: ${data.metadata.total_tokens_used}`);
            console.log(`Last Updated: ${new Date(data.metadata.last_updated).toLocaleString()}`);
            console.log('');
            
            for (const [username, user] of Object.entries(data.authorized_users)) {
                formatUser(username, user);
            }
            break;

        case 'user':
            const username = args[1];
            if (!username) {
                console.log('❌ Please specify a username');
                console.log('Usage: node admin.js user <username>');
                return;
            }
            
            const user = userManager.getUser(username);
            if (!user) {
                console.log(`❌ User '${username}' not found`);
                return;
            }
            
            console.log('\n👤 User Details');
            console.log('===============');
            formatUser(username, user);
            break;

        case 'add-user':
        case 'add':
            const newUsername = args[1];
            const tokens = parseInt(args[2]) || 5;
            
            if (!newUsername) {
                console.log('❌ Please specify a username');
                console.log('Usage: node admin.js add-user <username> [tokens]');
                return;
            }
            
            const result = userManager.addUser(newUsername, tokens);
            if (result.success) {
                console.log(`✅ ${result.message}`);
            } else {
                console.log(`❌ ${result.message}`);
            }
            break;

        case 'give-tokens':
        case 'give':
            const giveUsername = args[1];
            const giveTokens = parseInt(args[2]);
            
            if (!giveUsername || !giveTokens) {
                console.log('❌ Please specify username and number of tokens');
                console.log('Usage: node admin.js give-tokens <username> <number>');
                return;
            }
            
            const giveResult = userManager.giveTokens(giveUsername, giveTokens);
            if (giveResult.success) {
                console.log(`✅ ${giveResult.message}`);
            } else {
                console.log(`❌ ${giveResult.message}`);
            }
            break;

        case 'set-tokens':
        case 'set':
            const setUsername = args[1];
            const setTokens = parseInt(args[2]);
            
            if (!setUsername || isNaN(setTokens)) {
                console.log('❌ Please specify username and number of tokens');
                console.log('Usage: node admin.js set-tokens <username> <number>');
                return;
            }
            
            const setResult = userManager.setTokens(setUsername, setTokens);
            if (setResult.success) {
                console.log(`✅ ${setResult.message}`);
            } else {
                console.log(`❌ ${setResult.message}`);
            }
            break;

        case 'activate':
            const activateUsername = args[1];
            if (!activateUsername) {
                console.log('❌ Please specify a username');
                return;
            }
            
            const activateResult = userManager.setUserStatus(activateUsername, true);
            if (activateResult.success) {
                console.log(`✅ ${activateResult.message}`);
            } else {
                console.log(`❌ ${activateResult.message}`);
            }
            break;

        case 'deactivate':
            const deactivateUsername = args[1];
            if (!deactivateUsername) {
                console.log('❌ Please specify a username');
                return;
            }
            
            const deactivateResult = userManager.setUserStatus(deactivateUsername, false);
            if (deactivateResult.success) {
                console.log(`✅ ${deactivateResult.message}`);
            } else {
                console.log(`❌ ${deactivateResult.message}`);
            }
            break;

        case 'stats':
            const statsData = userManager.getAllUsers();
            if (!statsData) {
                console.log('❌ Error loading user data');
                return;
            }
            
            const activeUsers = Object.values(statsData.authorized_users).filter(u => u.is_active).length;
            const inactiveUsers = Object.values(statsData.authorized_users).filter(u => !u.is_active).length;
            const usersWithTokens = Object.values(statsData.authorized_users).filter(u => u.tokens_remaining > 0).length;
            
            console.log('\n📊 Database Statistics');
            console.log('======================');
            console.log(`Total Users: ${statsData.metadata.total_users}`);
            console.log(`Active Users: ${activeUsers}`);
            console.log(`Inactive Users: ${inactiveUsers}`);
            console.log(`Users with Tokens: ${usersWithTokens}`);
            console.log(`Total Tokens Allocated: ${statsData.metadata.total_tokens_allocated}`);
            console.log(`Total Tokens Used: ${statsData.metadata.total_tokens_used}`);
            console.log(`Tokens Remaining: ${statsData.metadata.total_tokens_allocated - statsData.metadata.total_tokens_used}`);
            console.log(`Database Created: ${new Date(statsData.metadata.created_at).toLocaleString()}`);
            console.log(`Last Updated: ${new Date(statsData.metadata.last_updated).toLocaleString()}`);
            console.log('');
            break;

        default:
            console.log(`❌ Unknown command: ${command}`);
            printUsage();
            break;
    }
}

main().catch(console.error);
