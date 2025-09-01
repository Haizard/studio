
import type { ThemeConfig } from 'antd';

// Design System Colors - Modern Improved Palette
export const designSystemColors = {
  // Primary colors (Modern Blue-Purple)
  primary: '#6366f1',
  'primary-50': '#f0f4ff',
  'primary-100': '#e0e7ff',
  'primary-200': '#c7d2fe',
  'primary-300': '#a5b4fc',
  'primary-400': '#818cf8',
  'primary-500': '#6366f1',
  'primary-600': '#4f46e5',
  'primary-700': '#4338ca',
  'primary-800': '#3730a3',
  'primary-900': '#312e81',

  // Secondary colors (Vibrant Teal)
  secondary: '#14b8a6',
  'secondary-50': '#f0fdfa',
  'secondary-100': '#ccfbf1',
  'secondary-200': '#99f6e4',
  'secondary-300': '#5eead4',
  'secondary-400': '#2dd4bf',
  'secondary-500': '#14b8a6',
  'secondary-600': '#0d9488',
  'secondary-700': '#0f766e',
  'secondary-800': '#115e59',
  'secondary-900': '#134e4a',

  // Accent colors (Warm & Cool Tones)
  accent: '#f472b6',
  'accent-pink': '#f472b6',
  'accent-orange': '#fb923c',
  'accent-cyan': '#22d3ee',
  'accent-blue': '#3b82f6',
  'accent-purple': '#a855f7',
  'accent-green': '#34d399',
  'accent-yellow': '#fbbf24',
  'accent-red': '#f87171',

  // Success colors
  success: '#10b981',
  'success-50': '#ecfdf5',
  'success-100': '#d1fae5',
  'success-500': '#10b981',
  'success-600': '#059669',
  'success-700': '#047857',

  // Warning colors
  warning: '#f59e0b',
  'warning-50': '#fffbeb',
  'warning-100': '#fef3c7',
  'warning-500': '#f59e0b',
  'warning-600': '#d97706',
  'warning-700': '#b45309',

  // Danger/Error colors
  danger: '#ef4444',
  error: '#ef4444',
  'danger-50': '#fef2f2',
  'danger-100': '#fee2e2',
  'danger-500': '#ef4444',
  'danger-600': '#dc2626',
  'danger-700': '#b91c1c',

  // Info colors
  info: '#3b82f6',
  'info-50': '#eff6ff',
  'info-100': '#dbeafe',
  'info-500': '#3b82f6',
  'info-600': '#2563eb',
  'info-700': '#1d4ed8',

  // Neutral colors (Warmer Grays)
  'neutral-50': '#fafaf9',
  'neutral-100': '#f5f5f4',
  'neutral-200': '#e7e5e4',
  'neutral-300': '#d6d3d1',
  'neutral-400': '#a8a29e',
  'neutral-500': '#78716c',
  'neutral-600': '#57534e',
  'neutral-700': '#44403c',
  'neutral-800': '#292524',
  'neutral-900': '#1c1917',

  // Background colors
  background: '#fafaf9',
  'background-secondary': '#f5f5f4',

  // Surface colors
  surface: '#ffffff',
  'surface-secondary': '#fafaf9',
};

