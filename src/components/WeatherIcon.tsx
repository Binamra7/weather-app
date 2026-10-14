import { useId, type ReactNode } from 'react';
import type { ConditionKind } from '../lib/types';
import './WeatherIcon.css';

interface Props {
    kind: ConditionKind;
    isDay: boolean;
    /** Accessible label. When omitted the icon is decorative (aria-hidden). */
    label?: string;
    size?: number | string;
    animated?: boolean;
    className?: string;
}

/** Base stroke weight on the 24-unit grid. Scaled groups compensate so every line matches. */
const SW = 1.75;

/** Cloud outline on the 24 grid: flat base at y=18, spanning x≈2.7–21. */
const CLOUD = 'M7 18h10.5a3.5 3.5 0 0 0 .3-6.99A5 5 0 0 0 8.1 9.6 4.3 4.3 0 0 0 7 18z';

/** Cloud raised to leave room for precipitation beneath it. */
const RAISED = 'translate(0 -3)';

/**
 * Line weather glyphs in the spirit of meteorological symbols: one stroke weight, drawn in
 * currentColor, no fills except tiny drizzle dots. Animations are CSS-only (transform/opacity),
 * run only when `animated` is true and stop under prefers-reduced-motion.
 */
export function WeatherIcon({ kind, isDay, label, size = 64, animated = true, className }: Props) {
    const maskId = `wi-${useId().replace(/:/g, '')}`;

    return (
        <svg
            className={['wi', animated ? 'wi--animated' : '', className].filter(Boolean).join(' ')}
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            strokeWidth={SW}
            strokeLinecap="round"
            strokeLinejoin="round"
            role={label ? 'img' : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            focusable="false"
        >
            <Glyph kind={kind} isDay={isDay} maskId={maskId} />
        </svg>
    );
}

function Glyph({ kind, isDay, maskId }: { kind: ConditionKind; isDay: boolean; maskId: string }) {
    switch (kind) {
        case 'clear':
            return isDay ? <Sun cx={12} cy={12} r={4} /> : <Moon />;
        case 'partly-cloudy':
            return (
                <>
                    <CloudMask id={maskId} transform="translate(1.5 2)" />
                    <g mask={`url(#${maskId})`}>
                        {isDay ? (
                            <Sun cx={8.5} cy={8} r={2.75} small />
                        ) : (
                            <Moon transform="translate(1 0.5) scale(0.55)" scale={0.55} />
                        )}
                    </g>
                    <Cloud transform="translate(1.5 2)" />
                </>
            );
        case 'cloudy':
            return <Cloud transform="translate(0 0.5)" />;
        case 'overcast':
            return (
                <>
                    <CloudMask id={maskId} transform="translate(-1 2)" />
                    <g mask={`url(#${maskId})`}>
                        <Cloud transform="translate(6 -0.5) scale(0.75)" scale={0.75} back />
                    </g>
                    <Cloud transform="translate(-1 2)" />
                </>
            );
        case 'drizzle':
            return (
                <>
                    <Cloud transform={RAISED} />
                    <g fill="currentColor" stroke="none">
                        {[
                            [8.5, 18.5],
                            [12, 20.5],
                            [15.5, 18.5],
                        ].map(([x, y], i) => (
                            <circle
                                key={i}
                                className="wi-drop"
                                style={{ animationDelay: `${i * 0.35}s` }}
                                cx={x}
                                cy={y}
                                r={1}
                            />
                        ))}
                    </g>
                </>
            );
        case 'rain':
            return (
                <>
                    <Cloud transform={RAISED} />
                    {[7.5, 10.5, 13.5, 16.5].map((x, i) => (
                        <Streak key={i} x={x} y={i % 2 ? 18.5 : 17.5} delay={i * 0.22} />
                    ))}
                </>
            );
        case 'thunderstorm':
            return (
                <>
                    <Cloud transform={RAISED} />
                    <Streak x={8} y={17.5} delay={0} />
                    <Streak x={17} y={17.5} delay={0.3} />
                    <path className="wi-bolt" d="M13.25 16.5 11.25 19.75h2.75l-2 3.25" />
                </>
            );
        case 'snow':
            return (
                <>
                    <Cloud transform={RAISED} />
                    <Flake x={8} y={19} delay={0} />
                    <Flake x={12} y={21.75} delay={0.8} />
                    <Flake x={16} y={19} delay={1.6} />
                </>
            );
        case 'sleet':
            return (
                <>
                    <Cloud transform={RAISED} />
                    <Streak x={8.5} y={17.5} delay={0} />
                    <Flake x={12.5} y={20.25} delay={0.5} />
                    <Streak x={17} y={17.5} delay={0.3} />
                </>
            );
        case 'fog':
            return (
                <g>
                    <line className="wi-band" x1="4" y1="8" x2="17" y2="8" />
                    <line className="wi-band wi-band--2" x1="7" y1="12" x2="20" y2="12" />
                    <line className="wi-band" x1="4" y1="16" x2="15" y2="16" />
                </g>
            );
        case 'haze':
            return (
                <>
                    {isDay ? (
                        <Sun cx={12} cy={8.5} r={3} small />
                    ) : (
                        <Moon transform="translate(4.8 1.5) scale(0.6)" scale={0.6} />
                    )}
                    <line className="wi-band" x1="4" y1="17" x2="17" y2="17" />
                    <line className="wi-band wi-band--2" x1="7" y1="20.5" x2="20" y2="20.5" />
                </>
            );
        case 'dust':
            return (
                <g>
                    {[8, 12.5, 17].map((y, i) => (
                        <path
                            key={y}
                            className={i === 1 ? 'wi-band wi-band--2' : 'wi-band'}
                            d={`M3 ${y}c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0`}
                        />
                    ))}
                </g>
            );
        case 'wind':
            return (
                <g>
                    <path className="wi-gust" d="M3 9h10a2.5 2.5 0 1 0-2.5-2.5" />
                    <path className="wi-gust wi-gust--2" d="M3 13h14.5a3 3 0 1 1-3 3" />
                    <path className="wi-gust" d="M3 17h6" />
                </g>
            );
    }
}

function Cloud({ transform, scale = 1, back = false }: { transform?: string; scale?: number; back?: boolean }) {
    return (
        <g transform={transform} strokeWidth={SW / scale}>
            <path className={back ? 'wi-cloud wi-cloud--back' : 'wi-cloud'} d={CLOUD} />
        </g>
    );
}

/** Hides whatever sits behind the front cloud (its silhouette plus a stroke-width gap). */
function CloudMask({ id, transform }: { id: string; transform?: string }) {
    return (
        <defs>
            <mask id={id} maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28">
                <rect x="-2" y="-2" width="28" height="28" fill="#fff" stroke="none" />
                <path d={CLOUD} transform={transform} fill="#000" stroke="#000" strokeWidth={SW * 2.4} />
            </mask>
        </defs>
    );
}

function Sun({ cx, cy, r, small = false }: { cx: number; cy: number; r: number; small?: boolean }) {
    const r1 = r + (small ? 1.9 : 2.5);
    const r2 = r + (small ? 3.4 : 5);
    const rays: ReactNode[] = Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
            <line
                key={i}
                x1={round(cx + Math.cos(a) * r1)}
                y1={round(cy + Math.sin(a) * r1)}
                x2={round(cx + Math.cos(a) * r2)}
                y2={round(cy + Math.sin(a) * r2)}
            />
        );
    });
    return (
        <g>
            <g className="wi-rays" style={{ transformOrigin: `${cx}px ${cy}px` }}>
                {rays}
            </g>
            <circle cx={cx} cy={cy} r={r} />
        </g>
    );
}

