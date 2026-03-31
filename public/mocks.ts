/**
 * Crown Copyright 2026, National Crime Agency
 *
 * Mock factory for public plugin contracts (standard Kibana plugin mocking patterns).
 *
 * @author d221155 (NCA)
 */

import { AnnotatorPluginSetup, AnnotatorPluginStart } from './types';

export type Setup = jest.Mocked<AnnotatorPluginSetup>;
export type Start = jest.Mocked<AnnotatorPluginStart>;

const createSetupContract = (): Setup => {
  // Currently the public plugin returns an empty setup contract
  return {} as Setup;
};

const createStartContract = (): Start => {
  // Currently the public plugin returns an empty start contract
  return {} as Start;
};

export const annotatorPluginMock = {
  createSetup: createSetupContract,
  createStart: createStartContract,
};
