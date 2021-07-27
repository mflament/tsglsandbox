import React, {ChangeEvent} from 'react';
import {ColorSandboxParameter} from '../../SandboxParameter';
import {AbstractParameterControl, ControlProps} from './AbstractParameterControl';
import {Color} from "three";


function formatColor(value: number): string {
  return '#' + new Color(value).getHexString();
}

function parseColor(value: string): number {
  return new Color(value).getHex();
}

export class ColorParameterControl extends AbstractParameterControl<ColorSandboxParameter> {
  constructor(props: ControlProps<ColorSandboxParameter>) {
    super(props);
  }

  protected renderInput(value: number): JSX.Element {
    const param = this.props.parameter;
    return (
      <input
        type="color"
        className={param.type}
        value={formatColor(value)}
        onChange={e => this.onChange(e)}
      />
    );
  }

  protected onChange(evt: ChangeEvent<HTMLInputElement>): void {
    const value = evt.target.value;
    this.value = parseColor(value);
  }
}
