import dotenv from 'dotenv';
import path from 'path';
import postgres from 'postgres';
import WebSocket from 'ws';

// In Node.js environments, polyfill WebSocket for @neon/realtime client
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { createRealtime, rawSql } from '@neon/realtime/server';
import { createRealtimeClient, postgresJsParsers } from '@neon/realtime/client';

interface LiveNote {
  id: number;
  content: string;
  created_at: Date;
}

async function main() {
  console.log('='.repeat(65));
  console.log('⚡ Neon Realtime Live Query End-to-End Test');
  console.log('='.repeat(65));

  const databaseUrl = process.env.DATABASE_URL;
  const realtimeUrl = process.env.NEON_REALTIME_URL;
  const realtimeSecret = process.env.NEON_REALTIME_SECRET;

  if (!databaseUrl || !realtimeUrl || !realtimeSecret) {
    console.error('❌ Error: Missing required Neon environment variables.');
    console.error('Required: DATABASE_URL, NEON_REALTIME_URL, NEON_REALTIME_SECRET');
    process.exit(1);
  }

  // Extract database name from connection string without exposing credentials
  const dbUrlObj = new URL(databaseUrl);
  const dbName = dbUrlObj.pathname.slice(1) || 'neondb';

  console.log('\n[1/5] Connecting to Neon Postgres...');
  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: 'require',
  });

  // 1. Create table with primary key and no RLS (as required by Neon Realtime)
  console.log('[2/5] Ensuring test table "live_notes" exists with primary key...');
  await sql`
    CREATE TABLE IF NOT EXISTS live_notes (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  console.log('      Table "live_notes" is ready.');

  // 2. Define live query and seal it on the server
  console.log('\n[3/5] Defining and sealing query on server...');
  const realtimeServer = createRealtime({
    secret: realtimeSecret,
    db: dbName,
  });

  const query = rawSql<LiveNote>(
    'SELECT id, content, created_at FROM live_notes ORDER BY id ASC'
  );

  const sealedQuery = await realtimeServer.seal({ query });
  console.log('      Query sealed successfully.');
  console.log(`      Query Fingerprint: ${sealedQuery.queryFingerprint}`);
  console.log(`      Capability Token:  [SEALED_BEARER_TOKEN] (expires at ${new Date(sealedQuery.expiresAt).toLocaleTimeString()})`);

  // 3. Client subscribes using Neon Realtime SDK
  console.log('\n[4/5] Client subscribing to sealed query via Neon Realtime SDK...');
  const client = createRealtimeClient({
    url: realtimeUrl,
    parsers: { ...postgresJsParsers },
  });

  const subscription = client.subscribe(sealedQuery);

  let isLive = false;
  let receivedNewRow = false;
  const testContent = `Neon Realtime Test #${Date.now().toString().slice(-6)} - Live notification verified`;

  const completionPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout: Did not receive live notification within 25 seconds.'));
    }, 25000);

    subscription.onStateChange((state) => {
      console.log(`      Subscription State Change -> [status: ${state.status}]`);
      if (state.status === 'live' && !isLive) {
        isLive = true;
        console.log('      ✓ Subscription is LIVE and connected!');

        // 4. Insert row to prove live update
        setTimeout(async () => {
          console.log(`\n[5/5] Inserting new row into "live_notes": "${testContent}"...`);
          try {
            const inserted = await sql`
              INSERT INTO live_notes (content)
              VALUES (${testContent})
              RETURNING id, content, created_at;
            `;
            console.log(`      ✓ Database insert confirmed (ID: ${inserted[0].id}).`);
            console.log('      Waiting for subscriber to receive transaction update...');
          } catch (err) {
            clearTimeout(timeout);
            reject(err);
          }
        }, 800);
      }
    });

    subscription.onChange((snapshot) => {
      const rows = snapshot.data ?? [];
      console.log(`      📦 Snapshot received: ${rows.length} row(s) in local store.`);

      // Check if our newly inserted row is received
      const match = rows.find((r) => r.content === testContent);
      if (match && !receivedNewRow) {
        receivedNewRow = true;
        clearTimeout(timeout);
        console.log('\n' + '='.repeat(65));
        console.log('🎉 SUCCESS: Subscriber received live update from Neon Realtime!');
        console.log('='.repeat(65));
        console.log('Received Row Details:');
        console.log(`  ID:         ${match.id}`);
        console.log(`  Content:    ${match.content}`);
        console.log(`  Created At: ${match.created_at}`);
        console.log('='.repeat(65) + '\n');
        resolve();
      }
    });
  });

  try {
    await completionPromise;
  } finally {
    subscription.unsubscribe();
    client.close();
    await sql.end();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Realtime test error:', err.message || err);
  process.exit(1);
});
