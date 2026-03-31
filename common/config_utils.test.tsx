/**
 * Crown Copyright 2026, National Crime Agency
 *
 * Tests for config utility functions.
 *
 * @author d221155 (NCA)
 */

import {
  flattenValue,
  flattenAnnotationConfigs,
  getTagConfigsForField,
  findAnnotationConfig,
} from './config_utils';
import { TagConfig, ConfigType, AnnotationConfigFlat } from './types';

describe('config_utils', () => {
  describe('flattenValue', () => {
    it('should flatten string arrays to comma-separated values', () => {
      const value = ['tag1', 'tag2', 'tag3'];
      const result = flattenValue(value);
      expect(result).toBe('tag1, tag2, tag3');
    });

    it('should return non-array values unchanged', () => {
      const stringValue = 'single value';
      expect(flattenValue(stringValue)).toBe('single value');

      const numberValue = 42;
      expect(flattenValue(numberValue)).toBe(42);

      const booleanValue = true;
      expect(flattenValue(booleanValue)).toBe(true);
    });

    it('should handle empty arrays', () => {
      const value: string[] = [];
      const result = flattenValue(value);
      expect(result).toEqual([]);
    });

    it('should return non-string arrays unchanged', () => {
      const numberArray = [1, 2, 3];
      const result = flattenValue(numberArray);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('flattenAnnotationConfigs', () => {
    it('should flatten nested tag configs preserving parent properties', () => {
      const tagConfigs: TagConfig[] = [
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
      ];

      const result = flattenAnnotationConfigs(tagConfigs);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        categoryName: 'Sentiment',
        featureName: 'Positive',
        controlType: 'single',
        color: '#D36086',
        iconType: 'crosshairs',
        comment_required: false,
      });
      expect(result[1]).toEqual({
        categoryName: 'Sentiment',
        featureName: 'Negative',
        controlType: 'single',
        color: '#D36086',
        iconType: 'crosshairs',
        comment_required: false,
      });
    });

    it('should handle undefined config gracefully', () => {
      const result = flattenAnnotationConfigs(undefined);
      expect(result).toEqual([]);
    });

    it('should handle empty tag configs', () => {
      const result = flattenAnnotationConfigs([]);
      expect(result).toEqual([]);
    });

    it('should handle tags without children', () => {
      const tagConfigs: TagConfig[] = [
        {
          name: 'Notes',
          controlType: 'text',
          comment_required: false,
          children: undefined,
        },
      ];

      const result = flattenAnnotationConfigs(tagConfigs);
      expect(result).toEqual([]);
    });

    it('should handle multiple parent categories', () => {
      const tagConfigs: TagConfig[] = [
        {
          name: 'Sentiment',
          controlType: 'single',
          comment_required: false,
          children: [{ name: 'Positive', comment_required: false }],
        },
        {
          name: 'Priority',
          controlType: 'radio',
          comment_required: false,
          children: [{ name: 'High', comment_required: false }],
        },
      ];

      const result = flattenAnnotationConfigs(tagConfigs);
      expect(result).toHaveLength(2);
      expect(result[0].categoryName).toBe('Sentiment');
      expect(result[1].categoryName).toBe('Priority');
    });
  });

  describe('getTagConfigsForField', () => {
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
              name: 'Category',
              controlType: 'multiple',
              comment_required: false,
              children: [{ name: 'Important', comment_required: false }],
            },
          ],
        },
      ],
    };

    it('should return tags for matching field name', () => {
      const result = getTagConfigsForField('metadata.annotations', mockConfig);
      expect(result).toHaveLength(1);
      expect(result?.[0].name).toBe('Sentiment');
    });

    it('should return empty array for non-existent field', () => {
      const result = getTagConfigsForField('non.existent.field', mockConfig);
      expect(result).toEqual([]);
    });

    it('should handle undefined plugin config', () => {
      const result = getTagConfigsForField('metadata.annotations', undefined);
      expect(result).toBeUndefined();
    });

    it('should return correct tags for different fields', () => {
      const result = getTagConfigsForField('metadata.tags', mockConfig);
      expect(result).toHaveLength(1);
      expect(result?.[0].name).toBe('Category');
    });
  });

  describe('findAnnotationConfig', () => {
    const flattenedConfigs: AnnotationConfigFlat[] = [
      {
        categoryName: 'Sentiment',
        featureName: 'Positive',
        controlType: 'single',
        comment_required: false,
      },
      {
        categoryName: 'Sentiment',
        featureName: 'Negative',
        controlType: 'single',
        comment_required: false,
      },
      {
        categoryName: 'Priority',
        featureName: 'High',
        controlType: 'radio',
        comment_required: false,
      },
    ];

    it('should find config by category and name', () => {
      const result = findAnnotationConfig(flattenedConfigs, 'Sentiment', 'Positive');
      expect(result).toBeDefined();
      expect(result?.categoryName).toBe('Sentiment');
      expect(result?.featureName).toBe('Positive');
    });

    it('should find config by category only when name is undefined', () => {
      const result = findAnnotationConfig(flattenedConfigs, 'Sentiment', undefined);
      expect(result).toBeDefined();
      expect(result?.categoryName).toBe('Sentiment');
    });

    it('should return undefined for non-matching category', () => {
      const result = findAnnotationConfig(flattenedConfigs, 'NonExistent', 'Positive');
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-matching feature name', () => {
      const result = findAnnotationConfig(flattenedConfigs, 'Sentiment', 'NonExistent');
      expect(result).toBeUndefined();
    });

    it('should handle empty flattened configs', () => {
      const result = findAnnotationConfig([], 'Sentiment', 'Positive');
      expect(result).toBeUndefined();
    });
  });
});
