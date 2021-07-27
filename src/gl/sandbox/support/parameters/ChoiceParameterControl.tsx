import React, {ChangeEvent} from 'react';
import {ChoicesSandboxParameter} from '../../SandboxParameter';
import {AbstractParameterControl, ControlProps} from './AbstractParameterControl';

export class ChoiceParameterControl extends AbstractParameterControl<ChoicesSandboxParameter> {
  private choices: any[] = [];

  constructor(props: ControlProps<ChoicesSandboxParameter>) {
    super(props);
  }

  protected renderInput(value: unknown): JSX.Element {
    const param = this.props.parameter;
    this.choices = param.choices.values;
    return (
      <select className={param.type} onChange={e => this.onChange(e)}>
        {this.choices.map((choice, index) => this.option(index, choice, value === choice))}
      </select>
    );
  }

  private option(index: number, choice: string | number, selected: boolean): JSX.Element {
    const choices = this.props.parameter.choices;
    const label = choices.labels && choices.labels[index] ? choices.labels[index] : choice.toString();
    return <option selected={selected} value={choice}>{label}</option>;
  }

  protected onChange(evt: ChangeEvent<HTMLSelectElement>): void {
    this.value = this.choices[evt.target.selectedIndex];
  }
}
