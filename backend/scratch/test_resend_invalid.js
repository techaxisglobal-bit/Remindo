const { Resend } = require('resend');

async function test() {
    console.log('Initializing Resend with an invalid API key...');
    const resend = new Resend('re_invalidkey123456');
    try {
        console.log('Sending email...');
        const { data, error } = await resend.emails.send({
            from: 'Remindo <contact@techaxisglobal.com>',
            to: 'test@example.com',
            subject: 'test',
            html: 'test'
        });
        console.log('Result:', { data, error });
    } catch (err) {
        console.error('Caught error:', err);
    }
}

test();
