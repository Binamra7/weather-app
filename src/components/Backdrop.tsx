import { memo } from 'react';
import type { SkyTheme } from '../lib/conditions';
import './Backdrop.css';

/**
 * The poster's printed weather layer, fixed behind the whole page. The field colour itself
 * comes from the `data-sky` tokens on <html>; this adds the flat, overprinted marks for the
 * condition (a sun or moon disc, cloud shapes, rain hatching, snow, fog bands, lightning).
 * Everything is drawn in tints of the current ink, so it can never fight the type.
 */
export const Backdrop = memo(function Backdrop({
    theme,
    intensity,
}: {
    theme: SkyTheme;
    intensity: 'light' | 'normal';
}) {
    return (
        <div className="backdrop" data-sky={theme} data-intensity={intensity} aria-hidden="true">
            <div className="backdrop__disc" />
            <div className="backdrop__stars" />
            <div className="backdrop__clouds">
                <span />
                <span />
            </div>
            <div className="backdrop__rain" />
            <div className="backdrop__snow" />
            <div className="backdrop__fog">
                <span />
                <span />
                <span />
            </div>
            <div className="backdrop__flash" />
        </div>
    );
});
