/**
 * Crown Copyright 2026, National Crime Agency
 *
 * Tests for AnnotatorPlugin (server-side).
 *
 * @author d221155 (NCA)
 */

import { AnnotatorPlugin } from './plugin';
import { registerAnnotationsFieldFormatter } from './register_field_formatter';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ConfigType, PLUGIN_ID, PLUGIN_NAME } from '../common';
import { PluginInitializerContext } from "@kbn/core/server";

describe('AnnotatorPlugin (server)', () => {
  let plugin: AnnotatorPlugin;
  let initContext: any;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

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
      {
        field: 'metadata.tags',
        tags: [
          {
            name: 'Priority',
            controlType: 'multiple',
            comment_required: false,
            children: [{ name: 'High', comment_required: false }],
          },
        ],
      },
    ],
  };

  const createSetupDeps = () => ({
    features: {
      registerKibanaFeature: jest.fn(),
    },
    fieldFormats: {
      register: jest.fn(),
    },
  });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    initContext = {
      config: { get: jest.fn(() => mockConfig) },
      logger: { get: jest.fn(() => logger) },
    };
    coreSetup = coreMock.createSetup();
    coreStart = coreMock.createStart();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with config and logger', () => {
      const testInitContext: PluginInitializerContext<ConfigType> = {
        // @ts-ignore
        config: { get: jest.fn(() => mockConfig) },
        logger: { get: jest.fn(() => logger) },
      };

      new AnnotatorPlugin(testInitContext);

      expect(testInitContext.config.get).toHaveBeenCalled();
      expect(testInitContext.logger.get).toHaveBeenCalled();
    });

    it('should log config on initialization', () => {
      const testLogger = loggingSystemMock.createLogger();
      const testInitContext: PluginInitializerContext<ConfigType> = {
        // @ts-ignore
        config: { get: jest.fn(() => mockConfig) },
        logger: { get: jest.fn(() => testLogger) },
      };

      new AnnotatorPlugin(testInitContext);

      expect(testLogger.info).toHaveBeenCalledWith(expect.stringContaining('constructor: config='));
    });
  });

  describe('registerAnnotationsFieldFormatter', () => {
    it('should register field formatter with config', () => {
      const fieldFormats = { register: jest.fn() };

      registerAnnotationsFieldFormatter(fieldFormats as any, mockConfig);

      expect(fieldFormats.register).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('#setup', () => {
    beforeEach(() => {
      plugin = new AnnotatorPlugin(initContext);
    });

    it('should register Kibana feature with correct id and name', () => {
      const setupDeps = createSetupDeps();

      plugin.setup(coreSetup, setupDeps as any);

      expect(setupDeps.features.registerKibanaFeature).toHaveBeenCalled();
      const featureConfig = setupDeps.features.registerKibanaFeature.mock.calls[0][0];

      expect(featureConfig.id).toBe(PLUGIN_ID);
      expect(featureConfig.name).toBe(PLUGIN_NAME);
    });

    it('should create sub-features for each annotation field', () => {
      const setupDeps = createSetupDeps();

      plugin.setup(coreSetup, setupDeps as any);

      const featureConfig = setupDeps.features.registerKibanaFeature.mock.calls[0][0];

      expect(featureConfig.subFeatures).toHaveLength(2);
      expect(featureConfig.subFeatures[0].name).toBe('metadata.annotations');
      expect(featureConfig.subFeatures[1].name).toBe('metadata.tags');
    });

    it('should transform field names in privilege IDs (dot to underscore)', () => {
      const setupDeps = createSetupDeps();

      plugin.setup(coreSetup, setupDeps as any);

      const featureConfig = setupDeps.features.registerKibanaFeature.mock.calls[0][0];
      const firstSubFeature = featureConfig.subFeatures[0];
      const privilege = firstSubFeature.privilegeGroups[0].privileges[0];

      expect(privilege.id).toContain('metadata_annotations');
      expect(privilege.id).not.toContain('metadata.annotations');
    });

    it('should define all/read privileges correctly', () => {
      const setupDeps = createSetupDeps();

      plugin.setup(coreSetup, setupDeps as any);

      const featureConfig = setupDeps.features.registerKibanaFeature.mock.calls[0][0];

      // Check main privileges
      expect(featureConfig.privileges.all).toBeDefined();
      expect(featureConfig.privileges.read).toBeDefined();

      expect(featureConfig.privileges.all.ui).toContain('all:view');
      expect(featureConfig.privileges.all.ui).toContain('all:create');
      expect(featureConfig.privileges.all.ui).toContain('all:edit');
      expect(featureConfig.privileges.all.ui).toContain('all:delete');

      expect(featureConfig.privileges.read.ui).toContain('all:view');
      expect(featureConfig.privileges.read.ui).toHaveLength(1);
    });

    it('should define sub-feature privileges with correct UI permissions', () => {
      const setupDeps = createSetupDeps();

      plugin.setup(coreSetup, setupDeps as any);

      const featureConfig = setupDeps.features.registerKibanaFeature.mock.calls[0][0];
      const firstSubFeature = featureConfig.subFeatures[0];
      const allPrivilege = firstSubFeature.privilegeGroups[0].privileges[0];
      const readPrivilege = firstSubFeature.privilegeGroups[0].privileges[1];

      expect(allPrivilege.ui).toEqual([
        'metadata_annotations:view',
        'metadata_annotations:create',
        'metadata_annotations:edit',
        'metadata_annotations:delete',
      ]);
      expect(readPrivilege.ui).toEqual(['metadata_annotations:view']);
      expect(allPrivilege.includeIn).toBe('all');
      expect(readPrivilege.includeIn).toBe('read');
    });

    it('should include API privileges for update operations', () => {
      const setupDeps = createSetupDeps();

      plugin.setup(coreSetup, setupDeps as any);

      const featureConfig = setupDeps.features.registerKibanaFeature.mock.calls[0][0];

      expect(featureConfig.privileges.all.api).toContain('annotations:update');

      const firstSubFeature = featureConfig.subFeatures[0];
      const allPrivilege = firstSubFeature.privilegeGroups[0].privileges[0];

      expect(allPrivilege.api).toContain('annotations:update');
    });

    it('should register field formatter on server', () => {
      const setupDeps = createSetupDeps();

      plugin.setup(coreSetup, setupDeps as any);

      expect(setupDeps.fieldFormats.register).toHaveBeenCalled();
    });

    it('should register routes via defineRoutes', () => {
      const setupDeps = createSetupDeps();
      const mockRouter = { post: jest.fn() };
      coreSetup.http.createRouter.mockReturnValue(mockRouter as any);

      plugin.setup(coreSetup, setupDeps as any);

      expect(coreSetup.http.createRouter).toHaveBeenCalled();
      expect(mockRouter.post).toHaveBeenCalled();
    });

    it('should log setup debug message', () => {
      const setupDeps = createSetupDeps();

      plugin.setup(coreSetup, setupDeps as any);

      expect(logger.debug).toHaveBeenCalledWith('[AnnotatorPlugin] setup: Setup');
    });

    it('should log field names during setup', () => {
      const setupDeps = createSetupDeps();

      plugin.setup(coreSetup, setupDeps as any);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('setup: fields=')
      );
    });

    it('should return empty setup contract', () => {
      const setupDeps = createSetupDeps();

      const result = plugin.setup(coreSetup, setupDeps as any);

      expect(result).toEqual({});
    });
  });

  describe('#start', () => {
    beforeEach(() => {
      plugin = new AnnotatorPlugin(initContext);
    });

    it('should log started message', () => {
      plugin.start(coreStart);

      expect(logger.debug).toHaveBeenCalledWith('annotator: Started');
    });

    it('should return empty start contract', () => {
      const result = plugin.start(coreStart);

      expect(result).toEqual({});
    });
  });

  describe('#stop', () => {
    beforeEach(() => {
      plugin = new AnnotatorPlugin(initContext);
    });

    it('should complete without error', () => {
      expect(() => plugin.stop()).not.toThrow();
    });
  });

  describe('feature configuration', () => {
    beforeEach(() => {
      plugin = new AnnotatorPlugin(initContext);
    });

    it('should use mutually exclusive privilege groups', () => {
      const setupDeps = createSetupDeps();

      plugin.setup(coreSetup, setupDeps as any);

      const featureConfig = setupDeps.features.registerKibanaFeature.mock.calls[0][0];
      const firstSubFeature = featureConfig.subFeatures[0];

      expect(firstSubFeature.privilegeGroups[0].groupType).toBe('mutually_exclusive');
    });
  });
});
