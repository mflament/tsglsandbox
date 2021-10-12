import { GLSandbox } from './GLSandbox';
import {
  Choices,
  ControlMetadata,
  getMetadata,
  getParameterMetadata,
  isChoiceMeta,
  isRangeMeta,
  ParameterSource,
  ParameterSourceFunction
} from './ParametersMetadata';
import { Partial } from 'rollup-plugin-typescript2/dist/partial';

export type ParameterChangeListener = (param: SandboxParameter) => any;

export type SandboxParameter =
  | StringSandboxParameter
  | NumberSandboxParameter
  | VectorSandboxParameter
  | ChoicesSandboxParameter
  | BooleanSandboxParameter
  | ColorSandboxParameter
  | JSONSandboxParameter
  | ObjectSandboxParameter;

interface SandboxParameterMap {
  object: ObjectSandboxParameter;
  string: StringSandboxParameter;
  number: NumberSandboxParameter;
  color: ColorSandboxParameter;
  choices: ChoicesSandboxParameter;
  boolean: BooleanSandboxParameter;
  vector: VectorSandboxParameter;
  json: JSONSandboxParameter;
}

type SandboxParameterType = keyof SandboxParameterMap;

export interface ISandboxParameter {
  readonly type: string;
  readonly name: string;
  readonly qualifiedName: string;
  readonly index: number;
  readonly label?: string;
  readonly parent: GLSandbox | ObjectSandboxParameter;
  readonly visible: boolean;
  readonly debounce: number;
  readonly order?: number;
  value: any;
  onchange?: ParameterChangeListener;
}

export interface StringSandboxParameter extends ISandboxParameter {
  readonly type: 'string';
  readonly min?: number;
  readonly max?: number;
  readonly pattern?: string;
}

interface INumberSandboxParameter extends ISandboxParameter {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;

  isRangeParameter(): this is { min: number; max: number; step?: number };
}

export interface NumberSandboxParameter extends INumberSandboxParameter {
  readonly type: 'number';
}

export interface RangeSandboxParameter extends INumberSandboxParameter {
  readonly type: 'number';
  readonly min?: number;
  readonly max?: number;
}

export interface VectorSandboxParameter extends INumberSandboxParameter {
  readonly type: 'vector';
  readonly dimensions: NumberSandboxParameter[];
}

export interface ChoicesSandboxParameter extends ISandboxParameter {
  readonly type: 'choices';
  readonly choices: Choices;
}

export interface BooleanSandboxParameter extends ISandboxParameter {
  readonly type: 'boolean';
}

export interface ColorSandboxParameter extends ISandboxParameter {
  readonly type: 'color';
}

export interface JSONSandboxParameter extends ISandboxParameter {
  readonly type: 'json';
}

export interface ObjectSandboxParameter extends ISandboxParameter {
  readonly type: 'object';
  readonly parameters: SandboxParameter[];
}

export function getQualifiedName(p: ISandboxParameter): string {
  let param = p;
  let qname = param.name;
  while (isObjectParameter(param.parent)) {
    param = param.parent;
    qname = param.name + '.' + qname;
  }
  return qname;
}

export function createSandboxParameters(
  sandbox: GLSandbox,
  onchange?: ParameterChangeListener
): ObjectSandboxParameter {
  return new DefaultObjectParameter({
    index: 0,
    name: 'parameters',
    container: sandbox,
    parent: sandbox,
    onchange: onchange,
    metadata: {}
  });
}

export function isObjectParameter(obj?: unknown): obj is ObjectSandboxParameter {
  return isSandboxParameter(obj) && obj.type === 'object';
}

export function isSandboxParameter(obj?: unknown): obj is ISandboxParameter {
  return typeof obj === 'object' && obj !== null && typeof (obj as Partial<ISandboxParameter>).type === 'string';
}

interface ParameterConfig {
  index: number;
  name: string;
  container: { [prop: string]: any };
  parent: ObjectSandboxParameter | GLSandbox;
  onchange?: ParameterChangeListener;
  metadata: ControlMetadata;
}

export abstract class AbstractSandboxParameter implements ISandboxParameter, ParameterConfig, ControlMetadata {
  private readonly _qualifiedName: string;

  readonly index: number;
  readonly container: { [prop: string]: any };
  readonly name: string;
  readonly parent: ObjectSandboxParameter | GLSandbox;
  readonly onchange?: ParameterChangeListener;
  readonly metadata: ControlMetadata;
  abstract readonly type: SandboxParameterType;

  protected constructor(config: ParameterConfig) {
    this._qualifiedName = getQualifiedName(this);
    this.metadata = config.metadata;
    this.container = config.container;
    this.index = config.index;
    this.name = config.name;
    this.parent = config.parent;
    this.onchange = config.onchange;
  }

  get qualifiedName(): string {
    return this._qualifiedName;
  }

  get value(): unknown {
    return this.container[this.name];
  }

  set value(v: unknown) {
    this.container[this.name] = v;
  }

  get debounce(): number {
    if (this.metadata.debounce !== undefined) return this.metadata.debounce;
    return 0;
  }

  get sandbox(): GLSandbox {
    let current: ObjectSandboxParameter | GLSandbox | undefined = this.parent;
    while (isObjectParameter(current)) current = current.parent;
    return current;
  }

  protected getMetadata<T>(source: ParameterSource<GLSandbox, T>): T {
    if (typeof source === 'function') {
      return (source as ParameterSourceFunction<GLSandbox, T>)(this.sandbox);
    }
    return source;
  }

