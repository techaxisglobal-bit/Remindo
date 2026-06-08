const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const emailService = require('../services/emailService');

async function test() {
    console.log('API KEY:', process.env.RESEND_API_KEY ? 'Present' : 'Missing');
    try {
        console.log('Sending test OTP to a dummy address...');
        await emailService.sendOTP('rapakasaketh@gmail.com', '123456', 'signup');
        console.log('Test completed successfully!');
    } catch (err) {
        console.error('Error during email send:', err);
    }
}

test();
