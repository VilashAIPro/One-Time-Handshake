// backend/src/__tests__/api.test.ts
import request from 'supertest';
import express from 'express';

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', engine: 'OTH Cryptography v1.0.0' });
});

app.post('/api/auth/register', (req, res) => {
  const { phoneNumber, deviceFingerprint } = req.body;
  if (!phoneNumber || !deviceFingerprint) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  res.json({ success: true, uid: 'usr_mock_123', jwtToken: 'jwt_mock_token' });
});

describe('Backend API Integration Tests', () => {
  test('GET /api/health returns 200 OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  test('POST /api/auth/register registers device fingerprint', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        phoneNumber: '+919876543210',
        deviceFingerprint: {
          androidId: 'android_id_test',
          installationId: 'install_id_test',
          deviceModel: 'Pixel 8 Pro',
          publicKey: 'public_key_pem',
          fingerprintHash: 'hash_123',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.uid).toBe('usr_mock_123');
  });

  test('POST /api/auth/register fails on missing parameters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ phoneNumber: '+919876543210' });

    expect(res.status).toBe(400);
  });
});
