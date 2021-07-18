import React, { ChangeEvent } from 'react';
import { RangeSandboxParameter } from '../../SandboxParameter';
import { AbstractParameterControl, ControlProps } from './AbstractParameterControl';

export class RangeParameterControl extends AbstractParameterControl<RangeSandboxParameter> {
  constructor(props: ControlProps<RangeSandboxParameter>) {
    super(props);
  }

  protected renderInput(): JSX.Element {
    const param = this.props.parameter;
    return (
      <div className="range">
        <input
          type="range"
          min={param.min}
          max={param.max}
          value={param.value}
          step={param.step}
          onChange={e => this.onChange(e)}
        />
        <input
          type="number"
          min={param.min}
          max={param.max}
          value={param.value}
          step={param.step}
          onChange={e => this.onChange(e)}
        />
      </div>
    );
  }

  protected onChange(evt: ChangeEvent<HTMLInputElement>): void {
    const value = evt.target.valueAsNumber;
    if (isNaN(value)) return;
    this.value = value;
  }
}