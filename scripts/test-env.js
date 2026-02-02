// Test script to verify environment variables
require('dotenv').config({ path: '.env.local' })

console.log('Environment Variables Loaded:')
console.log('DB_HOST:', process.env.DB_HOST)
console.log('DB_PORT:', process.env.DB_PORT)
console.log('DB_NAME:', process.env.DB_NAME)
console.log('DB_USER:', process.env.DB_USER)
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-4) : 'NOT SET')
console.log('\nFull DB_PASSWORD for debugging:', process.env.DB_PASSWORD)
