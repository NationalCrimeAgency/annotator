/**
 * Crown Copyright 2026, National Crime Agency
 *
 * Tests for AnnotationsFieldFormatter.
 *
 * @author d221155 (NCA)
 */

// Mock EUI components BEFORE importing the formatter (which calls setEuiDevProviderWarning)
jest.mock('@elastic/eui', () => ({
  EuiBadge: ({ children }: any) => children,
  EuiProvider: ({ children }: any) => children,
  setEuiDevProviderWarning: jest.fn(),
}));

// Mock React DOM server-side rendering
jest.mock('react-dom/server', () => ({
  renderToString: jest.fn(() => '<div>mock-badge-html</div>'),
  renderToStaticMarkup: jest.fn(() => ''),
}));

import { AnnotationsFieldFormatter } from './field_formatter';
import { AnnotationType, ConfigType } from './types';
import { Logger } from '@kbn/logging';

describe('AnnotationsFieldFormatter', () => {
  let formatter: AnnotationsFieldFormatter;
  let mockLogger: Logger;
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
            color: '#D36086',
            iconType: 'crosshairs',
            comment_required: false,
            children: [
              { name: 'Positive', comment_required: false },
              { name: 'Negative', comment_required: false },
            ],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      log: jest.fn(),
      get: jest.fn(),
    } as any;

    // Create a formatter instance with config and logger
    class TestFormatter extends AnnotationsFieldFormatter {
      getPluginConfig(): ConfigType {
        return mockConfig;
      }
      getLogger(): Logger {
        return mockLogger;
      }
    }
    // @ts-ignore
    formatter = new TestFormatter({ fieldName: 'metadata.annotations' }, {});
    jest.clearAllMocks();
  });

  describe('static properties', () => {
    it('should have correct id', () => {
      expect(AnnotationsFieldFormatter.id).toBe('annotations');
    });

    it('should have correct title', () => {
      expect(AnnotationsFieldFormatter.title).toBe('Annotations');
    });

    it('should support string and unknown field types', () => {
      expect(AnnotationsFieldFormatter.fieldType).toContain('string');
      expect(AnnotationsFieldFormatter.fieldType).toContain('unknown');
    });
  });

  describe('getParamDefaults', () => {
    it('should return default fieldName', () => {
      const defaults = formatter.getParamDefaults();
      expect(defaults.fieldName).toBe('metadata.annotations');
    });
  });

  describe('getPluginConfig', () => {
    it('should return undefined for base class', () => {
      // @ts-ignore
      const baseFormatter = new AnnotationsFieldFormatter({}, {});
      expect(baseFormatter.getPluginConfig()).toBeUndefined();
    });
  });

  describe('isDebugEnabled', () => {
    it('should return false when no config', () => {
      // @ts-ignore
      const baseFormatter = new AnnotationsFieldFormatter({}, {});
      expect(baseFormatter.isDebugEnabled()).toBe(false);
    });

    it('should return config debug value when available', () => {
      expect(formatter.isDebugEnabled()).toBe(false);
    });
  });

  describe('textConvert', () => {
    it('should convert annotation object to JSON string', () => {
      const annotation: AnnotationType = {
        source_type: 'human',
        source_name: 'annotator',
        created_timestamp: '2025-01-01T00:00:00Z',
        created_username: 'test-user',
        feature_category: 'Sentiment',
        feature_name: 'Positive',
        feature_comment: 'Test comment',
      };

      const result = formatter.textConvert(annotation);
      expect(result).toBe(JSON.stringify(annotation));
    });

    it('should parse and re-serialize JSON string annotations', () => {
      const annotationString = JSON.stringify({
        source_type: 'human',
        feature_category: 'Sentiment',
        feature_name: 'Positive',
      });

      const result = formatter.textConvert(annotationString);
      expect(typeof result).toBe('string');
      expect(() => JSON.parse(result as string)).not.toThrow();
    });
  });

  describe('htmlConvert', () => {
    const ReactDOMServer = require('react-dom/server');

    it('should render annotations as HTML badges', () => {
      const annotations: AnnotationType[] = [
        {
          source_type: 'human',
          source_name: 'annotator',
          created_timestamp: '2025-01-01T00:00:00Z',
          created_username: 'test-user',
          feature_category: 'Sentiment',
          feature_name: 'Positive',
        },
      ];

      const result = formatter.htmlConvert(JSON.stringify(annotations), {});
      expect(ReactDOMServer.renderToString).toHaveBeenCalled();
      expect(result).toContain('mock-badge-html');
    });

    it('should handle empty annotation arrays', () => {
      formatter.htmlConvert('[]', {});
      expect(ReactDOMServer.renderToString).toHaveBeenCalled();
    });

    it('should handle annotation objects (not strings)', () => {
      const annotation: AnnotationType = {
        source_type: 'human',
        source_name: 'annotator',
        created_timestamp: '2025-01-01T00:00:00Z',
        created_username: 'test-user',
        feature_category: 'Sentiment',
        feature_name: 'Positive',
      };

      formatter.htmlConvert(annotation, {});
      expect(ReactDOMServer.renderToString).toHaveBeenCalled();
    });

    it('should recover gracefully from malformed JSON', () => {
      formatter.htmlConvert('invalid json{', {});

      expect(mockLogger.error).toHaveBeenCalled();
      expect(ReactDOMServer.renderToStaticMarkup).toHaveBeenCalled();
    });

    it('should handle special JSON values', () => {
      // Test with ']' which is checked in the code
      formatter.htmlConvert(']', {});
      expect(ReactDOMServer.renderToString).toHaveBeenCalled();
    });

    it('should handle empty string bracket arrays', () => {
      formatter.htmlConvert('[]', {});
      expect(ReactDOMServer.renderToString).toHaveBeenCalled();
    });
  });

  describe('formatAnnotationsToBadges (via htmlConvert)', () => {
    it('should apply colors from tag config', () => {
      const annotations: AnnotationType[] = [
        {
          source_type: 'human',
          source_name: 'annotator',
          created_timestamp: '2025-01-01T00:00:00Z',
          created_username: 'test-user',
          feature_category: 'Sentiment',
          feature_name: 'Positive',
        },
      ];

      formatter.htmlConvert(JSON.stringify(annotations), {});

      // Verify renderToString was called (indirectly testing badge generation)
      const ReactDOMServer = require('react-dom/server');
      expect(ReactDOMServer.renderToString).toHaveBeenCalled();
    });

    it('should handle annotations without feature_name', () => {
      const annotations: AnnotationType[] = [
        {
          source_type: 'human',
          source_name: 'annotator',
          created_timestamp: '2025-01-01T00:00:00Z',
          created_username: 'test-user',
          feature_category: 'Sentiment',
        },
      ];

      const result = formatter.htmlConvert(JSON.stringify(annotations), {});
      expect(result).toBeDefined();
    });
  });
});
