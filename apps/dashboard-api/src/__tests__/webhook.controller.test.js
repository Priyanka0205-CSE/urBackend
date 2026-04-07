'use strict';

const mongoose = require('mongoose');

// Mock @urbackend/common
jest.mock('@urbackend/common', () => ({
  Webhook: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  },
  WebhookDelivery: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
  Project: {
    findOne: jest.fn(),
  },
  encrypt: jest.fn((val) => ({ encrypted: 'enc', iv: 'iv', tag: 'tag' })),
  decrypt: jest.fn(() => 'decrypted-secret'),
  createWebhookSchema: {
    safeParse: jest.fn(),
  },
  updateWebhookSchema: {
    safeParse: jest.fn(),
  },
  generateSignature: jest.fn(() => 'sha256=test-signature'),
}));

const {
  createWebhook,
  getWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  getDeliveries,
  testWebhook,
} = require('../controllers/webhook.controller');

const {
  Webhook,
  WebhookDelivery,
  Project,
  createWebhookSchema,
  updateWebhookSchema,
} = require('@urbackend/common');

describe('webhook.controller', () => {
  let req, res;
  // Use valid MongoDB ObjectId format
  const validProjectId = new mongoose.Types.ObjectId().toString();
  const validWebhookId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { projectId: validProjectId },
      user: { _id: 'user123', email: 'test@example.com' },
      body: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('createWebhook', () => {
    test('creates webhook with valid input', async () => {
      Project.findOne.mockResolvedValue({ _id: validProjectId });
      createWebhookSchema.safeParse.mockReturnValue({
        success: true,
        data: {
          name: 'Test Webhook',
          url: 'https://example.com/hook',
          secret: 'whsec_testsecret12345678',
          events: { posts: { insert: true } },
          enabled: true,
        },
      });

      const mockWebhook = {
        _id: validWebhookId,
        projectId: validProjectId,
        name: 'Test Webhook',
        url: 'https://example.com/hook',
        events: new Map([['posts', { insert: true, update: false, delete: false }]]),
        enabled: true,
        createdAt: new Date(),
      };
      Webhook.create.mockResolvedValue(mockWebhook);

      req.body = {
        name: 'Test Webhook',
        url: 'https://example.com/hook',
        secret: 'whsec_testsecret12345678',
        events: { posts: { insert: true } },
      };

      await createWebhook(req, res);

      expect(Project.findOne).toHaveBeenCalledWith({
        _id: validProjectId,
        owner: 'user123',
      });
      expect(Webhook.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Webhook created',
          data: expect.objectContaining({
            name: 'Test Webhook',
          }),
        })
      );
    });

    test('returns 404 if project not found', async () => {
      Project.findOne.mockResolvedValue(null);

      await createWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project not found' });
    });

    test('returns 400 on validation failure', async () => {
      Project.findOne.mockResolvedValue({ _id: validProjectId });
      createWebhookSchema.safeParse.mockReturnValue({
        success: false,
        error: { errors: [{ message: 'Invalid URL' }] },
      });

      await createWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Validation failed' })
      );
    });
  });

  describe('getWebhooks', () => {
    test('returns all webhooks for a project', async () => {
      Project.findOne.mockResolvedValue({ _id: validProjectId });
      Webhook.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: 'wh1', name: 'Hook 1', url: 'https://a.com', enabled: true },
          { _id: 'wh2', name: 'Hook 2', url: 'https://b.com', enabled: false },
        ]),
      });

      await getWebhooks(req, res);

      expect(Webhook.find).toHaveBeenCalledWith({ projectId: validProjectId });
      expect(res.json).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Hook 1' }),
          expect.objectContaining({ name: 'Hook 2' }),
        ]),
      });
    });
  });

  describe('getWebhook', () => {
    test('returns single webhook', async () => {
      req.params.webhookId = validWebhookId;
      Project.findOne.mockResolvedValue({ _id: validProjectId });
      Webhook.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: validWebhookId,
          name: 'Test Hook',
          url: 'https://example.com',
          enabled: true,
        }),
      });

      await getWebhook(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Test Hook' }),
      });
    });

    test('returns 404 if webhook not found', async () => {
      req.params.webhookId = validWebhookId;
      Project.findOne.mockResolvedValue({ _id: validProjectId });
      Webhook.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await getWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Webhook not found' });
    });
  });

  describe('updateWebhook', () => {
    test('updates webhook successfully', async () => {
      req.params.webhookId = validWebhookId;
      req.body = { name: 'Updated Name', enabled: false };

      Project.findOne.mockResolvedValue({ _id: validProjectId });
      updateWebhookSchema.safeParse.mockReturnValue({
        success: true,
        data: { name: 'Updated Name', enabled: false },
      });
      Webhook.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: validWebhookId,
          name: 'Updated Name',
          url: 'https://example.com',
          enabled: false,
        }),
      });

      await updateWebhook(req, res);

      expect(Webhook.findOneAndUpdate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Webhook updated',
          data: expect.objectContaining({ name: 'Updated Name' }),
        })
      );
    });
  });

  describe('deleteWebhook', () => {
    test('deletes webhook successfully', async () => {
      req.params.webhookId = validWebhookId;
      Project.findOne.mockResolvedValue({ _id: validProjectId });
      Webhook.findOneAndDelete.mockResolvedValue({ _id: validWebhookId });

      await deleteWebhook(req, res);

      expect(Webhook.findOneAndDelete).toHaveBeenCalledWith({
        _id: validWebhookId,
        projectId: validProjectId,
      });
      expect(res.json).toHaveBeenCalledWith({ message: 'Webhook deleted' });
    });

    test('returns 404 if webhook not found', async () => {
      req.params.webhookId = validWebhookId;
      Project.findOne.mockResolvedValue({ _id: validProjectId });
      Webhook.findOneAndDelete.mockResolvedValue(null);

      await deleteWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Webhook not found' });
    });
  });

  describe('getDeliveries', () => {
    test('returns paginated delivery history', async () => {
      req.params.webhookId = validWebhookId;
      req.query = { limit: '10', page: '1' };

      Project.findOne.mockResolvedValue({ _id: validProjectId });
      Webhook.findOne.mockResolvedValue({ _id: validWebhookId });

      const mockDeliveries = [
        { _id: 'd1', event: 'posts.insert', finalStatus: 'delivered' },
        { _id: 'd2', event: 'posts.update', finalStatus: 'failed' },
      ];

      WebhookDelivery.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDeliveries),
      });
      WebhookDelivery.countDocuments.mockResolvedValue(2);

      await getDeliveries(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: mockDeliveries,
        pagination: expect.objectContaining({
          page: 1,
          limit: 10,
          total: 2,
        }),
      });
    });
  });

  describe('testWebhook', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      delete global.fetch;
    });

    test('sends test payload and returns success', async () => {
      req.params.webhookId = validWebhookId;

      Project.findOne.mockResolvedValue({ _id: validProjectId });
      
      const mockWebhook = {
        _id: validWebhookId,
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        secret: { encrypted: 'enc', iv: 'iv', tag: 'tag' },
        enabled: true,
      };
      Webhook.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockWebhook),
      });

      global.fetch.mockResolvedValue({
        status: 200,
        text: jest.fn().mockResolvedValue('{"received": true}'),
      });

      await testWebhook(req, res);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-urBackend-Signature': expect.any(String),
            'X-urBackend-Event': 'test.ping',
          }),
        })
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        statusCode: 200,
      }));
    });

    test('returns 404 when webhook not found', async () => {
      req.params.webhookId = validWebhookId;

      Project.findOne.mockResolvedValue({ _id: validProjectId });
      Webhook.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await testWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Webhook not found' });
    });

    test('handles fetch failure gracefully', async () => {
      req.params.webhookId = validWebhookId;

      Project.findOne.mockResolvedValue({ _id: validProjectId });
      
      const mockWebhook = {
        _id: validWebhookId,
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        secret: { encrypted: 'enc', iv: 'iv', tag: 'tag' },
        enabled: true,
      };
      Webhook.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockWebhook),
      });

      global.fetch.mockRejectedValue(new Error('Network error'));

      await testWebhook(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Network error',
      }));
    });
  });
});
