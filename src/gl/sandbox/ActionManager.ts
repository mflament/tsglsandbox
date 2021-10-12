export interface SandboxInputHandler {
  onmousedown?: (event: MouseEvent) => any;
  onmouseup?: (event: MouseEvent) => any;
  onmousemove?: (event: MouseEvent) => any;

  onmouseenter?: (event: MouseEvent) => any;
  onmouseleave?: (event: MouseEvent) => any;

  ontouchstart?: (event: TouchEvent) => any;
  ontouchend?: (event: TouchEvent) => any;
  ontouchmove?: (event: TouchEvent) => any;

  onwheel?: (event: WheelEvent) => any;

  onkeydown?: (event: KeyboardEvent) => any;
  onkeyup?: (event: KeyboardEvent) => any;
}

export interface ActionsRegistry extends SandboxInputHandler {
  register(action: Action): boolean;
  unregister(action: Action): boolean;
}

export interface ActionHandler extends SandboxInputHandler {
  name: string;
}

export interface Action {
  id: string;
  name?: string;
  description?: string;
  eventHandler: ActionHandler;
}

export class DefaultActionRegistry implements ActionsRegistry {
  private readonly _action: Action[] = [];

  register(action: Action): boolean {
    if (this.indexOf(action) < 0) {
      this._action.push(action);
      return true;
    }
    return false;
  }

  unregister(action: Action): boolean {
    const index = this.indexOf(action);
    if (index >= 0) {
      this._action.splice(index, 1);
      return true;
    }
    return false;
  }

  onmousedown(event: MouseEvent): any {
    this._action.forEach(a => a.eventHandler.onmousedown && a.eventHandler.onmousedown(event));
  }
  onmouseup(event: MouseEvent): any {
    this._action.forEach(a => a.eventHandler.onmouseup && a.eventHandler.onmouseup(event));
  }
  onmousemove(event: MouseEvent): any {
    this._action.forEach(a => a.eventHandler.onmousemove && a.eventHandler.onmousemove(event));
  }

  onmouseenter(event: MouseEvent): any {
    this._action.forEach(a => a.eventHandler.onmouseenter && a.eventHandler.onmouseenter(event));
  }
  onmouseleave(event: MouseEvent): any {
    this._action.forEach(a => a.eventHandler.onmouseleave && a.eventHandler.onmouseleave(event));
  }

  ontouchstart(event: TouchEvent): any {
    this._action.forEach(a => a.eventHandler.ontouchstart && a.eventHandler.ontouchstart(event));
  }
  ontouchend(event: TouchEvent): any {
    this._action.forEach(a => a.eventHandler.ontouchend && a.eventHandler.ontouchend(event));
  }
  ontouchmove(event: TouchEvent): any {
    this._action.forEach(a => a.eventHandler.ontouchmove && a.eventHandler.ontouchmove(event));
  }

  onwheel(event: WheelEvent): any {
    this._action.forEach(a => a.eventHandler.onwheel && a.eventHandler.onwheel(event));
  }

  onkeydown(event: KeyboardEvent): any {
    this._action.forEach(a => a.eventHandler.onkeydown && a.eventHandler.onkeydown(event));
  }
  onkeyup(event: KeyboardEvent): any {
    this._action.forEach(a => a.eventHandler.onkeyup && a.eventHandler.onkeyup(event));
  }

  private indexOf(action: Action): number {
    return this._action.indexOf(action);
  }
}
