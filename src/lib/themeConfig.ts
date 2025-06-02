
import type { ThemeConfig } from 'antd';

// These values should correspond to your tailwind.config.ts
export const tailwindResolvedColors = {
  primary: { DEFAULT: '#1677ff', dark: '#0050b3' },
  secondary: { DEFAULT: '#5A5A5A', light: '#F0F0F0' },
  accent: '#FAAD14',
  success: '#52C41A',
  warning: '#FA8C16',
  danger: '#FF4D4F',
  'light-gray': '#f8f9fa',
  'dark-text': '#333333',
  fontFamily: {
    sans: ['Inter', 'sans-serif'],
    serif: ['Merriweather', 'serif'],
  },
  borderRadius: {
    DEFAULT: '6px',
    lg: '10px',
  },
};

export const getAntdTheme = (): ThemeConfig => ({
  token: {
    colorPrimary: tailwindResolvedColors.primary.DEFAULT,
    colorSuccess: tailwindResolvedColors.success,
    colorWarning: tailwindResolvedColors.warning,
    colorError: tailwindResolvedColors.danger,
    fontFamily: tailwindResolvedColors.fontFamily.sans.join(','),
    borderRadius: parseInt(tailwindResolvedColors.borderRadius.DEFAULT, 10),
    controlHeight: 36,
    fontSize: 14,
    // Add other token overrides here if needed
    // colorBgLayout: tailwindResolvedColors["light-gray"], // Example: setting layout background
  },
  components: {
    Button: {
      // primaryShadow: '0 2px #0000000a', // Example: Subtle shadows
      // fontWeight: 500, // Example: Default font weight for buttons
    },
    Table: {
      headerBg: tailwindResolvedColors.secondary.light,
      headerColor: tailwindResolvedColors['dark-text'],
      headerSortActiveBg: tailwindResolvedColors.primary.dark,
      // cellPaddingBlock: 12, // Example: Adjust cell padding
    },
    Form: {
      labelColor: tailwindResolvedColors['dark-text'],
      // itemMarginBottom: 20, // Example: Consistent spacing between form items
    },
    Input: {
      // controlPaddingHorizontal: 12, // Example
    },
    Card: {
      // headerBg: tailwindResolvedColors.secondary.light, // Example
      // paddingLG: 20, // Example: Card content padding
    },
    Layout: {
        headerBg: tailwindResolvedColors.primary.DEFAULT, // Example for AntD Layout Header
        siderBg: tailwindResolvedColors.primary.dark, // Example for AntD Layout Sider
    }
    // ... other component-specific customizations
  },
});
