import React, {Component} from 'react';
import {
  BooleanSandboxParameter,
  ChoicesSandboxParameter,
  NumberSandboxParameter,
  RangeSandboxParameter,
  SandboxParameter,
  StringSandboxParameter
} from '../../SandboxParameter';
import {NumberParameterControl} from './NumberParameterControl';
import {RangeParameterControl} from './RangeParameterControl';
import {StringParameterControl} from './StringParameterControl';
import {BooleanParameterControl} from './BooleanParameterControl';
import {ChoiceParameterControl} from "./ChoiceParameterControl";

interface ParameterControlsProps {
  parameters: SandboxParameter[];
}

export type SupportedParameterTypes =
  | NumberSandboxParameter
  | RangeSandboxParameter
  | StringSandboxParameter
  | BooleanSandboxParameter
  | ChoicesSandboxParameter;

export function isSupported(parameter: SandboxParameter): parameter is SupportedParameterTypes {
  return (
    parameter.type === 'number' ||
    parameter.type === 'range' ||
    parameter.type === 'string' ||
    parameter.type === 'boolean' ||
    parameter.type === 'choices'
  );
}

export class ParameterControls extends Component<ParameterControlsProps> {
  constructor(props: ParameterControlsProps) {
    super(props);
  }

  render(): JSX.Element {
    const parameters = this.props.parameters;
    return <>{parameters.map(p => ParameterControls.renderParameter(p))}</>;
  }

  private static renderParameter(parameter: SandboxParameter): JSX.Element {
    if (!isSupported(parameter)) {
      return <>
        <label>{parameter.label || parameter.name}</label>
        <div className="unsupported">TODO</div>
      </>;
    }

    switch (parameter.type) {
      case 'number':
        return <NumberParameterControl parameter={parameter}/>;
      case 'range':
        return <RangeParameterControl parameter={parameter}/>;
      case 'string':
        return <StringParameterControl parameter={parameter}/>;
      case 'boolean':
        return <BooleanParameterControl parameter={parameter}/>;
      case 'choices':
        return <ChoiceParameterControl parameter={parameter}/>;
    }
  }
}
