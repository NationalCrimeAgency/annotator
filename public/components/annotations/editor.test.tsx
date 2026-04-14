/**
 * Crown Copyright 2026, National Crime Agency
 *
 * Tests for AnnotationsFieldFormatterEditor component.
 *
 * @author d221155 (NCA)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Simplified mock that doesn't interfere with the real component
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  setEuiDevProviderWarning: jest.fn(),
}));

import { AnnotationsFieldFormatterEditor } from './editor';
import { AnnotationsFieldFormatter } from '../../../common';

describe('AnnotationsFieldFormatterEditor', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render field name input', () => {
    // @ts-ignore
    const { container } = render(<AnnotationsFieldFormatterEditor onChange={mockOnChange} />);

    const input = container.querySelector('input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('metadata.annotations');
  });

  it('should call onChange with updated fieldName on input change', () => {
    // @ts-ignore
    const { container } = render(<AnnotationsFieldFormatterEditor onChange={mockOnChange} />);

    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'custom.field.name' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      fieldName: 'custom.field.name',
    });
  });

  it('should display field name label', () => {
    // @ts-ignore
    render(<AnnotationsFieldFormatterEditor onChange={mockOnChange} />);

    expect(screen.getByText('Field Name')).toBeInTheDocument();
  });

  it('should display help text for field name requirement', () => {
    // @ts-ignore
    render(<AnnotationsFieldFormatterEditor onChange={mockOnChange} />);

    expect(
      screen.getByText(
        /Enter the field name so it can be matched against the Annotator configuration/
      )
    ).toBeInTheDocument();
  });

  it('should mark input as required', () => {
    // @ts-ignore
    const { container } = render(<AnnotationsFieldFormatterEditor onChange={mockOnChange} />);

    const input = container.querySelector('input');
    expect(input).toBeRequired();
  });

  it('should have formatId matching AnnotationsFieldFormatter', () => {
    expect(AnnotationsFieldFormatterEditor.formatId).toBe(AnnotationsFieldFormatter.id);
    expect(AnnotationsFieldFormatterEditor.formatId).toBe('annotations');
  });

  it('should handle multiple onChange calls', () => {
    // @ts-ignore
    const { container } = render(<AnnotationsFieldFormatterEditor onChange={mockOnChange} />);

    const input = container.querySelector('input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'field1' } });
    fireEvent.change(input, { target: { value: 'field2' } });
    fireEvent.change(input, { target: { value: 'field3' } });

    expect(mockOnChange).toHaveBeenCalledTimes(3);
    expect(mockOnChange).toHaveBeenLastCalledWith({
      fieldName: 'field3',
    });
  });
});
