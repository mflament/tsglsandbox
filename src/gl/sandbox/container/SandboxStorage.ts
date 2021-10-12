import { GLSandbox } from '../GLSandbox';

export interface StoredState {
  selectedSandbox: string;
  showOverlay: boolean;
  showControls: boolean;
}

export class SandboxStorage {
  private readonly storage = localStorage();

  get state(): StoredState | undefined {
    if (!this.storage) return undefined;
    const json = this.storage.getItem(STATE_KEY);
    return json ? JSON.parse(json) : undefined;
  }

  set state(state: StoredState | undefined) {
    if (!this.storage) return;
    if (!state) this.storage.removeItem(STATE_KEY);
    this.storage.setItem(STATE_KEY, JSON.stringify(state));
  }

  getSandboxParameters<P = unknown>(sandboxName: string): P | undefined {
    if (!this.storage) return undefined;
    const json = this.storage.getItem(parametersKey(sandboxName));
    return json ? JSON.parse(json) : undefined;
  }

  setSandboxParameters(sandbox: GLSandbox): void {
    if (!this.storage) return;
    this.storage.setItem(parametersKey(sandbox.name), JSON.stringify(sandbox.parameters));
  }
}

const STATE_KEY = 'glsandbox';

function parametersKey(sandboxName: string): string {
  return STATE_KEY + '.' + sandboxName;
}

function localStorage(): Storage | null {
  try {
    return self.localStorage;
  } catch (e) {
    return null;
  }
}
