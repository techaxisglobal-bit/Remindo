const axios = require('axios');

async function test() {
    try {
        console.log('Sending POST request to production forgot-password endpoint...');
        const response = await axios.post('https://remindo-production.up.railway.app/api/auth/forgot-password', {
            email: 'test_1780935052885@gmail.com'
        });
        console.log('Success response status:', response.status);
        console.log('Success response data:', response.data);
    } catch (err) {
        console.error('Error status:', err.response ? err.response.status : 'No response');
        console.error('Error data:', err.response ? err.response.data : err.message);
    }
}

test();
