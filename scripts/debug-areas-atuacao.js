const { webcrypto } = require('crypto');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Read .env.local manually
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
    const exp = now + 3600;

    const payload = {
        userId: '491795c4-c017-4285-b85a-eb29c26c28b5',
        username: 'admin',
        cargo: 'Corretor',
        role_name: 'Corretor',
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

async function runDebug() {
    const token = await generateTestToken();
    console.log('Token generated successfully.');

    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/public/corretor/areas-atuacao',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Cookie': `auth_token=${token}` // Send as both just in case
        }
    };

    console.log('Sending request to /api/public/corretor/areas-atuacao...');

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

        // Capture data
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log('BODY:', data);
        });
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    req.end();
}

runDebug();
