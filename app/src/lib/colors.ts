// ── 캐니언 컬러 팔레트 (중앙 관리) ─────────────────────────
export const CANYON = {
  bg:         '#FDF5EE',
  cardBg:     '#FFFAF5',
  border:     '#F0D5C0',
  textDark:   '#3D1008',
  textMid:    '#8B5A40',
  textLight:  '#B08060',
  accent:     '#C24B25',
  amber:      '#F5901E',
  amberLight: '#FFB347',
  cream:      '#FDE8D0',
  selectedBg: '#FEF3EB',
  // 랜딩 전용 (히어로 그래디언트 등)
  heroBlack:  '#1A0503',
  deepRed:    '#6B2015',
  mediumRed:  '#8B3520',
  lightAmber: '#F5C49A',
  warmBeige:  '#FAF0E6',
  // 상태 색상
  error:       '#FEF2F2',
  errorBorder: '#FECACA',
  errorText:   '#991B1B',
  success:     '#6B7B3A',
  docxSave:    '#3D6B3A',
};

// DOCX용 (# 없는 버전)
export const CANYON_DOCX = Object.fromEntries(
  Object.entries(CANYON).map(([k, v]) => [k, v.replace('#', '')])
) as Record<keyof typeof CANYON, string>;
