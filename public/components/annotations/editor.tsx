/**
 * Crown Copyright 2026, National Crime Agency
 *
 * Package for an editor for the custom field formatter for annotations.
 *
 * @author d221155 (NCA)
 */

import React from 'react';
import {EuiFormRow, EuiFieldText} from '@elastic/eui';
import {FieldFormatEditor} from "@kbn/data-view-field-editor-plugin/public";
import {AnnotationsFieldFormatter, AnnotationsFieldFormatterParams} from "../../../common";

/**
 * Captures a configuration for use by the custom field formatter for annotations.
 * @param props
 * @constructor
 */
export const AnnotationsFieldFormatterEditor: FieldFormatEditor<AnnotationsFieldFormatterParams> = (props) => {
  return (
    <EuiFormRow label="Field Name"
                helpText="Enter the field name so it can be matched against the Annotator configuration parameters">
      <EuiFieldText
        defaultValue='metadata.annotations'
        required={true}
        onChange={(e) => {
          props.onChange({
            fieldName: e.target.value,
          } as AnnotationsFieldFormatterParams);
        }}
      />
    </EuiFormRow>
  );
};

// Force the editor `formatId` to match the custom field formatter, see https://github.com/elastic/kibana/issues/108158
AnnotationsFieldFormatterEditor.formatId = AnnotationsFieldFormatter.id;
