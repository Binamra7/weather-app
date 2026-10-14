import type { SVGProps } from 'react';

/** Small stroke icons for UI chrome. Decorative by default; label the parent control instead. */
type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            {...props}
        >
            {children}
        </svg>
    );
}

export const SearchIcon = (p: IconProps) => (
    <Base {...p}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
    </Base>
);
export const LocateIcon = (p: IconProps) => (
    <Base {...p}>
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        <circle cx="12" cy="12" r="7.5" />
    </Base>
);
export const StarIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
    <Base {...p} fill={filled ? 'currentColor' : 'none'}>
        <path d="m12 3.5 2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z" />
    </Base>
);
export const RefreshIcon = (p: IconProps) => (
    <Base {...p}>
        <path d="M20 11a8 8 0 1 0-2.3 5.7" />
        <path d="M20 4v7h-7" />
    </Base>
);
export const CloseIcon = (p: IconProps) => (
    <Base {...p}>
        <path d="M6 6l12 12M18 6 6 18" />
    </Base>
);
export const AlertIcon = (p: IconProps) => (
    <Base {...p}>
        <path d="M12 4 2.5 20h19z" />
        <path d="M12 10v4.5M12 17.5v.01" />
    </Base>
);
export const HistoryIcon = (p: IconProps) => (
    <Base {...p}>
        <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5" />
        <path d="M3.5 4v4.5H8M12 8v4l2.5 1.5" />
    </Base>
);
export const PinIcon = (p: IconProps) => (
    <Base {...p}>
        <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15 12 21 12 21z" />
        <circle cx="12" cy="10" r="2.3" />
    </Base>
);
