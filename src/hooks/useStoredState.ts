import { useCallback, useState } from 'react';
import { readStored, writeStored } from '../lib/storage';

/** useState that is initialised from, and written back to, localStorage. */
export function useStoredState<T>(
    key: string,
    fallback: T,
    validate: (v: unknown) => v is T
): [T, (next: T | ((prev: T) => T)) => void] {
    const [value, setValue] = useState<T>(() => readStored(key, fallback, validate));

    const set = useCallback(
        (next: T | ((prev: T) => T)) => {
            setValue(prev => {
                const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
                writeStored(key, resolved);
                return resolved;
            });
        },
        [key]
    );

    return [value, set];
}
