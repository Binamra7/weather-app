/** Temperature ramp anchors (°C) → design-token names (see DESIGN.md). */
const RAMP: Array<[number, string]> = [
    [-10, '--t-m10'],
    [0, '--t-0'],
    [10, '--t-10'],
    [18, '--t-18'],
    [25, '--t-25'],
    [32, '--t-32'],
    [38, '--t-38'],
];

/** CSS colour for a temperature in °C, mixed in oklab between the neighbouring ramp tokens. */
export function rampColor(c: number): string {
    const first = RAMP[0]!;
    const last = RAMP[RAMP.length - 1]!;
    if (c <= first[0]) return `var(${first[1]})`;
    if (c >= last[0]) return `var(${last[1]})`;
    for (let i = 1; i < RAMP.length; i++) {
        const [t1, v1] = RAMP[i]!;
        const [t0, v0] = RAMP[i - 1]!;
        if (c <= t1) {
            const k = Math.round(((c - t0) / (t1 - t0)) * 100);
            return `color-mix(in oklab, var(${v1}) ${k}%, var(${v0}))`;
        }
    }
    return `var(${last[1]})`;
}
