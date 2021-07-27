import React, {ChangeEvent} from 'react';
import {JSONSandboxParameter} from '../../SandboxParameter';
import {AbstractParameterControl, ControlProps} from './AbstractParameterControl';

export class JSONParameterControl extends AbstractParameterControl<JSONSandboxParameter> {
  constructor(props: ControlProps<JSONSandboxParameter>) {
    super(props);
  }

  protected renderInput(value: string): JSX.Element {
    const param = this.props.parameter;
    const json = JSON.stringify(value, null, 2);
    return (
      <textarea className={param.type}
        value={json}
        onChange={e => this.onChange(e)}
      />
    );
  }

  protected onChange(evt: ChangeEvent<HTMLTextAreaElement>): void {
    const value = evt.target.value;
    this.value = JSON.parse(value);
  }
}
