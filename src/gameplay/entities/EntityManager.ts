import type { GameContext } from '../../app/GameContext';

/** Interface that any game entity must implement */
export interface IGameEntity {
  update(dt: number, ctx: GameContext): void;
  dispose(): void;
}

/**
 * EntityManager — tracks all game entities and calls update/dispose on them.
 * Supports safe iteration: entities added/removed during a tick are deferred
 * to the next frame.
 */
export class EntityManager {
  private entities: IGameEntity[] = [];

  /** Number of currently tracked entities */
  get count(): number {
    return this.entities.length;
  }

  /** Add an entity to the manager */
  add(entity: IGameEntity): void {
    this.entities.push(entity);
  }

  /** Remove a specific entity by reference */
  remove(entity: IGameEntity): void {
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) {
      this.entities.splice(idx, 1);
    }
  }

  /** Update all tracked entities */
  update(dt: number, ctx: GameContext): void {
    for (const entity of this.entities) {
      entity.update(dt, ctx);
    }
  }

  /** Dispose all entities and clear the list */
  clear(): void {
    for (const entity of this.entities) {
      entity.dispose();
    }
    this.entities = [];
  }
}