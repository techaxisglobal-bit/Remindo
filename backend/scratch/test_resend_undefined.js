const { Resend } = require('resend');

async function test() {
    console.log('Initializing Resend with undefined API key...');
    const resend = new Resend(undefined);
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
