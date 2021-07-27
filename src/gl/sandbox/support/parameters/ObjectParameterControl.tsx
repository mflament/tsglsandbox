import React, {Component} from 'react';
import {ObjectSandboxParameter} from '../../SandboxParameter';
import {ControlProps} from './AbstractParameterControl';
import {ParametersControls} from "./ParametersControls";

export class ObjectParameterControl extends Component<ControlProps<ObjectSandboxParameter>, { value: any }> {

  constructor(props: ControlProps<ObjectSandboxParameter>) {
    super(props);
  }

  render(): JSX.Element {
    const param = this.props.parameter;
    return <div className={param.type}>
      <h2>{param.label || param.name}</h2>
      <div className="parameters-table">
        <ParametersControls parameters={param.parameters}/>
      </div>
    </div>;
  }

}
