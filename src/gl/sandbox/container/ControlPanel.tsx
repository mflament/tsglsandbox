import React, { Component } from 'react';

export class ControlPanel extends Component<
  { visible: boolean },
  { step: 'opening' | 'opened' | 'closing' | 'closed' }
> {
  constructor(props: { visible: boolean }) {
    super(props);
    this.state = { step: props.visible ? 'opened' : 'closed' };
    this.transitionEnd = this.transitionEnd.bind(this);
  }

  toggle(): void {
    this.setState(currentState => {
      const currentStep = currentState.step;
      const open = currentStep === 'closed' || currentStep === 'closing';
      return { step: open ? 'opening' : 'closing' };
    });
  }

  render(): JSX.Element {
    const className = 'control-panel ' + this.state.step;
    return (
      <div className={className} onTransitionEnd={this.transitionEnd}>
        <div className="control-panel-content">{this.props.children}</div>
      </div>
    );
  }

  private transitionEnd(): void {
    this.setState(currentState => {
      const currentStep = currentState.step;
      if (currentStep === 'closing') return { step: 'closed' };
      if (currentStep === 'opening') return { step: 'opened' };
      return currentState;
    });
  }
}
