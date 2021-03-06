import React, { ChangeEvent } from 'react';
import { AbstractParameterControl, ControlProps } from './AbstractParameterControl';
import { RangeSandboxParameter } from 'gl';

export class RangeParameterControl extends AbstractParameterControl<RangeSandboxParameter> {
  constructor(props: ControlProps<RangeSandboxParameter>) {
    super(props);
  }

  protected renderInput(value: number): JSX.Element {
    const param = this.props.parameter;
    return (
      <div className={'inputs ' + param.type}>
        <input
          type="range"
          min={param.min}
          max={param.max}
          value={value}
          step={param.step}
          onChange={e => this.onChange(e)}
        />
        <input
          type="number"
          min={param.min}
          max={param.max}
          value={value}
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
