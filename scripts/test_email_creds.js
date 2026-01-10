
const nodemailer = require('nodemailer');

async function testCreds(host, user, pass) {
    console.log(`Testing HOST: ${host} | USER: ${user}`);
    const transporter = nodemailer.createTransport({
        host: host,
        port: 587,
        secure: false, // TLS
        auth: { user, pass }
    });

    try {
        await transporter.verify();
        console.log(`✅ SUCCESS for ${host}`);
        return true;
    } catch (err) {
        console.log(`❌ FAILED for ${host}: ${err.message}`);
        return false;
    }
}

async function run() {
    const user = 'alexandreseverog@gmail.com'; // Assuming user hasn't changed, only pass/host
    const pass = 'eheedrjajczxuznm';

    // 1. Test existing host with new password (most likely)
    await testCreds('smtp.gmail.com', user, pass);

    // 2. Test user provided host (corrected typo)
    await testCreds('smtp.netimobiliaria', user, pass);

    // 3. Test user provided host (raw typo)
    await testCreds('smpt.netimobiliaria', user, pass);
}

run();
