import { describe, expect, it } from 'vitest';
import {
    compassPoint,
    convertTemp,
    formatHour,
    formatPrecip,
    formatPressure,
    formatTemp,
    formatTime,
    formatUtcOffset,
    formatVisibility,
    formatWind,
    formatWeekday,
} from './format';

describe('temperature', () => {
    it('converts and rounds', () => {
        expect(convertTemp(100, 'imperial')).toBe(212);
        expect(formatTemp(18.41, 'metric')).toBe('18°');
        expect(formatTemp(18.41, 'imperial')).toBe('65°');
    });

    it('never renders negative zero', () => {
        expect(formatTemp(-0.3, 'metric')).toBe('0°');
    });
});

describe('units', () => {
    it('formats wind in km/h or mph', () => {
        expect(formatWind(10, 'metric')).toEqual({ value: '36', unit: 'km/h' });
        expect(formatWind(10, 'imperial')).toEqual({ value: '22', unit: 'mph' });
    });

    it('formats visibility, pressure and precipitation', () => {
        expect(formatVisibility(10000, 'metric')).toEqual({ value: '10', unit: 'km' });
        expect(formatVisibility(2500, 'metric')).toEqual({ value: '2.5', unit: 'km' });
        expect(formatVisibility(10000, 'imperial')).toEqual({ value: '6.2', unit: 'mi' });
        expect(formatPressure(1013, 'imperial')).toEqual({ value: '29.91', unit: 'inHg' });
        expect(formatPrecip(2.54, 'imperial')).toBe('0.10 in');
        expect(formatPrecip(0.25, 'metric')).toBe('0.3 mm');
    });

    it('maps degrees to compass points', () => {
        expect(compassPoint(0)).toBe('N');
        expect(compassPoint(221)).toBe('SW');
        expect(compassPoint(359)).toBe('N');
        expect(compassPoint(-90)).toBe('W');
    });
});

describe('location-local time', () => {
    // 2026-10-14T00:00:00Z
    const midnightUtc = 1791936000;

    it("uses the location's UTC offset, not the viewer's timezone", () => {
        expect(formatTime(midnightUtc, 0, '24h')).toBe('00:00');
        expect(formatTime(midnightUtc, 5 * 3600 + 45 * 60, '24h')).toBe('05:45'); // Kathmandu
        expect(formatTime(midnightUtc, -4 * 3600, '24h')).toBe('20:00'); // New York (EDT)
    });

    it('shifts the weekday across midnight', () => {
        expect(formatWeekday(midnightUtc, 0, 'long')).toBe('Wednesday');
        expect(formatWeekday(midnightUtc, -3600, 'long')).toBe('Tuesday');
    });

    it('supports 12-hour format', () => {
        expect(formatHour(midnightUtc, 15 * 3600, '12h')).toMatch(/^3\s?PM$/i);
    });

    it('formats UTC offsets', () => {
        expect(formatUtcOffset(20700)).toBe('UTC+5:45');
        expect(formatUtcOffset(-14400)).toBe('UTC−4');
        expect(formatUtcOffset(0)).toBe('UTC+0');
    });
});
