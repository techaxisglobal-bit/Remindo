require('dotenv').config();
const emailService = require('../services/emailService');

(async () => {
    try {
        await emailService.sendOTP('test@example.com', '123456', 'signup');
        console.log('Done');
    } catch (e) {
        console.error(e);
    }
})();
