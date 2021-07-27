import React, {Component} from 'react';
import {isObjectParameter, SandboxParameter} from '../../SandboxParameter';

export type ControlProps<P extends SandboxParameter> = { parameter: P };

export abstract class AbstractParameterControl<P extends SandboxParameter> extends Component<ControlProps<P>, { value: any }> {
  readonly qualifiedName: string;
  private debounceTimer?: number;

  protected constructor(props: ControlProps<P>) {
    super(props);
    this.qualifiedName = this.createQualifiedName();
    this.state = {value: props.parameter.value};
  }

  render(): JSX.Element {
    const parameter = this.props.parameter;
    return (
      <>
        <label className={parameter.type}>{parameter.label || parameter.name}</label>
        {this.renderInput(this.state.value)}
      </>
    );
  }

  protected abstract renderInput(value: unknown): JSX.Element;

  set value(v: unknown) {
    if (this.debounceTimer !== undefined) {
      self.clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
    this.setState({value: v});
    const debounce = this.props.parameter.debounce;
    if (debounce > 0) {
      this.debounceTimer = self.setTimeout(() => {
        this.update();
        this.debounceTimer = undefined;
      }, debounce);
    } else {
      this.update();
    }
  }

  private update(): void {
    const value = this.state.value;
    const param = this.props.parameter;
    param.value = value;
    if (param.onchange) {
      param.onchange(param, value);
    }
    if (isObjectParameter(param.parent) && param.parent.onchange) {
      param.parent.onchange(param, value);
    }
  }


  private createQualifiedName(): string {
    let param: SandboxParameter = this.props.parameter;
    let qname = param.name;
    while (isObjectParameter(param.parent)) {
      param = param.parent;
      qname = param.name + '.' + qname;
    }
    return qname;
  }
}
