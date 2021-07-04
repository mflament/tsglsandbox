import { GLSandbox } from './GLSandbox';

export type ParametersMetadata<T, S extends GLSandbox = GLSandbox> = {
  [name in keyof T]?: ControlMetadata<S>;
};

export type WithMetadata<T> = {
  metadata?: ParametersMetadata<T>;
};

export type ParameterSourceFunction<S extends GLSandbox = GLSandbox, T = any> = (sandbox: S) => T;
export type ParameterSource<S extends GLSandbox = GLSandbox, T = any> = ParameterSourceFunction<S, T> | T;

export interface ControlMetadata<S extends GLSandbox = GLSandbox> {
  label?: ParameterSource<S, string>;
  min?: ParameterSource<S, number>;
  max?: ParameterSource<S, number>;
  step?: ParameterSource<S, number>;
  range?: boolean;
  choices?: ParameterSource<S, any[]>;
  pattern?: ParameterSource<S, string>;
}

export interface RangeParameterMetadata<S extends GLSandbox = GLSandbox> extends ControlMetadata<S> {
  min: ParameterSource<S, number>;
  max: ParameterSource<S, number>;
}

export interface ChoiceParameterMetadata<S extends GLSandbox = GLSandbox> extends ControlMetadata<S> {
  choices?: ParameterSource<S, any[]>;
}

export function control<S extends GLSandbox = GLSandbox>(value: ControlMetadata<S>): any {
  return (target: any, propertyKey: string): void => setPropMetadata(target, propertyKey, value as ControlMetadata);
}

export function isRangeMeta<S extends GLSandbox = GLSandbox>(
  obj: ControlMetadata<S>
): obj is RangeParameterMetadata<S> {
  return obj.range !== false && obj.min !== undefined && obj.max !== undefined;
}

export function isChoiceMeta<S extends GLSandbox = GLSandbox>(
  obj: ControlMetadata<S>
): obj is ChoiceParameterMetadata<S> {
  return obj.choices !== undefined;
}

export function getParameterMetadata<T>(obj: WithMetadata<T>, name: keyof T): ControlMetadata {
  let res: ControlMetadata | undefined;
  if (obj.metadata) res = obj.metadata[name];
  return res || {};
}

function setPropMetadata<T>(obj: WithMetadata<T>, name: keyof T, value: ControlMetadata) {
  obj.metadata = obj.metadata || {};
  obj.metadata[name] = value;
}
