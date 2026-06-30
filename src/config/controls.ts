export const ControlAction = {
  MoveForward: 'MoveForward',
  MoveBackward: 'MoveBackward',
  StrafeLeft: 'StrafeLeft',
  StrafeRight: 'StrafeRight',
  Sprint: 'Sprint',
  Jump: 'Jump',
  Slide: 'Slide',
  Interact: 'Interact',
  Pause: 'Pause',
  Restart: 'Restart',
} as const;
export type ControlAction = (typeof ControlAction)[keyof typeof ControlAction];

export const DEFAULT_KEYBOARD_MAP: Record<string, ControlAction> = {
  KeyW: ControlAction.MoveForward,
  KeyS: ControlAction.MoveBackward,
  KeyA: ControlAction.StrafeLeft,
  KeyD: ControlAction.StrafeRight,
  ShiftLeft: ControlAction.Sprint,
  ShiftRight: ControlAction.Sprint,
  Space: ControlAction.Jump,
  ControlLeft: ControlAction.Slide,
  KeyC: ControlAction.Slide,
  KeyE: ControlAction.Interact,
  Escape: ControlAction.Pause,
  KeyR: ControlAction.Restart,
};