  get label(): string | undefined {
    return this.getMetadata(this.metadata.label);
  }

  get order(): number | undefined {
    return this.getMetadata(this.metadata.order);
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
  private _parameters: SandboxParameter[];

  constructor(config: ParameterConfig) {
    super(config);
    const value = this.value;
    this._parameters = createParameters(value, this, config.onchange);
    // const objectMetadata = getObjectMetadata(value);
    // this.json = metadata.json == true || objectMetadata.json === true;
    // if (this.json) {
    //   this._parameters = [
    //     new DefaultSandboxParameter({
    //       index: 0,
    //       type: 'json',
    //       name: config.name,
    //       container,
    //       parent: config.parent,
    //       onchange: config.onchange
    //     })
    //   ];
    // } else {
    // }
  }

  get parameters(): SandboxParameter[] {
    return this._parameters;
  }

  get value(): any {
    return super.value;
  }

  set value(v: any) {
    // rescan parameters
    this._parameters = createParameters(v, this);
    super.value = v;
  }
}

function defaultSandboxParameter(
  type: 'string' | 'number' | 'color' | 'boolean' | 'json',
  config: ParameterConfig
): SandboxParameter {
  return new DefaultSandboxParameter(type, config) as SandboxParameter;
}

class DefaultSandboxParameter extends AbstractSandboxParameter {
  constructor(readonly type: 'string' | 'number' | 'color' | 'boolean' | 'json', config: ParameterConfig) {
    super(config);
  }
}

class DefaultNumberSandboxParameter extends AbstractSandboxParameter implements NumberSandboxParameter {
  readonly type = 'number';

  constructor(config: ParameterConfig) {
    super(config);
  }

  isRangeParameter(): this is { min: number; max: number; step?: number } {
    return isRangeMeta(this.metadata);
  }
}

class DefaultVectorSandboxParameter extends AbstractSandboxParameter implements VectorSandboxParameter {
  readonly type = 'vector';
  readonly dimensions: NumberSandboxParameter[];

  constructor(config: ParameterConfig) {
    super(config);
    const vector = this.value as number[];
    let labels = this.getMetadata(this.metadata.labels);
    if (!labels) labels = ['x', 'y', 'z', 'w'].splice(0, vector.length);
    this.dimensions = labels.map(
      (label, index) =>
        new VectorDimensionParameter({
          index: index,
          name: config.name + ' ' + label,
          parent: this.parent,
          container: vector,
          onchange: this.onchange,
          metadata: config.metadata
        })
    );
  }

  isRangeParameter(): this is { min: number; max: number; step?: number } {
    return isRangeMeta(this.metadata);
  }
}

class VectorDimensionParameter extends DefaultNumberSandboxParameter {
  constructor(config: ParameterConfig) {
    super(config);
  }

  get value(): number {
    return this.container[this.index];
  }

  set value(v: number) {
    this.container[this.index] = v;
  }
}

class ChoiceSandboxParameter extends AbstractSandboxParameter implements ChoicesSandboxParameter {
  readonly type = 'choices';

  constructor(config: ParameterConfig) {
    super(config);
    if (!this.metadata.choices) throw new Error('No choices in metadata');
  }

  get choices(): Choices {
    return super.choices as Choices;
  }
}

function createParameters(
  container: { [prop: string]: any },
  parent: ObjectSandboxParameter | GLSandbox,
  onchange?: ParameterChangeListener
): SandboxParameter[] {
  const propertyNames = new Set<string>();
  const metadata = getMetadata(container);
  Object.getOwnPropertyNames(metadata).forEach(n => propertyNames.add(n));
  Object.getOwnPropertyNames(container).forEach(n => propertyNames.add(n));

  let index = 0;
  const params: SandboxParameter[] = [];
  const baseConfig = { container: container, parent: parent, onchange: onchange };
  propertyNames.forEach(name => {
    const type = resolveParameterType(container, name);
    if (type) {
      const param = createParameter(
        { ...baseConfig, index: index++, name: name, metadata: getParameterMetadata(container, name) },
        type
      );
      params.push(param);
    }
  });
  return params.sort(compareParameters);
}

function resolveParameterType(obj: any, name: string): SandboxParameterType | null {
  const value = obj[name];
  const metadata = getParameterMetadata(obj, name);
  if (isChoiceMeta(metadata)) return 'choices';
  const valueType = typeof value;
  switch (valueType) {
    case 'string':
      return 'string';
    case 'number':
      return metadata.color === true ? 'color' : 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      if (metadata.json) return 'json';
      if (isVector(value)) return 'vector';
      return 'object';
    default:
      return null;
  }
}

export function createParameter(config: ParameterConfig, type: SandboxParameterType): SandboxParameter {
  switch (type) {
    case 'object':
      return new DefaultObjectParameter(config);
    case 'choices':
      return new ChoiceSandboxParameter(config);
    case 'vector':
      return new DefaultVectorSandboxParameter(config);
    case 'number':
      return new DefaultNumberSandboxParameter(config);
    default:
      return defaultSandboxParameter(type, config);
  }
}

function compareParameters(sp1: SandboxParameter, sp2: SandboxParameter): number {
  if (sp1.order !== undefined && sp2.order !== undefined) return sp1.order - sp2.order;
  if (sp1.order !== undefined) return -1;
  if (sp2.order !== undefined) return 1;
  return sp1.index - sp2.index;
}

function isVector(v: unknown): v is number[] {
  return Array.isArray(v) && v.every(e => typeof e === 'number') && v.length >= 2 && v.length <= 4;
}
