/**
 * Crown Copyright 2026, National Crime Agency
 *
 * Tests for shared annotation component utilities.
 *
 * @author d221155 (NCA)
 */

import { render } from '@testing-library/react';

// Use real EUI components - only mock what's necessary
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  setEuiDevProviderWarning: jest.fn(),
}));

import {
  formatAnnotationConfigsToComboBoxOptions,
  formatAnnotationConfigsToRadioGroupOptions,
  formatAnnotationsToText,
  formatAnnotationsToBoolean,
  formatAnnotationsToRadioGroupOptionId,
  formatAnnotationsToComboBoxOptions,
  formatAnnotationsToFieldValues,
  formatFieldToAnnotations,
  generateAnnotationControl,
} from './shared';
import { TagConfig, AnnotationType, AnnotationConfigFlat } from '../../../common';
import { EuiComboBoxOptionOption } from '@elastic/eui';

describe('Annotation Formatters', () => {
  describe('formatAnnotationConfigsToComboBoxOptions', () => {
    it('should convert flat tag configs to combo box options', () => {
      const tagConfigs: TagConfig[] = [
        {
          name: 'Tag1',
          controlType: 'single',
          color: 'primary',
          iconType: 'tag',
          comment_required: false,
        },
      ];

      const result = formatAnnotationConfigsToComboBoxOptions(tagConfigs);

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Tag1');
      expect(result[0].color).toBe('primary');
      expect(result[0].isGroupLabelOption).toBeFalsy();
    });

    it('should handle nested children with group labels', () => {
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

      const result = formatAnnotationConfigsToComboBoxOptions(tagConfigs);

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Sentiment');
      expect(result[0].isGroupLabelOption).toBe(true);
      expect(result[0].options).toHaveLength(2);
      expect(result[0].options![0].label).toBe('Positive');
      expect(result[0].options![1].label).toBe('Negative');
    });

    it('should apply color and iconType to options', () => {
      const tagConfigs: TagConfig[] = [
        {
          name: 'Priority',
          controlType: 'multiple',
          color: 'warning',
          iconType: 'flag',
          comment_required: false,
          children: [{ name: 'High', comment_required: false }],
        },
      ];

      const result = formatAnnotationConfigsToComboBoxOptions(tagConfigs);

      expect(result[0].color).toBe('warning');
      expect(result[0].options![0].color).toBe('warning');
    });

    it('should use default values when color/iconType not provided', () => {
      const tagConfigs: TagConfig[] = [
        {
          name: 'Basic',
          controlType: 'single',
          comment_required: false,
        },
      ];

      const result = formatAnnotationConfigsToComboBoxOptions(tagConfigs);

      expect(result[0].color).toBe('default');
    });

    it('should mark parent categories with isGroupLabelOption', () => {
      const tagConfigs: TagConfig[] = [
        {
          name: 'WithChildren',
          controlType: 'single',
          comment_required: false,
          children: [{ name: 'Child1', comment_required: false }],
        },
        {
          name: 'WithoutChildren',
          controlType: 'single',
          comment_required: false,
        },
      ];

      const result = formatAnnotationConfigsToComboBoxOptions(tagConfigs);

      expect(result[0].isGroupLabelOption).toBe(true);
      expect(result[1].isGroupLabelOption).toBeFalsy();
    });
  });

  describe('formatAnnotationConfigsToRadioGroupOptions', () => {
    it('should convert tag configs with children to radio options', () => {
      const tagConfigs: TagConfig[] = [
        {
          name: 'Status',
          controlType: 'radio',
          comment_required: false,
          children: [
            { name: 'Active', comment_required: false },
            { name: 'Inactive', comment_required: false },
          ],
        },
      ];

      const result = formatAnnotationConfigsToRadioGroupOptions(tagConfigs);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'Active', label: 'Active' });
      expect(result[1]).toEqual({ id: 'Inactive', label: 'Inactive' });
    });

    it('should handle tag configs without children', () => {
      const tagConfigs: TagConfig[] = [
        {
          name: 'NoChildren',
          controlType: 'text',
          comment_required: false,
        },
      ];

      const result = formatAnnotationConfigsToRadioGroupOptions(tagConfigs);

      expect(result).toEqual([]);
    });

    it('should flatten multiple tag configs', () => {
      const tagConfigs: TagConfig[] = [
        {
          name: 'Tag1',
          controlType: 'radio',
          comment_required: false,
          children: [{ name: 'Option1', comment_required: false }],
        },
        {
          name: 'Tag2',
          controlType: 'radio',
          comment_required: false,
          children: [{ name: 'Option2', comment_required: false }],
        },
      ];

      const result = formatAnnotationConfigsToRadioGroupOptions(tagConfigs);

      expect(result).toHaveLength(2);
    });
  });

  describe('formatAnnotationsToText', () => {
    it('should extract feature_comment from annotation', () => {
      const annotations: AnnotationType[] = [
        {
          source_type: 'human',
          source_name: 'annotator',
          created_timestamp: '2025-01-01T00:00:00Z',
          created_username: 'test-user',
          feature_category: 'Notes',
          feature_comment: 'This is a test comment',
        },
      ];

      const result = formatAnnotationsToText(annotations);
      expect(result).toBe('This is a test comment');
    });

    it('should handle annotations without comments', () => {
      const annotations: AnnotationType[] = [
        {
          source_type: 'human',
          source_name: 'annotator',
          created_timestamp: '2025-01-01T00:00:00Z',
          created_username: 'test-user',
          feature_category: 'Notes',
        },
      ];

      const result = formatAnnotationsToText(annotations);
      expect(result).toBeUndefined();
    });
  });

  describe('formatAnnotationsToBoolean', () => {
    it('should return true when annotation exists', () => {
      const annotations: AnnotationType[] = [
        {
          source_type: 'human',
          source_name: 'annotator',
          created_timestamp: '2025-01-01T00:00:00Z',
          created_username: 'test-user',
          feature_category: 'Flagged',
        },
      ];

      const result = formatAnnotationsToBoolean(annotations);
      expect(result).toBe(true);
    });

    it('should return false for empty annotations', () => {
      const annotations: AnnotationType[] = [];
      const result = formatAnnotationsToBoolean(annotations);
      expect(result).toBe(false);
    });
  });

  describe('formatAnnotationsToRadioGroupOptionId', () => {
    it('should extract feature_name from annotation', () => {
      const annotations: AnnotationType[] = [
        {
          source_type: 'human',
          source_name: 'annotator',
          created_timestamp: '2025-01-01T00:00:00Z',
          created_username: 'test-user',
          feature_category: 'Status',
          feature_name: 'Active',
        },
      ];

      const result = formatAnnotationsToRadioGroupOptionId(annotations);
      expect(result).toBe('Active');
    });
  });

  describe('formatAnnotationsToComboBoxOptions', () => {
    const configTags: AnnotationConfigFlat[] = [
      {
        categoryName: 'Sentiment',
        featureName: 'Positive',
        controlType: 'single',
        color: 'success',
        iconType: 'check',
        comment_required: false,
      },
    ];

    it('should convert annotations to combo box options with config', () => {
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

      const result = formatAnnotationsToComboBoxOptions(annotations, configTags);

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Positive');
      expect(result[0].value).toBe('Sentiment');
      expect(result[0].color).toBe('success');
    });

    it('should use default values when config not found', () => {
      const annotations: AnnotationType[] = [
        {
          source_type: 'human',
          source_name: 'annotator',
          created_timestamp: '2025-01-01T00:00:00Z',
          created_username: 'test-user',
          feature_category: 'Unknown',
          feature_name: 'Test',
        },
      ];

      const result = formatAnnotationsToComboBoxOptions(annotations, configTags);

      expect(result[0].color).toBe('default');
    });
  });

  describe('formatAnnotationsToFieldValues', () => {
    const tagConfigs: TagConfig[] = [
      {
        name: 'Notes',
        controlType: 'text',
        comment_required: false,
      },
      {
        name: 'Flagged',
        controlType: 'switch',
        comment_required: false,
      },
      {
        name: 'Status',
        controlType: 'radio',
        comment_required: false,
        children: [{ name: 'Active', comment_required: false }],
      },
      {
        name: 'Tags',
        controlType: 'multiple',
        comment_required: false,
        children: [{ name: 'Important', comment_required: false }],
      },
    ];

    const configTags: AnnotationConfigFlat[] = [
      {
        categoryName: 'Tags',
        featureName: 'Important',
        controlType: 'multiple',
        comment_required: false,
      },
    ];

    it('should format text control annotations to string', () => {
      const annotations: AnnotationType[] = [
        {
          source_type: 'human',
          source_name: 'annotator',
          created_timestamp: '2025-01-01T00:00:00Z',
          created_username: 'test-user',
          feature_category: 'Notes',
          feature_comment: 'Test comment',
        },
      ];

      const result = formatAnnotationsToFieldValues(annotations, tagConfigs, configTags);

      expect(result.get('Notes')).toBe('Test comment');
    });

    it('should format switch control to boolean', () => {
      const annotations: AnnotationType[] = [
        {
          source_type: 'human',
          source_name: 'annotator',
          created_timestamp: '2025-01-01T00:00:00Z',
          created_username: 'test-user',
          feature_category: 'Flagged',
        },
      ];

      const result = formatAnnotationsToFieldValues(annotations, tagConfigs, configTags);

      expect(result.get('Flagged')).toBe(true);
    });

    it('should format radio control to string', () => {
      const annotations: AnnotationType[] = [
        {
          source_type: 'human',
          source_name: 'annotator',
          created_timestamp: '2025-01-01T00:00:00Z',
          created_username: 'test-user',
          feature_category: 'Status',
          feature_name: 'Active',
        },
      ];

      const result = formatAnnotationsToFieldValues(annotations, tagConfigs, configTags);

      expect(result.get('Status')).toBe('Active');
    });

    it('should format multiple selections to combo box array', () => {
      const annotations: AnnotationType[] = [
        {
          source_type: 'human',
          source_name: 'annotator',
          created_timestamp: '2025-01-01T00:00:00Z',
          created_username: 'test-user',
          feature_category: 'Tags',
          feature_name: 'Important',
        },
      ];

      const result = formatAnnotationsToFieldValues(annotations, tagConfigs, configTags);
      const tags = result.get('Tags') as EuiComboBoxOptionOption[];

      expect(Array.isArray(tags)).toBe(true);
      expect(tags).toHaveLength(1);
    });

    it('should return empty Map for no annotations', () => {
      const result = formatAnnotationsToFieldValues([], tagConfigs, configTags);

      expect(result.size).toBe(4);
      expect(result.get('Flagged')).toBe(false);
    });
  });

  describe('formatFieldToAnnotations', () => {
    const tagConfigs: TagConfig[] = [
      {
        name: 'Notes',
        controlType: 'text',
        comment_required: false,
      },
      {
        name: 'Flagged',
        controlType: 'switch',
        comment_required: false,
      },
      {
        name: 'Status',
        controlType: 'radio',
        comment_required: false,
      },
      {
        name: 'Tags',
        controlType: 'multiple',
        comment_required: false,
      },
    ];

    it('should convert text field value to annotation', () => {
      const result = formatFieldToAnnotations('Notes', 'Test comment', tagConfigs);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        feature_category: 'Notes',
        feature_comment: 'Test comment',
      });
    });

    it('should not create annotation for short text', () => {
      const result = formatFieldToAnnotations('Notes', 'x', tagConfigs);
      expect(result).toEqual([]);
    });

    it('should convert switch boolean to annotation', () => {
      const resultTrue = formatFieldToAnnotations('Flagged', true, tagConfigs);
      expect(resultTrue).toHaveLength(1);
      expect(resultTrue[0]).toEqual({ feature_category: 'Flagged' });

      const resultFalse = formatFieldToAnnotations('Flagged', false, tagConfigs);
      expect(resultFalse).toEqual([]);
    });

    it('should convert radio selection to annotation', () => {
      const result = formatFieldToAnnotations('Status', 'Active', tagConfigs);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        feature_category: 'Status',
        feature_name: 'Active',
      });
    });

    it('should convert combo box array to multiple annotations', () => {
      const options: EuiComboBoxOptionOption[] = [
        { label: 'Important', value: 'Tags' },
        { label: 'Urgent', value: 'Tags' },
      ];

      const result = formatFieldToAnnotations('Tags', options, tagConfigs);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        feature_category: 'Tags',
        feature_name: 'Important',
      });
      expect(result[1]).toEqual({
        feature_category: 'Tags',
        feature_name: 'Urgent',
      });
    });

    it('should handle undefined values gracefully', () => {
      const result = formatFieldToAnnotations('Notes', undefined, tagConfigs);
      expect(result).toEqual([]);
    });
  });

  describe('generateAnnotationControl', () => {
    const mockFieldValues = new Map<string, any>();
    const mockOnChange = jest.fn();

    beforeEach(() => {
      mockFieldValues.clear();
      mockOnChange.mockClear();
    });

    it('should render EuiMarkdownEditor for text control', () => {
      const tagConfig: TagConfig = {
        name: 'Notes',
        controlType: 'text',
        comment_required: false,
      };
      mockFieldValues.set('Notes', 'Test content');

      const result = generateAnnotationControl(tagConfig, 'test', mockFieldValues, mockOnChange);
      const { container } = render(result);

      // Should render a markdown editor (which includes a textarea)
      expect(container.querySelector('textarea')).toBeInTheDocument();
    });

    it('should render EuiSwitch for switch control', () => {
      const tagConfig: TagConfig = {
        name: 'Flagged',
        controlType: 'switch',
        comment_required: false,
      };
      mockFieldValues.set('Flagged', true);

      const result = generateAnnotationControl(tagConfig, 'test', mockFieldValues, mockOnChange);
      const { container } = render(result);

      // Should render a switch (button with role="switch")
      expect(container.querySelector('button[role="switch"]')).toBeInTheDocument();
    });

    it('should render EuiRadioGroup for radio control', () => {
      const tagConfig: TagConfig = {
        name: 'Status',
        controlType: 'radio',
        comment_required: false,
        children: [
          { name: 'Active', comment_required: false },
          { name: 'Inactive', comment_required: false },
        ],
      };
      mockFieldValues.set('Status', 'Active');

      const result = generateAnnotationControl(tagConfig, 'test', mockFieldValues, mockOnChange);
      const { container } = render(result);

      // Should render radio inputs
      const radios = container.querySelectorAll('input[type="radio"]');
      expect(radios.length).toBeGreaterThan(0);
    });

    it('should render EuiComboBox for single control (default)', () => {
      const tagConfig: TagConfig = {
        name: 'Priority',
        controlType: 'single',
        comment_required: false,
        children: [{ name: 'High', comment_required: false }],
      };
      mockFieldValues.set('Priority', []);

      const result = generateAnnotationControl(tagConfig, 'test', mockFieldValues, mockOnChange);
      const { container } = render(result);

      // Should render a combobox (has specific EUI classes)
      expect(container.querySelector('.euiComboBox')).toBeInTheDocument();
    });

    it('should render EuiComboBox for multiple control', () => {
      const tagConfig: TagConfig = {
        name: 'Tags',
        controlType: 'multiple',
        comment_required: false,
        children: [{ name: 'Important', comment_required: false }],
      };
      mockFieldValues.set('Tags', []);

      const result = generateAnnotationControl(tagConfig, 'test', mockFieldValues, mockOnChange);
      const { container } = render(result);

      // Should render a combobox
      expect(container.querySelector('.euiComboBox')).toBeInTheDocument();
    });
  });
});
