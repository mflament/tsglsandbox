import React, { Component } from 'react';
import { SandboxSelect } from './SandboxSelect';
import { SandboxController } from './SandboxController';

export class SandboxHeader extends Component<{ controller: SandboxController }> {
  constructor(props: { controller: SandboxController }) {
    super(props);
  }

  render(): JSX.Element {
    const controller = this.props.controller;
    const sandbox = this.props.controller.sandbox;
    if (!sandbox) return <></>;
    const titleClass = sandbox.displayName ? '' : 'capitalized';
    return (
      <div className="sandbox-title">
        <SandboxSelect
          sandboxes={controller.sandboxNames}
          sandbox={sandbox}
          selectedName={controller.selectedSandbox}
          onChange={n => controller.selectSandbox(n)}
        />
        <span className={titleClass}>{sandbox.displayName || sandbox.name}</span>
        <img src="images/reset.png" title="Reset parameters" onClick={() => this.resetParameters()} alt="Reset" />
        <img src="images/share.png" title="Share this sandbox" onClick={() => this.shareSandbox()} alt="Share" />
      </div>
    );
  }

  private resetParameters(): void {
    const sandbox = this.props.controller.sandbox;
    sandbox?.resetParameters();
  }

  private shareSandbox(): void {
    const sandbox = this.props.controller.sandbox;
    if (sandbox) {
      const json = JSON.stringify(sandbox.parameters);
      console.log('initial json ' + json);
    }
  }
}
