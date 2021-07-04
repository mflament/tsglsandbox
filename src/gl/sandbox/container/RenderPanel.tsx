import React, { Component, ReactNode, RefObject } from 'react';

interface RenderPanelProps {
  onResize(width: number, height: number): void;
}

export class RenderPanel extends Component<RenderPanelProps> {
  private readonly renderPanelRef: RefObject<HTMLDivElement>;
  private readonly resizeObserver: ResizeObserver;

  constructor(props: RenderPanelProps) {
    super(props);
    this.renderPanelRef = React.createRef();
    this.resizeObserver = new ResizeObserver(entries => this.onResize(entries));
  }

  render(): ReactNode {
    return (
      <div className="render-panel" ref={this.renderPanelRef}>
        {this.props.children}
      </div>
    );
  }

  componentDidMount(): void {
    const renderPanel = this.renderPanelRef.current;
    if (!renderPanel) throw new Error('renderPanel component not set');
    this.resizeObserver.observe(renderPanel);
    this.props.onResize(renderPanel.clientWidth, renderPanel.clientHeight);
  }

  componentWillUnmount(): void {
    const renderPanel = this.renderPanelRef.current;
    if (renderPanel) this.resizeObserver.unobserve(renderPanel);
  }

  private onResize(entries: ResizeObserverEntry[]): void {
    const rect = entries[0].contentRect;
    this.props.onResize(rect.width, rect.height);
  }
}

// export class CanvasOverlay extends Component<RenderPanelProps> {
// }
