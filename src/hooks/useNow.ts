import { useEffect, useState } from 'react';

/** Current time in ms, re-rendering every `intervalMs` (paused by the browser in background tabs). */
export function useNow(intervalMs: number): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), intervalMs);
        const onVisible = () => document.visibilityState === 'visible' && setNow(Date.now());
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [intervalMs]);
    return now;
}
