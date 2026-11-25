// Keeps derived token arrays referentially stable so token inputs don't re-run on every change detection.
export class TokenMemo {
  private cache: {[id: string]: {key: string; value: string[]}} = {};

  get(id: string, key: string, build: () => string[]): string[] {
    const hit = this.cache[id];
    if (hit && hit.key === key) {
      return hit.value;
    }
    const value = build();
    this.cache[id] = {key, value};
    return value;
  }
}
