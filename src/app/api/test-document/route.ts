import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'API de teste funcionando',
    timestamp: new Date().toISOString()
  })
}




