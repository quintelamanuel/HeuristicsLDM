/**
 * Application configuration constants
 * 
 * This file centralizes configuration values used throughout the application.
 * Storing these values here makes it easier to update them in one place.
 */

/**
 * Application configuration object
 */
export const APP_CONFIG = {
  EDITOR_IDS: {
    GDM: 'apollon_gdm',
    LDM: 'apollon_ldm',
  },
  STORAGE_KEYS: {
    GDM: 'apollon_gdm_model',
    LDM: 'apollon_ldm_model',
  },
  DEFAULT_OPTIONS: {
    colorEnabled: true,
    scale: 0.5,
  },
  AUTO_TAG_ON_SELECTION: false, // Set to true to enable auto-tagging
  HIGHLIGHT_COLOR: "#e000ff",
  // Tag strings for consistent usage across the application
  TAG_TYPES: {
    INSTANTIABLE: '<<instantiable>>',
    MODIFIABLE: '<<modifiable>>',
    REQUIRED: '<<required>>',
    QUERIED: '<<queried>>',
    QUERY_ROOT: '<<query_root>>',
    PENDING: '<<pending>>',
  },
  // Colors corresponding to each tag type
  TAG_COLORS: {
    INSTANTIABLE: '#FFE0B2',
    MODIFIABLE: '#FFF9C4',
    REQUIRED: '#aeffff',
    QUERIED: '#ffc4f1',
    QUERY_ROOT: '#e1b8ff',
    PENDING: '#ff6876',
    DEFAULT: '#ffffff'
  },
  DEFAULT_COLORS: {
    FILL: '#ffffff',
    STROKE: '#000000',
    TEXT: '#000000'
  }
};