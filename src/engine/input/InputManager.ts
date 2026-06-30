import { ControlAction, DEFAULT_KEYBOARD_MAP } from '../../config/controls';

export class InputManager {
  private actionState = new Map<ControlAction, boolean>();
  private actionPressed = new Map<ControlAction, boolean>();
  private keyMap: Record<string, ControlAction>;
  private boundKeyDown: EventListenerOrEventListenerObject | null = null;
  private boundKeyUp: EventListenerOrEventListenerObject | null = null;

  constructor(keyMap?: Record<string, ControlAction>) {
    this.keyMap = keyMap ?? DEFAULT_KEYBOARD_MAP;
  }

  attach(element: EventTarget = window): void {
    this.boundKeyDown = (e: Event) => {
      const ke = e as KeyboardEvent;
      const action = this.keyMap[ke.code];
      if (action) {
        ke.preventDefault();
        if (!this.actionState.get(action)) {
          this.actionState.set(action, true);
          this.actionPressed.set(action, true);
        }
      }
    };
    this.boundKeyUp = (e: Event) => {
      const ke = e as KeyboardEvent;
      const action = this.keyMap[ke.code];
      if (action) {
        this.actionState.set(action, false);
      }
    };
    element.addEventListener('keydown', this.boundKeyDown);
    element.addEventListener('keyup', this.boundKeyUp);
  }

  detach(element: EventTarget = window): void {
    if (this.boundKeyDown) {
      element.removeEventListener('keydown', this.boundKeyDown);
    }
    if (this.boundKeyUp) {
      element.removeEventListener('keyup', this.boundKeyUp);
    }
    this.boundKeyDown = null;
    this.boundKeyUp = null;
  }

  update(): void {
    // Clear "pressed this frame" flags — they last one update cycle
    for (const action of this.actionPressed.keys()) {
      this.actionPressed.set(action, false);
    }
  }

  isKeyDown(action: ControlAction): boolean {
    return this.actionState.get(action) ?? false;
  }

  isKeyPressed(action: ControlAction): boolean {
    return this.actionPressed.get(action) ?? false;
  }

  /** Test helper — simulate an action being held/released */
  setAction(action: ControlAction, down: boolean): void {
    if (down && !this.actionState.get(action)) {
      this.actionPressed.set(action, true);
    }
    this.actionState.set(action, down);
  }
}
