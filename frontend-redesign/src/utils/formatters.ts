export function formatKES(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return 'KES —';
  return `KES ${Math.round(val).toLocaleString('en-KE')}`;
}

export function formatUSD(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '$—';
  return `$${Math.round(val).toLocaleString('en-US')}`;
}

export function formatCompactKES(val: number): string {
  if (!val) return 'KES 0';
  if (val >= 1_000_000) {
    return `KES ${(val / 1_000_000).toFixed(2)}M`;
  }
  if (val >= 1_000) {
    return `KES ${(val / 1_000).toFixed(0)}k`;
  }
  return `KES ${val.toLocaleString()}`;
}

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toLocaleString();
}

export function formatKm(val: number | null | undefined): string {
  if (!val) return '— km';
  return `${val.toLocaleString()} km`;
}

export function formatCC(val: number | null | undefined): string {
  if (!val) return '— cc';
  return `${val.toLocaleString()} cc`;
}

export function getSourceBadgeInfo(source: string) {
  switch (source?.toLowerCase()) {
    case 'beforward':
      return {
        label: 'BeForward Japan',
        shortLabel: 'BeForward',
        bg: 'bg-stone-100 text-stone-800 border-stone-300/80',
        dotBg: 'bg-emerald-600',
        country: 'Japan Import',
      };
    case 'sbt':
      return {
        label: 'SBT Japan',
        shortLabel: 'SBT Japan',
        bg: 'bg-stone-100 text-stone-800 border-stone-300/80',
        dotBg: 'bg-blue-600',
        country: 'Japan Import',
      };
    case 'peachcars':
      return {
        label: 'Peach Cars Kenya',
        shortLabel: 'Kenyan Dealer',
        bg: 'bg-amber-50 text-amber-900 border-amber-200',
        dotBg: 'bg-amber-600',
        country: 'Local Showroom',
      };
    default:
      return {
        label: source || 'Import',
        shortLabel: source || 'Import',
        bg: 'bg-stone-100 text-stone-700 border-stone-200',
        dotBg: 'bg-stone-500',
        country: 'Direct',
      };
  }
}

// export function parseListingImages(images: any): string[] {
//   const fallback = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
//   if (!images) return [fallback];

//   const normalizeUrl = (url: string): string => {
//     const trimmed = url.trim();
//     if (trimmed.startsWith('//')) {
//       return `https:${trimmed}`;
//     }
//     return trimmed;
//   };

//   if (Array.isArray(images)) {
//     const valid = images
//       .filter((img) => typeof img === 'string' && img.trim().length > 0)
//       .map(normalizeUrl);
//     return valid.length > 0 ? valid : [fallback];
//   }
//   if (typeof images === 'string') {
//     try {
//       const parsed = JSON.parse(images);
//       if (Array.isArray(parsed)) {
//         const valid = parsed
//           .filter((img) => typeof img === 'string' && img.trim().length > 0)
//           .map(normalizeUrl);
//         return valid.length > 0 ? valid : [fallback];
//       }
//     } catch {
//       if (images.startsWith('http') || images.startsWith('//')) return [normalizeUrl(images)];
//     }
//   }
//   return [fallback];
// }
export const CAR_PLACEHOLDER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" fill="%23f8fafc"><rect width="400" height="250" fill="%23f1f5f9"/><path d="M100 155h200c8 0 15-6 17-14l12-44c2-8-4-16-12-16H83c-8 0-14 8-12 16l12 44c2 8 9 14 17 14z" fill="%23cbd5e1"/><circle cx="135" cy="158" r="20" fill="%2394a3b8"/><circle cx="265" cy="158" r="20" fill="%2394a3b8"/><path d="M125 118l22-26h106l22 26z" fill="%2394a3b8" opacity="0.6"/><text x="50%" y="210" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="%2364748b">Actual Vehicle Photo</text></svg>`;

export function parseListingImages(images: any): string[] {
  if (!images) return [];

  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    return trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
  };

  if (Array.isArray(images)) {
    return images.filter((img: any) => typeof img === 'string' && img.trim().length > 0)
                 .map(normalizeUrl)
                 .slice(0, 8);
  }
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed)
        ? parsed.filter((img: any) => typeof img === 'string' && img.trim().length > 0)
                .map(normalizeUrl)
                .slice(0, 8)
        : [];
    } catch {
      if (images.startsWith('http') || images.startsWith('//')) return [normalizeUrl(images)];
    }
  }
  return [];
}
