import { TextStyle } from 'react-native';

const ls = (size: number, em = -0.035) => size * em;

export const type = {
  display:  { fontFamily: 'DMSans-SemiBold', fontSize: 40, lineHeight: 42, letterSpacing: ls(40) } as TextStyle,
  h1:       { fontFamily: 'DMSans-SemiBold', fontSize: 28, lineHeight: 31, letterSpacing: ls(28) } as TextStyle,
  h2:       { fontFamily: 'DMSans-SemiBold', fontSize: 22, lineHeight: 26, letterSpacing: ls(22) } as TextStyle,
  h3:       { fontFamily: 'DMSans-Bold',     fontSize: 17, lineHeight: 22, letterSpacing: ls(17) } as TextStyle,
  body:     { fontFamily: 'DMSans-Regular',  fontSize: 15, lineHeight: 22 } as TextStyle,
  bodyStrong:{ fontFamily: 'DMSans-Bold',     fontSize: 15, lineHeight: 22 } as TextStyle,
  small:    { fontFamily: 'DMSans-Regular',  fontSize: 13, lineHeight: 18 } as TextStyle,
  caption:  { fontFamily: 'DMSans-Medium',   fontSize: 12, lineHeight: 16 } as TextStyle,
  eyebrow:  { fontFamily: 'DMSans-Bold',     fontSize: 11, lineHeight: 14, letterSpacing: 1.5, textTransform: 'uppercase' as const } as TextStyle,
  pill:     { fontFamily: 'DMSans-Bold',     fontSize: 11, lineHeight: 14 } as TextStyle,
  button:   { fontFamily: 'DMSans-Bold',     fontSize: 15, lineHeight: 20 } as TextStyle,
  accent:   { fontFamily: 'Fraunces-Medium' } as TextStyle,
} as const;
