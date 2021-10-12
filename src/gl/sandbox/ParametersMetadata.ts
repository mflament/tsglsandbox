import { GLSandbox } from './GLSandbox';

export type ParameterSourceFunction<S extends GLSandbox = GLSandbox, T = any> = (sandbox: S) => T;
export type ParameterSource<S extends GLSandbox = GLSandbox, T = any> = ParameterSourceFunction<S, T> | T;

export interface ControlMetadata<S extends GLSandbox = GLSandbox> {
  label?: ParameterSource<S, string>;
  min?: ParameterSource<S, number>;
  max?: ParameterSource<S, number>;
  step?: ParameterSource<S, number>;
  json?: boolean;
  range?: boolean;
  color?: boolean;
  choices?: ParameterSource<S, Choices>;
  labels?: ParameterSource<S, string[]>;
  pattern?: ParameterSource<S, string>;
  isVisible?: ParameterSource<S, boolean>;
  debounce?: number;
  order?: number;
}

export interface RangeParameterMetadata<S extends GLSandbox = GLSandbox> extends ControlMetadata<S> {
  min: ParameterSource<S, number>;
  max: ParameterSource<S, number>;
}

export interface ChoiceParameterMetadata<S extends GLSandbox = GLSandbox> extends ControlMetadata<S> {
  choices: ParameterSource<S, Choices>;
}

export type Choices = { values: any[]; labels?: string[] };

export function control<S extends GLSandbox = GLSandbox>(value: ControlMetadata<S>): any {
  return (target: any, propertyKey: string): void => {
    setPropertyMetadata(target, propertyKey, value);
  };
}

export function isRangeMeta<S extends GLSandbox = GLSandbox>(
  obj: ControlMetadata<S>
): obj is RangeParameterMetadata<S> {
  return obj.range !== false && obj.min !== undefined && obj.max !== undefined;
}

export function isChoiceMeta(obj: ControlMetadata): obj is ChoiceParameterMetadata {
  return obj.choices !== undefined;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getMetadata(obj: any): ObjectMetadata {
  const metadata: ObjectMetadata = {};
  let current = obj;
  while (current !== null) {
    if (current.metadata) {
      Object.getOwnPropertyNames(current.metadata).forEach(n => {
        if (metadata[n] === undefined) metadata[n] = current.metadata[n];
      });
    }
    current = Object.getPrototypeOf(current);
  }
  return metadata;
}

export function getParameterMetadata<T>(obj: T, name: keyof T): ControlMetadata {
  const metadata = getMetadata(obj);
  return metadata[name] || {};
}

function setPropertyMetadata(objType: any, name: string, controlMetadata: ControlMetadata<any>) {
  let mdDesc = Object.getOwnPropertyDescriptor(objType, 'metadata');
  if (!mdDesc) {
    mdDesc = { configurable: false, writable: false, value: {} };
    Object.defineProperty(objType, 'metadata', mdDesc);
  }
  mdDesc.value[name] = controlMetadata;
}

type ObjectMetadata<T = any> = {
  [P in keyof T]?: ControlMetadata;
};
