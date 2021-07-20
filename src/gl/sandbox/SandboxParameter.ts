import {GLSandbox} from './GLSandbox';
import {
  Choices,
  ControlMetadata,
  getParameterMetadata,
  isChoiceMeta,
  isRangeMeta,
  ParameterSource,
  ParameterSourceFunction
} from './ParametersMetadata';

export type SandboxParameterType = 'object' | 'string' | 'number' | 'range' | 'choices' | 'boolean' | 'array';

export type ParameterChangeListener = (parameter: SandboxParameter, newValue: any) => any;

export interface SandboxParameter {
  readonly type: SandboxParameterType;
  readonly name: string;
  readonly parent: ObjectSandboxParameter | SandboxParameters;
  readonly label?: string;
  value: any;
  onchange?: ParameterChangeListener;
}

export interface StringSandboxParameter extends SandboxParameter {
  readonly type: 'string';
  readonly min?: number;
  readonly max?: number;
  readonly pattern?: string;
}

export interface NumberSandboxParameter extends SandboxParameter {
  readonly type: 'number';
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

export interface RangeSandboxParameter extends SandboxParameter {
  readonly type: 'range';
  readonly min: number;
  readonly max: number;
  readonly step?: number;
}

export interface ChoicesSandboxParameter extends SandboxParameter {
  readonly type: 'choices';
  readonly choices: Choices;
}

export interface BooleanSandboxParameter extends SandboxParameter {
  readonly type: 'boolean';
}

export interface ArraySandboxParameter extends SandboxParameter {
  readonly type: 'array';
  readonly min?: number;
  readonly max?: number;
}

export interface ObjectSandboxParameter extends SandboxParameter {
  readonly type: 'object';
  readonly parameters: SandboxParameter[];
}

export interface SandboxParameters {
  readonly sandbox: GLSandbox;
  readonly parameters: SandboxParameter[];
  onchange?: ParameterChangeListener;
}

export function createSandboxParameters(sandbox: GLSandbox, onchange?: ParameterChangeListener): SandboxParameters {
  return new DefaultSandboxParameters(sandbox, onchange);
}

function isSandboxParameters(obj: any): obj is SandboxParameters {
  const sbp = obj as SandboxParameters;
  return typeof sbp.sandbox === 'object' && Array.isArray(sbp.parameters);
}

abstract class AbstractSandboxParameter implements SandboxParameter, ControlMetadata {
  abstract readonly type: SandboxParameterType;
  private _notifying = false;

  protected constructor(
    readonly name: string,
    readonly container: any,
    readonly parent: ObjectSandboxParameter | SandboxParameters,
    readonly metadata: ControlMetadata,
    readonly onchange?: ParameterChangeListener
  ) {
  }

  get value(): any {
    return this.container[this.name];
  }

  set value(v: any) {
    this.container[this.name] = v;
    if (this.onchange && !this._notifying) {
      this._notifying = true;
      const stop = this.onchange(this, v) === false;
      this._notifying = false;
      if (stop) return;
    }
    if (this.parent.onchange) this.parent.onchange(this, v);
  }

  get sandbox(): GLSandbox {
    let current: ObjectSandboxParameter | SandboxParameters = this.parent;
    while (!isSandboxParameters(current)) current = current.parent;
    return current.sandbox;
  }

  private getMetadata<T>(source: ParameterSource<GLSandbox, T>): T {
    if (typeof source === 'function') {
      return (source as ParameterSourceFunction<GLSandbox, T>)(this.sandbox);
    }
    return source;
  }

  get label(): string | undefined {
    return this.getMetadata(this.metadata.label);
  }

  get min(): number | undefined {
    return this.getMetadata(this.metadata.min);
  }

  get max(): number | undefined {
    return this.getMetadata(this.metadata.max);
  }

  get step(): number | undefined {
    return this.getMetadata(this.metadata.step);
  }

  get range(): boolean | undefined {
    return this.metadata.range;
  }

  get choices(): Choices | undefined {
    return this.getMetadata(this.metadata.choices);
  }

  get pattern(): string | undefined {
    return this.getMetadata(this.metadata.pattern);
  }

  get isVisible(): boolean {
    const visible = this.getMetadata(this.metadata.isVisible);
    return typeof visible === 'undefined' ? true : visible;
  }
}

class DefaultSandboxParameters implements SandboxParameters {
  readonly parameters: SandboxParameter[];

  constructor(readonly sandbox: GLSandbox, readonly onchange?: ParameterChangeListener) {
    this.parameters = createParameters(sandbox.parameters, this, onchange);
  }
}

class DefaultObjectParameter extends AbstractSandboxParameter implements ObjectSandboxParameter {
  readonly type = 'object';
  private _parameters: SandboxParameter[];

  constructor(
    name: string,
    container: any,
    parent: ObjectSandboxParameter | SandboxParameters,
    metadata: ControlMetadata,
    onchange?: ParameterChangeListener
  ) {
    super(name, container, parent, metadata, onchange);
    this._parameters = createParameters(this.value, this);
  }

  get parameters(): SandboxParameter[] {
    return this._parameters;
  }

  set value(v: any) {
    // rescan parameters
    this._parameters = createParameters(v, this);
    super.value = v;
  }
}

class DefaultSandboxParameter extends AbstractSandboxParameter implements SandboxParameter {
  constructor(
    readonly type: SandboxParameterType,
    name: string,
    container: any,
    parent: ObjectSandboxParameter | SandboxParameters,
    metadata: ControlMetadata,
    onchange?: ParameterChangeListener
  ) {
    super(name, container, parent, metadata, onchange);
  }
}

class ChoiceSandboxParameter extends AbstractSandboxParameter implements ChoicesSandboxParameter {
  readonly type = 'choices';

  constructor(name: string,
              container: any,
              parent: ObjectSandboxParameter | SandboxParameters,
              metadata: ControlMetadata,
              onchange?: ParameterChangeListener) {
    super(name, container, parent, metadata, onchange);
    if (!metadata.choices) throw new Error("No choices in metadata");
  }

  get choices(): Choices {
    return super.choices as Choices;
  }
}

function createParameter(
  obj: any,
  name: string,
  parent: ObjectSandboxParameter | SandboxParameters,
  onchange?: ParameterChangeListener
): SandboxParameter {
  const value = obj[name];
  const metadata = getParameterMetadata(obj, name);
  const type = resolveParameterType(value, metadata);
  if (type === 'object') return new DefaultObjectParameter(name, obj, parent, metadata, onchange);
  if (type === 'choices') return new ChoiceSandboxParameter(name, obj, parent, metadata, onchange);
  return new DefaultSandboxParameter(type, name, obj, parent, metadata, onchange);
}

function createParameters(
  object: any,
  parent: ObjectSandboxParameter | SandboxParameters,
  onchange?: ParameterChangeListener
): SandboxParameter[] {
  return Object.keys(object).map(key => createParameter(object, key, parent, onchange));
}

function resolveParameterType(value: any, metadata: ControlMetadata): SandboxParameterType {
  if (isChoiceMeta(metadata)) return 'choices';
  const valueType = typeof value;
  switch (valueType) {
    case 'string':
      return 'string';
    case 'number':
      return isRangeMeta(metadata) ? 'range' : 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return Array.isArray(value) ? 'array' : 'object';
    default:
      throw new Error('Unhandled parameter type ' + valueType);
  }
}
