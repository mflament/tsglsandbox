import React, { Component, ReactNode } from 'react';

interface CanvasOverlayProps {
  showOverlay: boolean;
  showControls: boolean;

  getFrames(): number;

  onShowControls: () => void;
}

export class CanvasOverlay extends Component<CanvasOverlayProps, { fps: number }> {
  private lastFramesCount = 0;
  private lastFrameTime = 0;
  private timerId = 0;

  constructor(props: CanvasOverlayProps) {
    super(props);
    this.state = { fps: 0 };
  }

  render(): ReactNode {
    return (
      <div className={this.className}>
        <div className="fps">{this.state.fps}</div>
        <div className="button toggle-controls" onClick={this.props.onShowControls}>
          <img src="images/arrow.png" alt="Toggle menu" />
        </div>
      </div>
    );
  }

  componentDidMount(): void {
    this.lastFrameTime = performance.now();
    this.lastFramesCount = this.props.getFrames();
    this.timerId = window.setInterval(() => this.updateFPS(), 1000);
  }

  componentWillUnmount(): void {
    if (this.timerId) window.clearTimeout(this.timerId);
  }

  private get className(): string {
    let res = 'canvas-overlay';
    if (!this.props.showOverlay) res += ' hidden';
    if (this.props.showControls) res += ' open';
    return res;
  }

  private updateFPS(): void {
    const now = performance.now();
    const elapsedSec = (this.lastFrameTime - now) / 1000;
    const totalFrames = this.props.getFrames();
    const frames = this.lastFramesCount - totalFrames;
    this.setState({ fps: Math.round(frames / elapsedSec) });
    this.lastFrameTime = now;
    this.lastFramesCount = totalFrames;
  }
}
