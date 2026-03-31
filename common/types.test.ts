/**
 * Crown Copyright 2026, National Crime Agency
 *
 * Tests for type schemas and validation.
 *
 * @author d221155 (NCA)
 */

import {
  configSchema,
  tagConfig,
  docViewConfig,
  updateAnnotation,
  annotationConfig,
  ControlType,
} from './types';

describe('Schema Validation', () => {
  describe('configSchema', () => {
    it('should validate complete valid config', () => {
      const validConfig = {
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
              },
            ],
          },
        ],
      };

      expect(() => configSchema.validate(validConfig)).not.toThrow();
    });

    it('should apply default values for optional fields', () => {
      const minimalConfig = {
        docViews: [],
        annotations: [],
      };

      const result = configSchema.validate(minimalConfig);
      expect(result.enabled).toBe(true);
      // debug defaults to dev mode context, but in test context defaults to false
      // expect(typeof result.debug).toBe('boolean');
    });

    it('should validate with empty docViews and annotations', () => {
      const config = {
        enabled: true,
        debug: false,
        docViews: [],
        annotations: [],
      };

      expect(() => configSchema.validate(config)).not.toThrow();
    });

    it('should reject invalid enabled value', () => {
      const invalidConfig = {
        enabled: 'not a boolean',
        docViews: [],
        annotations: [],
      };

      expect(() => configSchema.validate(invalidConfig)).toThrow();
    });
  });

  describe('tagConfig.schema', () => {
    it('should validate tag config with children', () => {
      const validTag = {
        name: 'Sentiment',
        controlType: 'single',
        color: '#D36086',
        iconType: 'crosshairs',
        comment_required: false,
        children: [
          { name: 'Positive', comment_required: false },
          { name: 'Negative', comment_required: false },
        ],
      };

      expect(() => tagConfig.schema.validate(validTag)).not.toThrow();
    });

    it('should default controlType to "single"', () => {
      const tagWithoutControlType = {
        name: 'TestTag',
        comment_required: false,
      };

      const result = tagConfig.schema.validate(tagWithoutControlType);
      expect(result.controlType).toBe('single');
    });

    it('should accept optional color and iconType', () => {
      const tagWithOptionals = {
        name: 'TestTag',
        controlType: 'text',
        color: 'primary',
        iconType: 'flag',
        comment_required: false,
      };

      expect(() => tagConfig.schema.validate(tagWithOptionals)).not.toThrow();
    });

    it('should validate all ControlType enum values', () => {
      const controlTypes: ControlType[] = [
        ControlType.text,
        ControlType.switch,
        ControlType.radio,
        ControlType.multiple,
        ControlType.single,
      ];

      controlTypes.forEach((ct) => {
        const tag = {
          name: 'TestTag',
          controlType: ct,
          comment_required: false,
        };
        expect(() => tagConfig.schema.validate(tag)).not.toThrow();
      });
    });

    it('should require name field', () => {
      const tagWithoutName = {
        controlType: 'single',
        comment_required: false,
      };

      expect(() => tagConfig.schema.validate(tagWithoutName)).toThrow();
    });

    it('should default comment_required to false', () => {
      const tag = {
        name: 'TestTag',
        controlType: 'single',
      };

      const result = tagConfig.schema.validate(tag);
      expect(result.comment_required).toBe(false);
    });
  });

  describe('docViewConfig.schema', () => {
    it('should validate complete docView config', () => {
      const validDocView = {
        id: 'custom-id',
        title: 'Annotations',
        order: 5,
        fields: ['metadata.annotations', 'metadata.tags'],
      };

      expect(() => docViewConfig.schema.validate(validDocView)).not.toThrow();
    });

    it('should apply default values', () => {
      const minimalDocView = {
        title: 'TestTitle',
      };

      const result = docViewConfig.schema.validate(minimalDocView);
      expect(result.title).toBe('TestTitle');
      expect(result.order).toBe(1);
      expect(result.fields).toEqual([]);
    });

    it('should allow optional id field', () => {
      const docViewWithoutId = {
        title: 'Tags',
        order: 2,
        fields: ['metadata.annotations'],
      };

      const result = docViewConfig.schema.validate(docViewWithoutId);
      expect(result.id).toBeUndefined();
    });
  });

  describe('updateAnnotation.schema', () => {
    it('should validate annotation update with all fields', () => {
      const validUpdate = {
        feature_category: 'Sentiment',
        feature_name: 'Positive',
        feature_comment: 'This is a positive sentiment',
      };

      expect(() => updateAnnotation.schema.validate(validUpdate)).not.toThrow();
    });

    it('should require feature_category', () => {
      const updateWithoutCategory = {
        feature_name: 'Positive',
        feature_comment: 'Comment',
      };

      expect(() => updateAnnotation.schema.validate(updateWithoutCategory)).toThrow();
    });

    it('should allow optional feature_name and feature_comment', () => {
      const minimalUpdate = {
        feature_category: 'Sentiment',
      };

      const result = updateAnnotation.schema.validate(minimalUpdate);
      expect(result.feature_category).toBe('Sentiment');
      expect(result.feature_name).toBeUndefined();
      expect(result.feature_comment).toBeUndefined();
    });

    it('should reject invalid field types', () => {
      const invalidUpdate = {
        feature_category: 123, // should be string
      };

      expect(() => updateAnnotation.schema.validate(invalidUpdate)).toThrow();
    });
  });

  describe('annotationConfig.schema', () => {
    it('should validate complete annotation config', () => {
      const validAnnotation = {
        field: 'metadata.annotations',
        tags: [
          {
            name: 'Sentiment',
            controlType: 'single',
            comment_required: false,
            children: [{ name: 'Positive', comment_required: false }],
          },
        ],
      };

      expect(() => annotationConfig.schema.validate(validAnnotation)).not.toThrow();
    });

    it('should apply default field value', () => {
      const annotationWithoutField = {
        tags: [],
      };

      const result = annotationConfig.schema.validate(annotationWithoutField);
      expect(result.field).toBe('metadata.annotations');
    });

    it('should default tags to empty array', () => {
      const annotationWithoutTags = {
        field: 'custom.field',
      };

      const result = annotationConfig.schema.validate(annotationWithoutTags);
      expect(result.tags).toEqual([]);
    });

    it('should validate nested tag schemas', () => {
      const annotationWithInvalidTag = {
        field: 'metadata.annotations',
        tags: [
          {
            // missing required 'name' field
            controlType: 'single',
            comment_required: false,
          },
        ],
      };

      expect(() => annotationConfig.schema.validate(annotationWithInvalidTag)).toThrow();
    });
  });
});
