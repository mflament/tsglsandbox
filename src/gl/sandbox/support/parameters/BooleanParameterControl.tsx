import React, {ChangeEvent} from 'react';
import {BooleanSandboxParameter} from '../../SandboxParameter';
import {AbstractParameterControl, ControlProps} from './AbstractParameterControl';

export class BooleanParameterControl extends AbstractParameterControl<BooleanSandboxParameter> {
  constructor(props: ControlProps<BooleanSandboxParameter>) {
    super(props);
  }

  protected renderInput(value: boolean): JSX.Element {
    const param = this.props.parameter;
    return <input type="checkbox" className={param.type} checked={value} onChange={e => this.onChange(e)} />;
  }

  protected onChange(evt: ChangeEvent<HTMLInputElement>): void {
    const value = evt.target.checked;
    this.value = value;
  }
}
