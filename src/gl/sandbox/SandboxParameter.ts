import {GLSandbox} from './GLSandbox';
import {
  Choices,
  ControlMetadata,
  getObjectMetadata,
  getParameterMetadata,
  isChoiceMeta,
  isRangeMeta,
  ParameterSource,
  ParameterSourceFunction
} from './ParametersMetadata';

export type SandboxParameterType =
  'object'
  | 'string'
  | 'number'
  | 'range'
  | 'color'
  | 'choices'
  | 'boolean'
  | 'json';

export type ParameterChangeListener = (parameter: SandboxParameter, newValue: any) => any;

export interface SandboxParameter {
  readonly type: SandboxParameterType;
  readonly name: string;
  readonly label?: string;
  readonly parent: GLSandbox | ObjectSandboxParameter;
  readonly visible: boolean;
  readonly debounce: number;
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

export interface ColorSandboxParameter extends SandboxParameter {
  readonly type: 'color';
}

export interface JSONSandboxParameter extends SandboxParameter {
  readonly type: 'json';
}

export interface ObjectSandboxParameter extends SandboxParameter {
  readonly type: 'object';
  readonly json: boolean;
  readonly parameters: SandboxParameter[];
  readonly parent: ObjectSandboxParameter | GLSandbox;
}

export function createSandboxParameters(sandbox: GLSandbox, onchange?: ParameterChangeListener): ObjectSandboxParameter {
  return new DefaultObjectParameter('parameters', sandbox, sandbox, {}, onchange);
}

export function isObjectParameter(obj: unknown): obj is ObjectSandboxParameter {
  if (typeof obj === 'object') {
    return (obj as ObjectSandboxParameter).type === 'object';
  }
  return false;
}

abstract class AbstractSandboxParameter implements SandboxParameter, ControlMetadata {
  abstract readonly type: SandboxParameterType;

  protected constructor(
    readonly name: string,
    readonly container: any,
    readonly parent: ObjectSandboxParameter | GLSandbox,
    readonly metadata: ControlMetadata,
    readonly onchange: ParameterChangeListener | undefined,
    readonly defaultDebounce : number
  ) {
  }

  get value(): any {
    return this.container[this.name];
  }

  set value(v: any) {
    this.container[this.name] = v;
  }

  get debounce(): number {
    if (this.metadata.debounce !== undefined)
      return this.metadata.debounce;
    return this.defaultDebounce;
  }

  get sandbox(): GLSandbox {
    let current: ObjectSandboxParameter | GLSandbox | undefined = this.parent;
    while (current && isObjectParameter(current)) current = current.parent;
    return current;
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

  get visible(): boolean {
    const visible = this.getMetadata(this.metadata.isVisible);
    return typeof visible === 'undefined' ? true : visible;
  }
}

class DefaultObjectParameter extends AbstractSandboxParameter implements ObjectSandboxParameter {
  readonly type = 'object';
  readonly json: boolean;
  private _parameters: SandboxParameter[];

  constructor(
    name: string,
    container: any,
    parent: GLSandbox | ObjectSandboxParameter,
    metadata: ControlMetadata,
    onchange?: ParameterChangeListener
  ) {
    super(name, container, parent, metadata, onchange, 0);
    const value = container[name];

    const objectMetadata = getObjectMetadata(value);
    this.json = metadata.json == true || objectMetadata.json === true;
    if (this.json) {
      this._parameters = [new DefaultSandboxParameter('json', name, container, parent, {}, onchange)];
    } else {
      this._parameters = createParameters(container[name], parent, onchange);
    }
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
    parent: ObjectSandboxParameter | GLSandbox,
    metadata: ControlMetadata,
    onchange?: ParameterChangeListener,
    defaultDebounce = 100
  ) {
    super(name, container, parent, metadata, onchange, defaultDebounce);
  }
}

class ChoiceSandboxParameter extends AbstractSandboxParameter implements ChoicesSandboxParameter {
  readonly type = 'choices';

  constructor(name: string,
              container: any,
              parent: ObjectSandboxParameter | GLSandbox,
              metadata: ControlMetadata,
              onchange?: ParameterChangeListener,
              defaultDebounce= 100) {
    super(name, container, parent, metadata, onchange, defaultDebounce);
    if (!metadata.choices) throw new Error("No choices in metadata");
  }

  get choices(): Choices {
    return super.choices as Choices;
  }
}

function createParameter(
  obj: any,
  name: string,
  parent: ObjectSandboxParameter | GLSandbox,
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
  parent: ObjectSandboxParameter | GLSandbox,
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
      return metadata.color === true ? 'color' : isRangeMeta(metadata) ? 'range' : 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      if (metadata.json) return 'json';
      // keep in mind : handle array here
      return 'object';
    default:
      throw new Error('Unhandled parameter type ' + valueType);
  }
}
