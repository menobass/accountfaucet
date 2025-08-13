// Sanitized email credential delivery test (example)
// Usage:
// 1. Copy this file to backend/tests/email-test.js (gitignored if you wish)
// 2. Set TEST_RECIPIENT_EMAIL in your .env (never hard-code personal addresses)
// 3. Run: node backend/tests/email-test.js

require('dotenv').config();
const EmailService = require('../services/email-service');

async function run() {
  const recipient = process.env.TEST_RECIPIENT_EMAIL;
  if (!recipient) {
    console.error('❌ TEST_RECIPIENT_EMAIL not set. Aborting.');
    process.exit(1);
  }

  const emailService = new EmailService();
  console.log('🔍 Verifying transporter...');
  const conn = await emailService.testConnection();
  console.log('Connection:', conn);
  if (!conn.success) return;

  const fakeAccount = {
    username: 'sample' + Date.now(),
    ownerKey: 'OWNER_PRIVATE_KEY_PLACEHOLDER',
    activeKey: 'ACTIVE_PRIVATE_KEY_PLACEHOLDER',
    postingKey: 'POSTING_PRIVATE_KEY_PLACEHOLDER',
    memoKey: 'MEMO_PRIVATE_KEY_PLACEHOLDER',
    requester: 'tester'
  };

  console.log(`✉️  Sending test credentials to ${recipient} ...`);
  const result = await emailService.sendAccountCredentials(recipient, fakeAccount);
  console.log('Result:', result);
}

run().catch(e => { console.error(e); process.exit(1); });
