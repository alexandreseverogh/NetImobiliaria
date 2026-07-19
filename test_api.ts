import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!process.env.DB_NAME) process.env.DB_NAME = 'net_imobiliaria';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'secret';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

async function test() {
  const { GET } = require('./src/app/api/admin/campanhas/dashboard/full/route');
  const token = jwt.sign(
    { tenantId: 'efbf62cf-9e28-4b31-a4f6-82a037412353' },
    process.env.JWT_SECRET || 'secret'
  );

  const url = new URL('http://localhost:3000/api/admin/campanhas/dashboard/full?startDate=2026-06-17&endDate=2026-07-17&clientId=own&segmentId=92e5ddd3-4f3b-4f93-9839-6168d09e25e8');
  const req = new NextRequest(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  try {
    const res = await GET(req);
    const json = await res.json();
    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(json, null, 2));
  } catch (err: any) {
    console.error('Crash:', err);
  }
}

test().finally(() => process.exit(0));
