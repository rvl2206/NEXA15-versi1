import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

// For this sample test, we will create a mock express app
// to demonstrate how you test API endpoints.
// In reality, you would export your `app` from `server.ts` and import it here.
const app = express();
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'NEXA15 Server is running' });
});

describe('Backend API Tests', () => {
  it('GET /api/health should return 200 OK', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  // Example of how you would test a non-existent route
  it('should return 404 for an unknown route', async () => {
    const response = await request(app).get('/api/unknown-route');
    expect(response.status).toBe(404);
  });
});
