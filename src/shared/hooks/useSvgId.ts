import { useRef } from 'react';

let _counter = 0;

export function useSvgId(prefix = 'svg'): string {
  const ref = useRef<string | null>(null);
  if (ref.current === null) ref.current = `${prefix}-${++_counter}`;
  return ref.current;
}
