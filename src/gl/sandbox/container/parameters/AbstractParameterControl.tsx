import React, { Component } from 'react';
import { ObjectSandboxParameter, SandboxParameters, SandboxParameter } from '../../SandboxParameter';

export type ControlProps<P extends SandboxParameter> = { parameter: P };

export abstract class AbstractParameterControl<P extends SandboxParameter> extends Component<
  ControlProps<P>,
  { value: any }
> {
  readonly qualifiedName: string;

  constructor(props: ControlProps<P>) {
    super(props);
    this.qualifiedName = this.createQualifiedName();
    this.state = { value: props.parameter.value };
  }

  render(): JSX.Element {
    const parameter = this.props.parameter;
    return (
      <>
        <label>{parameter.label || parameter.name}</label>
        {this.renderInput()}
      </>
    );
  }

  protected abstract renderInput(): JSX.Element;

  update(): void {
    this.setState({ value: this.props.parameter.value });
  }

  set value(v: unknown) {
    const param = this.props.parameter;
    param.value = v;
    this.update();
  }

  private createQualifiedName(): string {
    let param: SandboxParameter = this.props.parameter;
    let qname = param.name;
    while (isObjectSanboxParameter(param.parent)) {
      param = param.parent;
      qname = param.name + '.' + qname;
    }
    return qname;
  }
}

function isObjectSanboxParameter(obj: ObjectSandboxParameter | SandboxParameters): obj is ObjectSandboxParameter {
  return (obj as ObjectSandboxParameter).type === 'object';
}