export const getAntdTheme = (): ThemeConfig => ({
  token: {
    // Core Colors
    colorPrimary: designSystemColors['primary-600'],
    colorSuccess: designSystemColors.success,
    colorWarning: designSystemColors.warning,
    colorError: designSystemColors.danger,
    colorInfo: designSystemColors.info,
    
    // Background Colors
    colorBgBase: designSystemColors.background,
    colorBgContainer: designSystemColors.surface,
    colorBgElevated: designSystemColors.surface,
    colorBgLayout: designSystemColors['neutral-50'],
    
    // Text Colors
    colorText: designSystemColors['neutral-900'],
    colorTextSecondary: designSystemColors['neutral-600'],
    colorTextTertiary: designSystemColors['neutral-500'],
    colorTextQuaternary: designSystemColors['neutral-300'],
    
    // Border Colors
    colorBorder: designSystemColors['neutral-200'],
    colorBorderSecondary: designSystemColors['neutral-100'],
    
    // Typography
    fontFamily: 'var(--font-family-primary), Inter, sans-serif',
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,
    fontSizeHeading5: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontSizeXL: 20,
    
    // Spacing & Sizing
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    borderRadiusXS: 4,
    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,
    controlHeightXS: 24,
    
    // Shadows
    boxShadow: 'var(--shadow-sm)',
    boxShadowSecondary: 'var(--shadow-xs)',
    boxShadowTertiary: 'var(--shadow-md)',
    
    // Motion
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
    motionEaseInOut: 'var(--easing-ease-in-out)',
    motionEaseOut: 'var(--easing-ease-out)',
    
    // Line Height
    lineHeight: 1.5,
    lineHeightHeading1: 1.2,
    lineHeightHeading2: 1.3,
    lineHeightHeading3: 1.4,
    lineHeightHeading4: 1.4,
    lineHeightHeading5: 1.5,
  },
  components: {
    // Button Component
    Button: {
      fontWeight: 500,
      borderRadius: 8,
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      primaryShadow: 'var(--shadow-sm)',
      defaultShadow: 'var(--shadow-xs)',
    },
    
    // Card Component
    Card: {
      borderRadiusLG: 12,
      paddingLG: 24,
      headerBg: designSystemColors.surface,
      headerHeight: 56,
      boxShadowTertiary: 'var(--shadow-sm)',
    },
    
    // Table Component
    Table: {
      headerBg: designSystemColors['neutral-50'],
      headerColor: designSystemColors['neutral-700'],
      headerSortActiveBg: designSystemColors['primary-50'],
      headerSortHoverBg: designSystemColors['neutral-100'],
      rowHoverBg: designSystemColors['neutral-50'],
      borderColor: designSystemColors['neutral-200'],
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
    },
    
    // Form Component
    Form: {
      labelColor: designSystemColors['neutral-700'],
      labelFontSize: 14,
      labelHeight: 32,
      itemMarginBottom: 20,
      verticalLabelPadding: '0 0 8px',
    },
    
    // Input Component
    Input: {
      borderRadius: 8,
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      paddingBlock: 8,
      paddingInline: 12,
      activeBorderColor: designSystemColors['primary-600'],
      hoverBorderColor: designSystemColors['primary-300'],
    },
    
    // Select Component
    Select: {
      borderRadius: 8,
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      optionSelectedBg: designSystemColors['primary-50'],
      optionActiveBg: designSystemColors['neutral-50'],
    },
    
    // Layout Component
    Layout: {
      headerBg: designSystemColors.background,
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: designSystemColors.surface,
      bodyBg: designSystemColors.background,
      footerBg: designSystemColors.surface,
      footerPadding: '24px 50px',
      triggerBg: designSystemColors.primary.DEFAULT,
      triggerColor: '#fff',
    },
    
    // Menu Component
    Menu: {
      itemBg: 'transparent',
      itemColor: designSystemColors['neutral-600'],
      itemHoverBg: designSystemColors['primary-50'],
      itemHoverColor: designSystemColors['primary-600'],
      itemSelectedBg: designSystemColors['primary-100'],
      itemSelectedColor: designSystemColors['primary-700'],
      itemActiveBg: designSystemColors['primary-50'],
      subMenuItemBg: 'transparent',
      itemBorderRadius: 6,
      itemHeight: 40,
      itemMarginBlock: 4,
      itemMarginInline: 4,
      itemPaddingInline: 12,
    },
    
    // Modal Component
    Modal: {
      borderRadiusLG: 12,
      headerBg: designSystemColors.surface,
      contentBg: designSystemColors.background,
      footerBg: designSystemColors.surface,
    },
    
    // Notification Component
    Notification: {
      borderRadiusLG: 8,
      paddingMD: 16,
    },
    
    // Message Component
    Message: {
      borderRadiusLG: 8,
      contentPadding: '10px 16px',
    },
    
    // Tag Component
    Tag: {
      borderRadiusSM: 6,
      defaultBg: designSystemColors['neutral-100'],
      defaultColor: designSystemColors['neutral-600'],
    },
    
    // Avatar Component
    Avatar: {
      borderRadius: 50,
      containerSize: 32,
      containerSizeLG: 40,
      containerSizeSM: 24,
    },
    
    // Breadcrumb Component
    Breadcrumb: {
      itemColor: designSystemColors['neutral-500'],
      lastItemColor: designSystemColors['neutral-700'],
      linkColor: designSystemColors['primary-600'],
      linkHoverColor: designSystemColors['primary-700'],
      separatorColor: designSystemColors['neutral-400'],
    },
    
    // Dropdown Component
    Dropdown: {
      borderRadiusLG: 8,
      paddingBlock: 4,
    },
    
    // Divider Component
    Divider: {
      colorSplit: designSystemColors['neutral-200'],
    },
    
    // Progress Component
    Progress: {
      defaultColor: designSystemColors['primary-600'],
      remainingColor: designSystemColors['neutral-200'],
      circleTextColor: designSystemColors['neutral-700'],
    },
    
    // Spin Component
    Spin: {
      colorPrimary: designSystemColors['primary-600'],
    },
    
    // Switch Component
    Switch: {
      colorPrimary: designSystemColors['primary-600'],
      colorPrimaryHover: designSystemColors['primary-700'],
    },
    
    // Tabs Component
    Tabs: {
      itemColor: designSystemColors['neutral-600'],
      itemHoverColor: designSystemColors['primary-600'],
      itemSelectedColor: designSystemColors['primary-600'],
      itemActiveColor: designSystemColors['primary-600'],
      inkBarColor: designSystemColors['primary-600'],
      cardBg: designSystemColors.surface,
    },
  },
});
