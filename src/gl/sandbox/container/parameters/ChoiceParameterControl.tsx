import React, {ChangeEvent} from 'react';
import {ChoicesSandboxParameter} from '../../SandboxParameter';
import {AbstractParameterControl, ControlProps} from './AbstractParameterControl';

export class ChoiceParameterControl extends AbstractParameterControl<ChoicesSandboxParameter> {
  private values: any[] = [];

  constructor(props: ControlProps<ChoicesSandboxParameter>) {
    super(props);
  }

  protected renderInput(): JSX.Element {
    const param = this.props.parameter;
    this.values = param.choices.values;
    return (
      <select onChange={e => this.onChange(e)}>
        {this.values.map((value, index) => this.option(index, value))}
      </select>
    );
  }

  private option(index: number, value: string | number): JSX.Element {
    const param = this.props.parameter;
    const choices = param.choices;
    const label = choices.labels && choices.labels[index] ? choices.labels[index] : value.toString();
    return <option selected={param.value === value} value={value}>{label}</option>;
  }

  protected onChange(evt: ChangeEvent<HTMLSelectElement>): void {
    this.value = this.values[evt.target.selectedIndex];
  }
}
