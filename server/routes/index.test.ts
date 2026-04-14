/**
 * Crown Copyright 2026, National Crime Agency
 *
 * Tests for annotation API routes.
 *
 * @author d221155 (NCA)
 */

import { defineRoutes } from '.';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ConfigType, ANNOTATIONS_ROUTE_PATH } from '../../common';

describe('Annotation Routes', () => {
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockCore: ReturnType<typeof coreMock.createSetup>;
  let mockRouter: any;

  const mockConfig: ConfigType = {
    enabled: true,
    debug: false,
    docViews: [],
    annotations: [
      {
        field: 'metadata.annotations',
        tags: [
          {
            name: 'Sentiment',
            controlType: 'single',
            comment_required: false,
            children: [{ name: 'Positive', comment_required: false }],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();
    mockCore = coreMock.createSetup();

    // Create a mock router manually
    mockRouter = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('defineRoutes', () => {
    it('should register POST route with correct path', () => {
      defineRoutes(mockLogger, mockConfig, mockCore, mockRouter);

      expect(mockRouter.post).toHaveBeenCalled();

      const routeConfig = mockRouter.post.mock.calls[0][0];
      expect(routeConfig.path).toBe(
        `${ANNOTATIONS_ROUTE_PATH}/{index}/{id}/{field}/{annotation_type}`
      );
    });

    it('should register route with validation schema', () => {
      defineRoutes(mockLogger, mockConfig, mockCore, mockRouter);

      const routeConfig = mockRouter.post.mock.calls[0][0];

      expect(routeConfig.validate).toBeDefined();
      expect(routeConfig.validate.params).toBeDefined();
      expect(routeConfig.validate.body).toBeDefined();
    });

    it('should register route with correct tags', () => {
      defineRoutes(mockLogger, mockConfig, mockCore, mockRouter);

      const routeConfig = mockRouter.post.mock.calls[0][0];

      expect(routeConfig.options.tags).toContain('annotations:update');
    });

    it('should log route path during registration', () => {
      defineRoutes(mockLogger, mockConfig, mockCore, mockRouter);

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('defineRoutes: path='));
    });
  });

  describe('POST handler', () => {
    let mockHandler: any;
    let mockContext: any;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
      defineRoutes(mockLogger, mockConfig, mockCore, mockRouter);
      mockHandler = mockRouter.post.mock.calls[0][1];

      mockContext = {
        core: Promise.resolve({
          elasticsearch: {
            client: {
              asCurrentUser: {
                get: jest.fn(),
                update: jest.fn(),
              },
            },
          },
        }),
      };

      mockRequest = httpServerMock.createKibanaRequest({
        params: {
          index: 'test-index',
          id: 'test-id',
          field: 'metadata.annotations',
          annotation_type: 'tag',
        },
        body: {
          partial: {
            annotations: [
              {
                feature_category: 'Sentiment',
                feature_name: 'Positive',
              },
            ],
          },
        },
      });

      mockResponse = httpServerMock.createResponseFactory();

      // Mock security plugin to return a user
      mockCore.getStartServices.mockResolvedValue([
        {},
        {
          security: {
            authc: {
              getCurrentUser: jest.fn().mockReturnValue({
                username: 'test-user',
                roles: ['admin'],
              }),
            },
          },
        },
        {},
      ] as any);
    });

    it('should log request parameters', async () => {
      mockContext.core.then((core: any) => {
        core.elasticsearch.client.asCurrentUser.get.mockResolvedValue({
          fields: {},
        });
      });

      await mockHandler(mockContext, mockRequest, mockResponse);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('update: index="test-index"')
      );
    });

    it('should return 404 when annotation field not configured', async () => {
      const badRequest = httpServerMock.createKibanaRequest({
        params: {
          index: 'test-index',
          id: 'test-id',
          field: 'non.existent.field',
          annotation_type: 'tag',
        },
        body: { partial: { annotations: [] } },
      });

      await mockHandler(mockContext, badRequest, mockResponse);

      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: expect.stringContaining('No matching annotation config was found'),
      });
    });

    it('should retrieve current user from security plugin', async () => {
      mockContext.core.then((core: any) => {
        core.elasticsearch.client.asCurrentUser.get.mockResolvedValue({
          fields: {},
        });
        core.elasticsearch.client.asCurrentUser.update.mockResolvedValue({});
      });

      await mockHandler(mockContext, mockRequest, mockResponse);

      const [, pluginStart] = await mockCore.getStartServices();
      // @ts-ignore
      expect(pluginStart.security.authc.getCurrentUser).toHaveBeenCalled();
    });

    it('should create new annotations when none exist', async () => {
      const elasticsearchClient = {
        get: jest.fn().mockResolvedValue({
          fields: {},
        }),
        update: jest.fn().mockResolvedValue({}),
      };

      mockContext.core = Promise.resolve({
        elasticsearch: {
          client: {
            asCurrentUser: elasticsearchClient,
          },
        },
      });

      await mockHandler(mockContext, mockRequest, mockResponse);

      expect(elasticsearchClient.update).toHaveBeenCalled();
      const updateCall = elasticsearchClient.update.mock.calls[0][0];

      expect(updateCall.index).toBe('test-index');
      expect(updateCall.id).toBe('test-id');
      expect(updateCall.refresh).toBe('wait_for');
      expect(updateCall.script).toBeDefined();
    });

    it('should include created_timestamp and created_username in annotations', async () => {
      const elasticsearchClient = {
        get: jest.fn().mockResolvedValue({
          fields: {},
        }),
        update: jest.fn().mockResolvedValue({}),
      };

      mockContext.core = Promise.resolve({
        elasticsearch: {
          client: {
            asCurrentUser: elasticsearchClient,
          },
        },
      });

      await mockHandler(mockContext, mockRequest, mockResponse);

      expect(elasticsearchClient.update).toHaveBeenCalled();
      const updateCall = elasticsearchClient.update.mock.calls[0][0];
      const annotations = updateCall.script.params.annotations;

      expect(annotations[0]).toHaveProperty('created_timestamp');
      expect(annotations[0]).toHaveProperty('created_username', 'test-user');
      expect(annotations[0].created_timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should set source_type to "human" for Kibana users', async () => {
      const elasticsearchClient = {
        get: jest.fn().mockResolvedValue({
          fields: {},
        }),
        update: jest.fn().mockResolvedValue({}),
      };

      mockContext.core = Promise.resolve({
        elasticsearch: {
          client: {
            asCurrentUser: elasticsearchClient,
          },
        },
      });

      await mockHandler(mockContext, mockRequest, mockResponse);

      const updateCall = elasticsearchClient.update.mock.calls[0][0];
      const annotations = updateCall.script.params.annotations;

      expect(annotations[0].source_type).toBe('human');
      expect(annotations[0].source_name).toBe('annotator');
    });

    it('should return success response with action UPDATED', async () => {
      const elasticsearchClient = {
        get: jest.fn().mockResolvedValue({
          fields: {},
        }),
        update: jest.fn().mockResolvedValue({}),
      };

      mockContext.core = Promise.resolve({
        elasticsearch: {
          client: {
            asCurrentUser: elasticsearchClient,
          },
        },
      });

      await mockHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        headers: { 'content-type': 'application/json' },
        body: { action: 'UPDATED' },
      });
    });

    it('should log info message on successful update', async () => {
      const elasticsearchClient = {
        get: jest.fn().mockResolvedValue({
          fields: {},
        }),
        update: jest.fn().mockResolvedValue({}),
      };

      mockContext.core = Promise.resolve({
        elasticsearch: {
          client: {
            asCurrentUser: elasticsearchClient,
          },
        },
      });

      await mockHandler(mockContext, mockRequest, mockResponse);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('action="UPDATED"'));
    });
  });

  describe('getCurrentUser error handling', () => {
    it('should throw error when security plugin unavailable', async () => {
      mockCore.getStartServices.mockResolvedValue([
        {},
        {
          security: null,
        },
        {},
      ] as any);

      defineRoutes(mockLogger, mockConfig, mockCore, mockRouter);
      const mockHandler = mockRouter.post.mock.calls[0][1];

      const mockContext = {
        core: Promise.resolve({
          elasticsearch: {
            client: {
              asCurrentUser: {
                get: jest.fn().mockResolvedValue({ fields: {} }),
              },
            },
          },
        }),
      };

      const mockRequest = httpServerMock.createKibanaRequest({
        params: {
          index: 'test-index',
          id: 'test-id',
          field: 'metadata.annotations',
          annotation_type: 'tag',
        },
        body: {
          partial: {
            annotations: [{ feature_category: 'Test' }],
          },
        },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await expect(mockHandler(mockContext, mockRequest, mockResponse)).rejects.toThrow(
        'No security plugin was found'
      );
    });

    it('should throw error when no current user found', async () => {
      mockCore.getStartServices.mockResolvedValue([
        {},
        {
          security: {
            authc: {
              getCurrentUser: jest.fn().mockReturnValue(null),
            },
          },
        },
        {},
      ] as any);

      defineRoutes(mockLogger, mockConfig, mockCore, mockRouter);
      const mockHandler = mockRouter.post.mock.calls[0][1];

      const mockContext = {
        core: Promise.resolve({
          elasticsearch: {
            client: {
              asCurrentUser: {
                get: jest.fn().mockResolvedValue({ fields: {} }),
              },
            },
          },
        }),
      };

      const mockRequest = httpServerMock.createKibanaRequest({
        params: {
          index: 'test-index',
          id: 'test-id',
          field: 'metadata.annotations',
          annotation_type: 'tag',
        },
        body: {
          partial: {
            annotations: [{ feature_category: 'Test' }],
          },
        },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await expect(mockHandler(mockContext, mockRequest, mockResponse)).rejects.toThrow(
        'No current user was found'
      );
    });
  });
});
