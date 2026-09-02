export type VideoLibraryItemDB = {
    title: string;
    type: 'Vídeo' | 'PDF';
    length: string;
    phase: number;
    url: string;
};

export type VideoLibraryCategoryDB = {
    _id: string;
    category: string;
    icon: string;
    tone: 'gold' | 'primary' | 'purple';
    items: VideoLibraryItemDB[];
};

export type VideoLibraryItem = {
    title: string;
    type: 'Vídeo' | 'PDF';
    length: string;
    phase: number;
    url: string;
};

export type VideoLibraryCategory = {
    uuid: string;
    category: string;
    icon: string;
    tone: 'gold' | 'primary' | 'purple';
    items: VideoLibraryItem[];
};

export function toVideoLibraryCategory(category: VideoLibraryCategoryDB): VideoLibraryCategory {
    return {
        uuid: category._id,
        category: category.category,
        icon: category.icon,
        tone: category.tone,
        items: category.items.map(toVideoLibraryItem),
    };
}

export function toVideoLibraryItem(item: VideoLibraryItemDB): VideoLibraryItem {
    return {
        title: item.title,
        type: item.type,
        length: item.length,
        phase: item.phase,
        url: item.url,
    };
}

export type VideoLibraryTone = VideoLibraryCategory['tone'];
export type VideoLibraryKind = VideoLibraryItem['type'];

export const VIDEO_LIBRARY_TONES: { key: VideoLibraryTone; label: string }[] = [
    { key: 'gold', label: 'Oro' },
    { key: 'primary', label: 'Azul' },
    { key: 'purple', label: 'Violeta' },
];

export const VIDEO_LIBRARY_ICONS = [
    { key: 'play-outline', glyph: '▶', label: 'Play' },
    { key: 'document-text-outline', glyph: '☰', label: 'Documento' },
    { key: 'barbell-outline', glyph: '╋', label: 'Fuerza' },
    { key: 'nutrition-outline', glyph: '◉', label: 'Nutrición' },
    { key: 'flame-outline', glyph: '✦', label: 'Hábito' },
    { key: 'moon-outline', glyph: '☾', label: 'Descanso' },
    { key: 'heart-outline', glyph: '♡', label: 'Bienestar' },
    { key: 'bulb-outline', glyph: '✧', label: 'Mindset' },
] as const;

export function libraryIconGlyph(icon: string): string {
    return VIDEO_LIBRARY_ICONS.find((item) => item.key === icon)?.glyph ?? '▶';
}

export function toVideoLibraryPayload(
    category: VideoLibraryCategory,
): Omit<VideoLibraryCategoryDB, '_id'> {
    return {
        category: category.category,
        icon: category.icon,
        tone: category.tone,
        items: category.items.map((item) => ({ ...item })),
    };
}

export function youtubeVideoId(url: string): string | null {
    const match = url.match(
        /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
    );
    return match?.[1] ?? null;
}

export function videoLibraryPoster(item: VideoLibraryItem): string | null {
    if (item.type === 'PDF') return null;
    const id = youtubeVideoId(item.url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}