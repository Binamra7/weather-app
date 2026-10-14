import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { isAbortError, searchPlaces } from '../api/openWeather';
import { placeSubtitle } from '../lib/format';
import type { Place } from '../lib/types';
import { HistoryIcon, PinIcon, SearchIcon } from './Icons';
import './SearchBar.css';

interface Props {
    onSelectPlace: (place: Place) => void;
    onSubmitQuery: (query: string) => void;
    recents: Place[];
    busy: boolean;
}

const MIN_CHARS = 3;
const DEBOUNCE_MS = 350;
const suggestionCache = new Map<string, Place[]>();

/**
 * City search as an ARIA 1.2 combobox. Suggestions come from the free Geocoding API,
 * debounced and cached to stay well within rate limits. With an empty field, recent
 * places are offered instead. Enter submits the highlighted suggestion, or the raw text.
 */
export function SearchBar({ onSelectPlace, onSubmitQuery, recents, busy }: Props) {
    const [value, setValue] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [, setResultsVersion] = useState(0);
    const [pendingQuery, setPendingQuery] = useState<string | null>(null);
    const [hint, setHint] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listId = useId();
    const hintId = useId();

    const query = value.trim();
    const key = query.toLowerCase();
    const showingRecents = query.length === 0;
    const cached = suggestionCache.get(key);
    const options: Place[] = showingRecents ? recents.slice(0, 5) : (cached ?? []);
    const expanded = open && options.length > 0;
    const loading = !showingRecents && !cached && pendingQuery === key;

    useEffect(() => {
        if (key.length < MIN_CHARS || suggestionCache.has(key)) return;
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setPendingQuery(key);
            try {
                suggestionCache.set(key, await searchPlaces(key, controller.signal));
            } catch (e) {
                // Suggestions are a convenience; a failure here should not block searching.
                if (isAbortError(e)) return;
            } finally {
                setPendingQuery(q => (q === key ? null : q));
            }
            setResultsVersion(v => v + 1);
        }, DEBOUNCE_MS);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [key]);

    const choose = (place: Place) => {
        setValue('');
        setOpen(false);
        setActive(-1);
        setHint(null);
        inputRef.current?.blur();
        onSelectPlace(place);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (expanded && active >= 0 && options[active]) {
            choose(options[active]);
            return;
        }
        if (!query) {
            setHint('Type a city name to search.');
            inputRef.current?.focus();
            return;
        }
        if (query.length > 100) {
            setHint('That search is too long.');
            return;
        }
        setHint(null);
        setOpen(false);
        setActive(-1);
        setValue('');
        inputRef.current?.blur();
        onSubmitQuery(query.replace(/\s+/g, ' '));
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            if (options.length) setActive(i => (i + 1) % options.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (options.length) setActive(i => (i <= 0 ? options.length - 1 : i - 1));
        } else if (e.key === 'Escape') {
            if (expanded) {
                e.preventDefault();
                setOpen(false);
                setActive(-1);
            } else if (value) {
                setValue('');
            }
        }
    };

    return (
        <form className="search" role="search" onSubmit={submit}>
            <label htmlFor={`${listId}-input`} className="visually-hidden">
                Search for a city
            </label>
            <div className="search__row">
                <div className={`search__field ${expanded ? 'is-open' : ''}`}>
                    <SearchIcon className="search__icon" />
                    <input
                        ref={inputRef}
                        id={`${listId}-input`}
                        className="search__input"
                        type="text"
                        inputMode="search"
                        enterKeyHint="search"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="Search a city, e.g. Paris, FR"
                        role="combobox"
                        aria-expanded={expanded}
                        aria-controls={listId}
                        aria-autocomplete="list"
                        aria-activedescendant={expanded && active >= 0 ? `${listId}-opt-${active}` : undefined}
                        aria-describedby={hint ? hintId : undefined}
                        aria-invalid={hint ? true : undefined}
                        value={value}
                        maxLength={120}
                        onChange={e => {
                            setValue(e.target.value);
                            setOpen(true);
                            setActive(-1);
                            if (hint) setHint(null);
                        }}
                        onFocus={() => setOpen(true)}
                        onBlur={() => setOpen(false)}
                        onKeyDown={onKeyDown}
                    />
                    {loading && <span className="search__spinner" aria-hidden="true" />}
                </div>
                {/* Never disabled: that would also block Enter-to-search while a request is in flight. */}
                <button
                    className="btn btn--primary search__submit"
                    type="submit"
                    aria-label="Search"
                    data-busy={busy || undefined}
                >
                    Search
                </button>
            </div>

            <ul
                id={listId}
                role="listbox"
                aria-label={showingRecents ? 'Recent places' : 'Suggested places'}
                className="search__list"
                hidden={!expanded}
            >
                {showingRecents && (
                    <li className="search__group" role="presentation">
                        Recent
                    </li>
                )}
                {options.map((p, i) => (
                    <li
                        key={`${p.id}-${i}`}
                        id={`${listId}-opt-${i}`}
                        role="option"
                        aria-selected={i === active}
                        className="search__option"
                        // mousedown (not click) so selection happens before the input blurs.
                        onMouseDown={e => {
                            e.preventDefault();
                            choose(p);
                        }}
                        onMouseEnter={() => setActive(i)}
                    >
                        {showingRecents ? <HistoryIcon /> : <PinIcon />}
                        <span className="search__option-text">
                            <span className="search__option-name">{p.name}</span>
                            <span className="search__option-sub">{placeSubtitle(p)}</span>
                        </span>
                    </li>
                ))}
            </ul>

            {hint && (
                <p id={hintId} className="search__hint" role="alert">
                    {hint}
                </p>
            )}
        </form>
    );
}
