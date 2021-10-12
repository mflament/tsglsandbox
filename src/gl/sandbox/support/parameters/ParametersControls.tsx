import React, { Component } from 'react';
import { ObjectSandboxParameter, SandboxParameter } from '../../SandboxParameter';
import { NumberParameterControl } from './NumberParameterControl';
import { RangeParameterControl } from './RangeParameterControl';
import { StringParameterControl } from './StringParameterControl';
import { BooleanParameterControl } from './BooleanParameterControl';
import { ChoiceParameterControl } from './ChoiceParameterControl';
import { ColorParameterControl } from './ColorParameterControl';
import { JSONParameterControl } from './JSONParameterControl';
import { ControlProps } from './AbstractParameterControl';
import { VectorParameterControl } from './VectorParameterControl';

interface ParameterControlsProps {
  parameters: SandboxParameter[];
}

export class ParametersControls extends Component<ParameterControlsProps> {
  constructor(props: ParameterControlsProps) {
    super(props);
  }

  render(): JSX.Element {
    const parameters = this.props.parameters;
    return <>{parameters.map(p => ParametersControls.renderParameter(p))}</>;
  }

  static renderParameter(parameter: SandboxParameter): JSX.Element {
    if (!parameter.visible) return <></>;

    switch (parameter.type) {
      case 'number':
        if (parameter.isRangeParameter()) return <RangeParameterControl parameter={parameter} />;
        return <NumberParameterControl parameter={parameter} />;
      case 'string':
        return <StringParameterControl parameter={parameter} />;
      case 'boolean':
        return <BooleanParameterControl parameter={parameter} />;
      case 'choices':
        return <ChoiceParameterControl parameter={parameter} />;
      case 'object':
        return <ObjectParameterControl parameter={parameter} />;
      case 'color':
        return <ColorParameterControl parameter={parameter} />;
      case 'vector':
        return <VectorParameterControl parameter={parameter} />;
      case 'json':
        return <JSONParameterControl parameter={parameter} />;
      default:
        return ParametersControls.unsupportedParameter(parameter);
    }
  }

  private static unsupportedParameter(parameter: SandboxParameter): JSX.Element {
    return (
      <>
        <label>{parameter.label || parameter.name}</label>
        <div className="unsupported">TODO</div>
      </>
    );
  }
}

export class ObjectParameterControl extends Component<ControlProps<ObjectSandboxParameter>, { value: any }> {
  constructor(props: ControlProps<ObjectSandboxParameter>) {
    super(props);
  }

  render(): JSX.Element {
    const param = this.props.parameter;
    const headingClass = param.label ? '' : 'capitalized';
    return (
      <div className={param.type}>
        <h2 className={headingClass}>{param.label || param.name}</h2>
        <div className="parameters-table">
          <ParametersControls parameters={param.parameters} />
        </div>
      </div>
    );
  }
}
