const axios = require('axios');

async function test() {
    try {
        console.log('Sending POST request to production signup endpoint...');
        // We'll generate a random email to test a new signup
        const randomEmail = `test_${Date.now()}@gmail.com`;
        const response = await axios.post('http://localhost:5001/api/auth/signup', {
            name: 'Test User',
            email: randomEmail,
            password: 'Password123'
        });
        console.log('Success response status:', response.status);
        console.log('Success response data:', response.data);
    } catch (err) {
        console.error('Error status:', err.response ? err.response.status : 'No response');
        console.error('Error data:', err.response ? err.response.data : err.message);
    }
}

test();
