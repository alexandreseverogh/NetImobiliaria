
const http = require('http');

function callApi(path) {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:3000${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
    });
}

async function run() {
    console.log('--- Testing Leaderboard API ---');
    const lbRes = await callApi('/api/admin/gamification/stats?type=leaderboard&limit=5');
    console.log('Status:', lbRes.status);
    if (lbRes.status === 200) {
        console.log('Data count:', lbRes.body.data?.length);
        console.log('Sample:', lbRes.body.data?.[0]);
        console.log('Pagination:', lbRes.body.pagination);
    } else {
        console.log('Error:', lbRes.body);
    }

    console.log('\n--- Testing Transbordo History API ---');
    const thRes = await callApi('/api/admin/gamification/stats?type=transbordo&limit=5');
    console.log('Status:', thRes.status);
    if (thRes.status === 200) {
        console.log('Data count:', thRes.body.data?.length);
        console.log('Sample:', thRes.body.data?.[0]);
    } else {
        console.log('Error:', thRes.body);
    }
}

run();
