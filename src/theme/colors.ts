export const colors = {
  ink:       '#23312F',
  muted:     '#75817D',
  mutedSoft: '#8B9893',
  line:      '#E9EEEA',
  paper:     '#FFFDF9',
  card:      '#FFFFFF',
  surface:   '#F4F7F3',
  surface2:  '#FAFCFA',

  pink:      '#E85A91',  pinkSoft:   '#FFF0F5',
  yellow:    '#F6CA42',  yellowSoft: '#FFF8DF',
  teal:      '#44B7BD',  tealSoft:   '#E9F8F6',
  orange:    '#F48A50',  orangeSoft: '#FFF0E9',
  green:     '#5AB77F',  greenSoft:  '#EDF9EF',
  magenta:   '#C9489A',

  avatar: {
    pink:    { bg: '#F5C0D5', fg: '#BA3970' },
    teal:    { bg: '#BDE8E5', fg: '#218C92' },
    yellow:  { bg: '#FBE49A', fg: '#A7810A' },
    orange:  { bg: '#FFD2B9', fg: '#D46831' },
    green:   { bg: '#C9EBCE', fg: '#3D9C60' },
    magenta: { bg: '#EDC0E4', fg: '#AE3D8C' },
  },

  status: {
    success: { bg: '#E9F8EF', fg: '#3C9E68' },
    pending: { bg: '#FFF8DF', fg: '#AD8917' },
    danger:  { bg: '#FFF0E9', fg: '#D86B35' },
    info:    { bg: '#FFF0F5', fg: '#E85A91' },
    neutral: { bg: '#F4F7F3', fg: '#75817D' },
  },

  error: { bg: '#FFF0F0', border: '#F5C5C5', fg: '#C0392B' },
  bank:  { bg: '#F8FAF7' },
  dark:  '#293A37',
} as const;

export type Accent = 'pink' | 'yellow' | 'teal' | 'orange' | 'green' | 'magenta';

export const accent = (a: Accent) => ({
  color: colors[a],
  soft:  a === 'magenta' ? '#F8E3F2' : (colors as any)[`${a}Soft`],
});
