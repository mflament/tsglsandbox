import React, { Component, ReactNode } from 'react';
import { GLSandbox } from '../GLSandbox';

interface SelectProps {
  sandboxes: string[];
  selectedName: string;
  sandbox?: GLSandbox;
  onChange(name: string): void;
}

export class SandboxSelect extends Component<SelectProps> {
  constructor(props: SelectProps) {
    super(props);
  }

  render(): ReactNode {
    const props = this.props;
    const sandbox = this.props.sandbox;
    const selectedName = this.props.selectedName;
    const loading = sandbox?.name !== this.props.selectedName;
    const options = props.sandboxes.map(n => <option selected={n === selectedName}>{n}</option>);
    return (
      <select className="select-sandbox" onChange={e => this.props.onChange(e.target.value)} disabled={loading}>
        {options}
      </select>
    );
  }
}
