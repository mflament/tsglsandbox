import type {Config} from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  coverageProvider: 'v8',
  moduleDirectories: ['src', 'node_modules'],
  roots: ['./test']
};

export default config;
