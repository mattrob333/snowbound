import { describe, it, expect } from 'vitest';
import { EntityManager } from '../gameplay/entities/EntityManager';
import type { GameContext } from '../app/GameContext';

class TestEntity {
  public updateCalls = 0;
  public disposed = false;
  public lastDt = 0;

  update(dt: number, _ctx: GameContext): void {
    this.updateCalls++;
    this.lastDt = dt;
  }

  dispose(): void {
    this.disposed = true;
  }
}

describe('EntityManager', () => {
  it('should start empty', () => {
    const em = new EntityManager();
    expect(em.count).toBe(0);
  });

  it('should add an entity and track count', () => {
    const em = new EntityManager();
    const e = new TestEntity();
    em.add(e);
    expect(em.count).toBe(1);
  });

  it('should call update on added entities', () => {
    const em = new EntityManager();
    const e = new TestEntity();
    em.add(e);

    em.update(0.016, {} as GameContext);

    expect(e.updateCalls).toBe(1);
    expect(e.lastDt).toBeCloseTo(0.016);
  });

  it('should call update on all entities', () => {
    const em = new EntityManager();
    const e1 = new TestEntity();
    const e2 = new TestEntity();
    em.add(e1);
    em.add(e2);

    em.update(0.016, {} as GameContext);

    expect(e1.updateCalls).toBe(1);
    expect(e2.updateCalls).toBe(1);
  });

  it('should remove an entity and no longer call update', () => {
    const em = new EntityManager();
    const e = new TestEntity();
    em.add(e);
    em.remove(e);

    em.update(0.016, {} as GameContext);

    expect(e.updateCalls).toBe(0);
    expect(em.count).toBe(0);
  });

  it('should remove an entity by reference', () => {
    const em = new EntityManager();
    const e1 = new TestEntity();
    const e2 = new TestEntity();
    em.add(e1);
    em.add(e2);
    em.remove(e1);

    expect(em.count).toBe(1);

    em.update(0.016, {} as GameContext);
    expect(e1.updateCalls).toBe(0);
    expect(e2.updateCalls).toBe(1);
  });

  it('should call dispose on all entities and clear on clear()', () => {
    const em = new EntityManager();
    const e1 = new TestEntity();
    const e2 = new TestEntity();
    em.add(e1);
    em.add(e2);

    em.clear();

    expect(e1.disposed).toBe(true);
    expect(e2.disposed).toBe(true);
    expect(em.count).toBe(0);
  });

  it('should handle remove during iteration safely', () => {
    const em = new EntityManager();
    const e1 = new TestEntity();
    const e2 = new TestEntity();
    const e3 = new TestEntity();
    em.add(e1);
    em.add(e2);
    em.add(e3);

    // Simulate e2 being removed mid-update
    em.remove(e2);

    em.update(0.016, {} as GameContext);

    expect(e1.updateCalls).toBe(1);
    expect(e2.updateCalls).toBe(0);
    expect(e3.updateCalls).toBe(1);
  });

  it('should accept entities of different types', () => {
    const em = new EntityManager();
    const e1 = new TestEntity();

    class AnotherEntity {
      updateCalls = 0;
      update(_dt: number, _ctx: GameContext): void { this.updateCalls++; }
      dispose(): void {}
    }
    const e2 = new AnotherEntity();

    em.add(e1);
    em.add(e2);
    expect(em.count).toBe(2);

    em.update(0.016, {} as GameContext);
    expect(e1.updateCalls).toBe(1);
    expect(e2.updateCalls).toBe(1);
  });
});