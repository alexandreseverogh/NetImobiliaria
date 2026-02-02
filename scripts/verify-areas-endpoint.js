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

// Helper functions for JWT
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
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
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
        'raw', stringToArrayBuffer(JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false, ['sign']
    );

    const signature = await webcrypto.subtle.sign('HMAC', key, stringToArrayBuffer(data));
    return data + '.' + arrayBufferToBase64Url(signature);
}

function makeRequest(token) {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/public/corretor/areas-atuacao',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`Status Code: ${res.statusCode}`);
            try {
                const parsed = JSON.parse(data);
                console.log('Response Body:', JSON.stringify(parsed, null, 2));
            } catch (e) {
                console.log('Response Body (Raw):', data);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.end();
}

generateTestToken().then(token => {
    console.log('Token generated successfully.');
    makeRequest(token);
}).catch(console.error);
