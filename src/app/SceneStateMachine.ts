export const AppState = {
  Boot: 'Boot',
  TitleMenu: 'TitleMenu',
  LoadingLevel: 'LoadingLevel',
  LevelIntro: 'LevelIntro',
  Exploration: 'Exploration',
  Chase: 'Chase',
  LevelComplete: 'LevelComplete',
  GameOver: 'GameOver',
  Pause: 'Pause',
  Finale: 'Finale',
  Victory: 'Victory',
} as const;
export type AppState = (typeof AppState)[keyof typeof AppState];

export class SceneStateMachine {
  private _state: AppState = AppState.Boot;

  get state(): AppState {
    return this._state;
  }

  setState(newState: AppState): void {
    console.log(`[StateMachine] ${this._state} → ${newState}`);
    this._state = newState;
  }
}