import { useCallback, useState } from 'react';

/**
 * Content-box width of an element, kept current with a ResizeObserver. Returns a callback ref
 * and the width in whole pixels (0 until measured, and in environments without layout).
 */
export function useElementWidth<T extends HTMLElement>(): [(el: T | null) => (() => void) | undefined, number] {
    const [width, setWidth] = useState(0);
    const ref = useCallback((el: T | null) => {
        if (!el) return undefined;
        const set = (w: number) => setWidth(Math.round(w));
        set(el.clientWidth);
        if (typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver(entries => {
            const w = entries[0]?.contentRect.width;
            if (w != null) set(w);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return [ref, width];
}
