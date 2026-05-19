import { useEffect, useState } from "react";

interface Subscribable<T> {
  getState(): T;
  subscribe(listener: (state: T) => void): () => void;
}

export function useStore<T>(store: Subscribable<T>): T {
  const [state, setState] = useState<T>(store.getState());

  useEffect(() => {
    const unsubscribe = store.subscribe((next: T) => setState(next));
    return unsubscribe;
  }, [store]);

  return state;
}
