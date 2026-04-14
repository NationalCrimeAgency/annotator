/**
 * Crown Copyright 2026, National Crime Agency
 *
 * Tests for AnnotatorPlugin (public-side).
 *
 * @author d221155 (NCA)
 */

import { AnnotatorPlugin } from './plugin';
import { registerAnnotationsFieldFormatter } from './register_field_formatter';
import { coreMock, loggingSystemMock } from '@kbn/core/public/mocks';
import { ConfigType } from '../common';
import { PluginInitializerContext } from '@kbn/core/public';

// Mock the lazy-loaded component but keep the real editor
jest.mock('./components/annotations', () => {
  const actual = jest.requireActual('./components/annotations');
  return {
    __esModule: true,
    default: jest.fn(() => null), // Mock the lazy-loaded default component
    AnnotationsFieldFormatterEditor: actual.AnnotationsFieldFormatterEditor, // Keep the real editor
  };
});

describe('AnnotatorPlugin (public)', () => {
  let plugin: AnnotatorPlugin;
  let initContext: any;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const mockConfig: ConfigType = {
    enabled: true,
    debug: false,
    docViews: [
      {
        title: 'Tags',
        order: 1,
        fields: ['metadata.annotations'],
      },
    ],
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

  const createSetupDeps = () => ({
    fieldFormats: { register: jest.fn() },
    unifiedDocViewer: { registry: { add: jest.fn() } },
    dataViewFieldEditor: { fieldFormatEditors: { register: jest.fn() } },
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
    it('should initialize with config', () => {
      const testInitContext: PluginInitializerContext = {
        // @ts-ignore
        config: { get: jest.fn(() => mockConfig) },
        logger: { get: jest.fn(() => logger) },
      };

      new AnnotatorPlugin(testInitContext);

      expect(testInitContext.config.get).toHaveBeenCalled();
    });

    it('should log config when debug is enabled', () => {
      const testLogger = loggingSystemMock.createLogger();
      const debugConfig = { ...mockConfig, debug: true };
      const debugInitContext: PluginInitializerContext = {
        // @ts-ignore
        config: { get: jest.fn(() => debugConfig) },
        logger: { get: jest.fn(() => testLogger) },
      };

      new AnnotatorPlugin(debugInitContext);

      expect(testLogger.debug).toHaveBeenCalled();
    });
  });

  describe('registerAnnotationsFieldFormatter', () => {
    it('should register field formatter with config', () => {
      const fieldFormats = { register: jest.fn() };
      const dataViewFieldEditor = { fieldFormatEditors: { register: jest.fn() } };

      registerAnnotationsFieldFormatter(
        fieldFormats as any,
        dataViewFieldEditor as any,
        mockConfig,
        logger
      );

      expect(fieldFormats.register).toHaveBeenCalledWith(expect.any(Array));
      expect(fieldFormats.register).toHaveBeenCalledTimes(1);
    });

    it('should register field format editor', () => {
      const fieldFormats = { register: jest.fn() };
      const dataViewFieldEditor = { fieldFormatEditors: { register: jest.fn() } };

      registerAnnotationsFieldFormatter(
        fieldFormats as any,
        dataViewFieldEditor as any,
        mockConfig,
        logger
      );

      expect(dataViewFieldEditor.fieldFormatEditors.register).toHaveBeenCalled();
    });
  });

  describe('shouldShowFlyout', () => {
    beforeEach(() => {
      plugin = new AnnotatorPlugin(initContext);
    });

    it('should return true when user has view capability for field', () => {
      const capabilities = {
        'metadata_annotations:view': true,
      };

      const docView = { title: 'Tags', order: 1, fields: ['metadata.annotations'] };

      // @ts-ignore - accessing private method for testing
      const result = plugin.shouldShowFlyout(docView, capabilities);

      expect(result).toBe(true);
    });

    it('should return false when user lacks capabilities', () => {
      const capabilities = {
        'metadata_annotations:view': false,
      };

      const docView = { title: 'Tags', order: 1, fields: ['metadata.annotations'] };

      // @ts-ignore - accessing private method for testing
      const result = plugin.shouldShowFlyout(docView, capabilities);

      expect(result).toBe(false);
    });

    it('should transform field names (dot to underscore)', () => {
      const capabilities = {
        'custom_field_name:view': true,
      };

      const docView = { title: 'Tags', order: 1, fields: ['custom.field.name'] };

      // @ts-ignore - accessing private method for testing
      const result = plugin.shouldShowFlyout(docView, capabilities);

      expect(result).toBe(true);
    });

    it('should return false when no fields are accessible', () => {
      const capabilities = {};

      const docView = { title: 'Tags', order: 1, fields: ['metadata.annotations'] };

      // @ts-ignore - accessing private method for testing
      const result = plugin.shouldShowFlyout(docView, capabilities);

      expect(result).toBe(false);
    });
  });

  describe('#setup', () => {
    beforeEach(() => {
      plugin = new AnnotatorPlugin(initContext);
    });

    it('should register custom field formatter', async () => {
      const setupDeps = createSetupDeps();
      coreSetup.getStartServices.mockResolvedValue([
        {
          ...coreStart,
          application: { capabilities: { annotator: {} } },
        } as any,
        {} as any,
        {} as any,
      ]);

      await plugin.setup(coreSetup as any, setupDeps as any);

      expect(setupDeps.fieldFormats.register).toHaveBeenCalled();
    });

    it('should register DocView tabs for each configured docView', async () => {
      const setupDeps = createSetupDeps();
      coreSetup.getStartServices.mockResolvedValue([
        {
          ...coreStart,
          application: { capabilities: { annotator: { 'metadata_annotations:view': true } } },
        } as any,
        {} as any,
        {} as any,
      ]);

      await plugin.setup(coreSetup as any, setupDeps as any);

      expect(setupDeps.unifiedDocViewer.registry.add).toHaveBeenCalled();
    });

    it('should not register tabs if no fields are accessible', async () => {
      const setupDeps = createSetupDeps();
      coreSetup.getStartServices.mockResolvedValue([
        {
          ...coreStart,
          application: { capabilities: { annotator: {} } },
        } as any,
        {} as any,
        {} as any,
      ]);

      await plugin.setup(coreSetup as any, setupDeps as any);

      expect(setupDeps.unifiedDocViewer.registry.add).not.toHaveBeenCalled();
    });

    it('should use provided docView id or generate one from title', async () => {
      const customConfig = {
        ...mockConfig,
        docViews: [
          { id: 'custom-id', title: 'Custom Title', order: 1, fields: ['metadata.annotations'] },
          { title: 'Auto Generated', order: 2, fields: ['metadata.annotations'] },
        ],
      };

      const customInitContext: PluginInitializerContext = {
        // @ts-ignore
        config: { get: jest.fn(() => customConfig) },
        logger: { get: jest.fn(() => logger) },
      };
      const customPlugin = new AnnotatorPlugin(customInitContext);

      const setupDeps = createSetupDeps();
      coreSetup.getStartServices.mockResolvedValue([
        {
          ...coreStart,
          application: { capabilities: { annotator: { 'metadata_annotations:view': true } } },
        } as any,
        {} as any,
        {} as any,
      ]);

      await customPlugin.setup(coreSetup as any, setupDeps as any);

      expect(setupDeps.unifiedDocViewer.registry.add).toHaveBeenCalledTimes(2);

      const firstCall = setupDeps.unifiedDocViewer.registry.add.mock.calls[0][0];
      expect(firstCall.id).toBe('custom-id');

      const secondCall = setupDeps.unifiedDocViewer.registry.add.mock.calls[1][0];
      expect(secondCall.id).toBe('auto_generated');
    });

    it('should pass correct props to DocView components', async () => {
      const setupDeps = createSetupDeps();
      coreSetup.getStartServices.mockResolvedValue([
        {
          ...coreStart,
          application: { capabilities: { annotator: { 'metadata_annotations:view': true } } },
        } as any,
        {} as any,
        {} as any,
      ]);

      await plugin.setup(coreSetup as any, setupDeps as any);

      const docViewConfig = setupDeps.unifiedDocViewer.registry.add.mock.calls[0][0];

      expect(docViewConfig.title).toBe('Tags');
      expect(docViewConfig.order).toBe(1);
      expect(typeof docViewConfig.component).toBe('function');
    });
  });

  describe('#start', () => {
    beforeEach(() => {
      plugin = new AnnotatorPlugin(initContext);
    });

    it('should return empty start contract', () => {
      createSetupDeps();
      const result = plugin.start(coreStart, {} as any);

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
});
