const { webcrypto } = require('crypto');
const fs = require('fs');
const path = require('path');

// Read .env.local manually to ensure we get the secret
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const JWT_SECRET = envConfig.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET not found in .env.local');
    process.exit(1);
}

// Helper functions (copied from src/lib/auth/jwt.ts)
function stringToArrayBuffer(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
}

function arrayBufferToBase64Url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

async function generateTestToken() {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour

    const payload = {
        userId: '491795c4-c017-4285-b85a-eb29c26c28b5', // Admin/Corretor UUID
        username: 'admin',
        cargo: 'Corretor',
        role_name: 'Corretor', // Adding role_name just in case
        iat: now,
        exp: exp
    };

    const headerB64 = arrayBufferToBase64Url(stringToArrayBuffer(JSON.stringify(header)));
    const payloadB64 = arrayBufferToBase64Url(stringToArrayBuffer(JSON.stringify(payload)));

    const data = headerB64 + '.' + payloadB64;

    const key = await webcrypto.subtle.importKey(
        'raw',
        stringToArrayBuffer(JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await webcrypto.subtle.sign('HMAC', key, stringToArrayBuffer(data));
    const signatureB64 = arrayBufferToBase64Url(signature);

    return data + '.' + signatureB64;
}

generateTestToken().then(token => {
    console.log(token);
}).catch(err => {
    console.error('Error generating token:', err);
});
