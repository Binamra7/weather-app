import { capitalize, formatTemp, formatWeekday } from '../lib/format';
import { localDateKey } from '../lib/normalize';
import type { DailyForecast as Day, Forecast, Units } from '../lib/types';
import { WeatherIcon } from './WeatherIcon';
import './Forecast.css';
import { rampColor } from '../lib/tempColor';

interface Props {
    forecast: Forecast;
    units: Units;
    /** Today's full range (includes the current reading), used for the first row. */
    todayRange: { min: number; max: number } | null;
    nowSec: number;
}

export function DailyForecast({ forecast, units, todayRange, nowSec }: Props) {
    const today = localDateKey(nowSec, forecast.timezone);
    const days: Day[] = forecast.daily.map(d =>
        d.date === today && todayRange ? { ...d, min: todayRange.min, max: todayRange.max } : d
    );
    // One scale shared by every row, so bars compare across days.
    const lo = Math.min(...days.map(d => d.min));
    const hi = Math.max(...days.map(d => d.max));
    const span = hi - lo || 1;

    return (
        <section className="section daily" aria-labelledby="daily-title">
            <h2 id="daily-title" className="section__title">
                {days.length}-day forecast
            </h2>
            <table className="daily__table">
                <thead className="visually-hidden">
                    <tr>
                        <th scope="col">Day</th>
                        <th scope="col">Conditions</th>
                        <th scope="col">Chance of precipitation</th>
                        <th scope="col">Low</th>
                        <th scope="col">Range</th>
                        <th scope="col">High</th>
                    </tr>
                </thead>
                <tbody>
                    {days.map(d => {
                        const isToday = d.date === today;
                        const left = ((d.min - lo) / span) * 100;
                        const width = Math.max(((d.max - d.min) / span) * 100, 2);
                        const pop = Math.round(d.pop * 100);
                        return (
                            <tr key={d.date} className="daily__row">
                                <th scope="row" className="daily__day">
                                    {isToday ? 'Today' : formatWeekday(d.dt, forecast.timezone)}
                                </th>
                                <td className="daily__cond">
                                    <WeatherIcon
                                        kind={d.condition.kind}
                                        isDay
                                        label={capitalize(d.condition.description)}
                                        size={28}
                                        animated={false}
                                    />
                                </td>
                                <td className="daily__pop">{pop >= 10 ? `${pop}%` : ''}</td>
                                <td className="daily__lo">{formatTemp(d.min, units)}</td>
                                <td className="daily__range">
                                    <span className="daily__track" aria-hidden="true">
                                        <span
                                            className="daily__fill"
                                            style={{
                                                left: `${left}%`,
                                                width: `${width}%`,
                                                background: `linear-gradient(90deg, ${rampColor(d.min)}, ${rampColor(d.max)})`,
                                            }}
                                        />
                                    </span>
                                </td>
                                <td className="daily__hi">{formatTemp(d.max, units)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <p className="footnote">
                Built from OpenWeather’s free 5-day / 3-hour forecast; the last day may be partial.
            </p>
        </section>
    );
}
