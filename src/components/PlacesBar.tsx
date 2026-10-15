import { placeSubtitle } from '../lib/format';
import type { Place } from '../lib/types';
import { CloseIcon } from './Icons';
import './PlacesBar.css';

interface Props {
    favorites: Place[];
    recents: Place[];
    currentId: string | undefined;
    onSelect: (place: Place) => void;
    onRemoveFavorite: (place: Place) => void;
    onClearRecents: () => void;
}

function PlaceButton({
    place,
    currentId,
    onSelect,
}: {
    place: Place;
    currentId: string | undefined;
    onSelect: (p: Place) => void;
}) {
    const current = place.id === currentId;
    return (
        <button
            type="button"
            className={`places__place ${current ? 'is-current' : ''}`}
            onClick={() => onSelect(place)}
            aria-current={current ? 'location' : undefined}
            aria-label={[place.name, placeSubtitle(place)].filter(Boolean).join(', ')}
        >
            {place.name}
        </button>
    );
}

/**
 * Quick access to saved and recently viewed places, as a compact line of text links. With no
 * places it still holds one empty row, so clearing recents doesn't pull the page up.
 */
export function PlacesBar({ favorites, recents, currentId, onSelect, onRemoveFavorite, onClearRecents }: Props) {
    const favIds = new Set(favorites.map(f => f.id));
    const recentOnly = recents.filter(r => !favIds.has(r.id)).slice(0, 6);
    if (!favorites.length && !recentOnly.length) return <div className="places" aria-hidden="true" />;

    return (
        <nav className="places" aria-label="Saved and recent places">
            {favorites.length > 0 && (
                <div className="places__group">
                    <span className="places__label">Saved</span>
                    <ul className="places__list">
                        {favorites.map(p => (
                            <li key={p.id} className="places__item">
                                <PlaceButton place={p} currentId={currentId} onSelect={onSelect} />
                                <button
                                    type="button"
                                    className="places__remove"
                                    onClick={() => onRemoveFavorite(p)}
                                    aria-label={`Remove ${p.name} from favorites`}
                                    title="Remove from favorites"
                                >
                                    <CloseIcon />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {recentOnly.length > 0 && (
                <div className="places__group">
                    <span className="places__label">Recent</span>
                    <ul className="places__list">
                        {recentOnly.map(p => (
                            <li key={p.id} className="places__item">
                                <PlaceButton place={p} currentId={currentId} onSelect={onSelect} />
                            </li>
                        ))}
                    </ul>
                    <button
                        type="button"
                        className="link-btn places__clear"
                        onClick={onClearRecents}
                        aria-label="Clear recent places"
                    >
                        Clear
                    </button>
                </div>
            )}
        </nav>
    );
}
