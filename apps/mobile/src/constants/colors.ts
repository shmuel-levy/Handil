/**
 * "Job site" palette.
 *
 * Colours are borrowed from a construction site rather than a generic SaaS
 * kit: hi-vis safety orange for actions, safety yellow for hazard tape and
 * highlights, asphalt for heavy surfaces (heroes, navigation), blueprint blue
 * for plans and instruction, and a concrete grey ground.
 */
export const colors = {
  primary: '#EE6A1B',      // safety orange — hi-vis vest
  primaryDark: '#C2520D',  // pressed / bottom edge of buttons
  primaryLight: '#FFF0E4',

  hazard: '#FFC629',       // safety yellow — hazard tape, highlights
  hazardDark: '#E0A800',
  hazardLight: '#FFF6D6',
  hazardInk: '#6B4E00',    // readable text on hazardLight

  asphalt: '#1F2226',      // heavy surfaces: heroes, tab bar, sidebar
  asphaltSoft: '#2C3035',
  asphaltLine: '#3B4046',  // hairlines on asphalt
  onAsphalt: '#F4F1EA',
  onAsphaltMuted: '#9EA3A8',

  steel: '#5D6872',
  blueprint: '#1F5C99',    // plans, teaching, informational accents
  blueprintLight: '#E8F0F8',
  blueprintLine: 'rgba(120, 170, 220, 0.10)',

  success: '#15803D',
  successLight: '#EAF6EE',

  warning: '#B45309',
  warningLight: '#FFF6E5',

  error: '#C62828',
  errorLight: '#FDECEC',

  background: '#F0EEE9',   // poured concrete
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  border: '#D9D5CC',
  borderLight: '#ECE9E3',

  textPrimary: '#1F2226',
  textSecondary: '#3E434A',
  textMuted: '#6C7177',
  textDisabled: '#A2A5A9',

  star: '#F5A300',
  white: '#FFFFFF',
  black: '#000000',
};