function Moon({ transform, scale = 1 }: { transform?: string; scale?: number }) {
    return (
        <g transform={transform} strokeWidth={SW / scale}>
            <path className="wi-moon" d="M19.5 14.2A7.75 7.75 0 1 1 9.8 4.5a6.2 6.2 0 0 0 9.7 9.7z" />
        </g>
    );
}

function Streak({ x, y, delay }: { x: number; y: number; delay: number }) {
    return <line className="wi-drop" style={{ animationDelay: `${delay}s` }} x1={x} y1={y} x2={x - 1.25} y2={y + 3} />;
}

/** Six-armed asterisk, the plotted symbol for snow. */
function Flake({ x, y, delay }: { x: number; y: number; delay: number }) {
    const a = 1.4;
    const dx = round(a * Math.cos(Math.PI / 6));
    const dy = round(a * Math.sin(Math.PI / 6));
    return (
        <g className="wi-flake" style={{ animationDelay: `${delay}s` }} strokeWidth={SW * 0.85}>
            <line x1={x} y1={y - a} x2={x} y2={y + a} />
            <line x1={x - dx} y1={y - dy} x2={x + dx} y2={y + dy} />
            <line x1={x - dx} y1={y + dy} x2={x + dx} y2={y - dy} />
        </g>
    );
}

function round(n: number) {
    return Math.round(n * 100) / 100;
}
