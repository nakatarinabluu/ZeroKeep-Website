const { authenticator } = require('otplib');
const secret = authenticator.generateSecret();
console.log('GENERATED_SECRET:', secret);
