import React, { ChangeEvent } from 'react';
import { StringSandboxParameter } from '../../SandboxParameter';
import { AbstractParameterControl, ControlProps } from './AbstractParameterControl';

export class StringParameterControl extends AbstractParameterControl<StringSandboxParameter> {
  constructor(props: ControlProps<StringSandboxParameter>) {
    super(props);
  }

  protected renderInput(value: string): JSX.Element {
    const param = this.props.parameter;
    return (
      <input
        type="string"
        className={param.type}
        minLength={param.min}
        maxLength={param.max}
        pattern={param.pattern}
        value={value}
        onChange={e => this.onChange(e)}
      />
    );
  }

  protected onChange(evt: ChangeEvent<HTMLInputElement>): void {
    if (evt.target.validity.valid) this.value = evt.target.value;
  }
}
