import React from 'react';
import { VectorSandboxParameter } from '../../SandboxParameter';
import { AbstractParameterControl, ControlProps } from './AbstractParameterControl';
import { ParametersControls } from './ParametersControls';

export class VectorParameterControl extends AbstractParameterControl<VectorSandboxParameter> {
  constructor(props: ControlProps<VectorSandboxParameter>) {
    super(props);
  }

  render(): JSX.Element {
    const param = this.props.parameter;
    return <>{param.dimensions.map(dim => ParametersControls.renderParameter(dim))}</>;
  }

  protected renderInput(): JSX.Element {
    return <></>;
  }
}
