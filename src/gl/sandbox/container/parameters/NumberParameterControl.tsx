import React, { ChangeEvent } from 'react';
import { NumberSandboxParameter } from '../../SandboxParameter';
import { AbstractParameterControl, ControlProps } from './AbstractParameterControl';

export class NumberParameterControl extends AbstractParameterControl<NumberSandboxParameter> {
  constructor(props: ControlProps<NumberSandboxParameter>) {
    super(props);
  }

  protected renderInput(): JSX.Element {
    const param = this.props.parameter;
    return (
      <input
        type="number"
        min={param.min}
        max={param.max}
        value={param.value}
        step={param.step}
        onChange={e => this.onChange(e)}
      />
    );
  }

  protected onChange(evt: ChangeEvent<HTMLInputElement>): void {
    const value = evt.target.valueAsNumber;
    if (isNaN(value)) return;
    this.value = value;
  }
}
