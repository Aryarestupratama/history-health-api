/**
 * Branding terpusat — SEKALA (Sejarah & Edukasi Kesehatan Alur Lintas Abad)
 * Referensi: Design.md §5
 *
 * Pakai konstanta ini di seluruh halaman alih-alih hardcode ulang nama
 * aplikasi / kode hex warna, supaya kalau ada perubahan branding di masa
 * depan cukup diubah di satu tempat.
 *
 * Untuk warna yang dipakai lewat className Tailwind, gunakan token CSS
 * variable di index.css (mis. `bg-success`, `text-info`, `bg-gamify`),
 * bukan `PALETTE.hex` di bawah. `PALETTE` disediakan untuk kasus yang
 * butuh nilai hex mentah (mis. style inline, chart, atau di luar Tailwind).
 */

export const APP_NAME = 'SEKALA';
export const APP_SHORT_INITIALS = 'SK';
export const APP_FULL_NAME = 'Sejarah & Edukasi Kesehatan Alur Lintas Abad';
export const ADMIN_PANEL_LABEL = `${APP_NAME} Admin`;

/** Palette final — Design.md §5.2 */
export const PALETTE = {
  ink: '#0C0C0C',
  green: '#4BA95F',
  sky: '#77DDFA',
  orange: '#FEA339',
  purple: '#9985FB',
  coral: '#FF908D',
};

/**
 * Diferensiasi visual per era — Design.md §5.4.
 * Key harus cocok dengan `era.slug` dari backend.
 * `token` = nama token Tailwind/CSS variable yang sudah tersedia (index.css),
 * `hex` = nilai mentah untuk kebutuhan non-Tailwind.
 */
export const ERA_ACCENTS = {
  kolonial: { token: 'warning', hex: PALETTE.orange, label: 'Kolonial' },
  kemerdekaan: { token: 'success', hex: PALETTE.green, label: 'Kemerdekaan' },
  modern: { token: 'info', hex: PALETTE.sky, label: 'Modern' },
};

/** Fallback aksen netral untuk era yang belum terpetakan di atas */
export const DEFAULT_ERA_ACCENT = { token: 'primary', hex: PALETTE.ink, label: 'Lainnya' };

export function getEraAccent(eraSlug) {
  return ERA_ACCENTS[eraSlug] ?? DEFAULT_ERA_ACCENT;
}
