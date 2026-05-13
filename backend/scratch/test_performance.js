const emailService = require('../services/emailService');
require('dotenv').config({ path: './backend/.env' });

async function test() {
    console.log("--- Testing Safety Check ---");
    // This should be bypassed and log a message
    await emailService.sendOTP('techaxisglobal@gmail.com', '123456', 'signup');
    
    console.log("\n--- Testing Valid Email (Logic Only) ---");
    // I won't actually await this if I want to test "background" feel, 
    // but in a script I'll await it to see if it works.
    // NOTE: Replace 'your-test-email@example.com' with a real one if you want to test delivery.
    try {
        // Just testing if the function executes without crashing
        // We'll use a dummy email that isn't the company one.
        console.log("Starting sendOTP (should be faster with pooling)...");
        const start = Date.now();
        await emailService.sendOTP('test-user@example.com', '111222', 'signup');
        const end = Date.now();
        console.log(`Execution took ${end - start}ms (includes SMTP timeout if it fails)`);
    } catch (err) {
        console.log("Caught expected error or SMTP failure:", err.message);
    }
}

test();
