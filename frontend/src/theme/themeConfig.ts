import {
    createLightTheme,
    createDarkTheme,
    type BrandVariants,
    type Theme,
    webLightTheme,
    webDarkTheme
} from '@fluentui/react-components';

const blueBrandRamp: BrandVariants = {
    10: '#001433',
    20: '#002966',
    30: '#003D99',
    40: '#0052CC',
    50: '#0066FF',
    60: '#1A75FF',
    70: '#3385FF',
    80: '#4D94FF',
    90: '#66A3FF',
    100: '#0078D4',
    110: '#1A85DB',
    120: '#3392E2',
    130: '#4D9FE9',
    140: '#66ACF0',
    150: '#80B9F7',
    160: '#99C6FF'
};

const greenAccent = {
    greenBackground: '#E6FFF0',
    greenBackgroundHover: '#ccffe0',
    greenBackgroundPressed: '#b3ffd1',
    greenForeground: '#00cc68',
    greenForegroundHover: '#00b35b',
    greenForegroundPressed: '#009a4e',
    colorCompoundBrandBackground: '#0078d4',
    colorCompoundBrandBackgroundHover: '#1a85db',
    colorCompoundBrandBackgroundPressed: '#0066ff',
};

export const lightTheme: Theme = {
    ...createLightTheme(blueBrandRamp),
    colorNeutralBackground1: '#FFFFFF',
    colorNeutralBackground2: '#f8f8f8',
    colorNeutralBackground3: '#f0f0f0',
    colorNeutralBackground4: '#e8e8e8',
    colorNeutralForeground1: '#242424',
    colorNeutralForeground2: '#424242',
    colorNeutralForeground3: '#616161',
    colorBrandForeground1: blueBrandRamp[100],
    colorBrandForeground2: blueBrandRamp[110],
    ...greenAccent,
    colorPaletteBlueForeground1: blueBrandRamp[100],
    colorPaletteBlueForeground2: blueBrandRamp[110],
    colorPaletteGreenBackground3: '#00ff82',
    colorPaletteGreenForeground1: '#00cc68',
    colorPaletteGreenForeground2: '#00e675',
};

export const darkTheme: Theme = {
    ...createDarkTheme(blueBrandRamp),
    colorNeutralBackground1: '#1a1a1a',
    colorNeutralBackground2: '#242424',
    colorNeutralBackground3: '#2e2e2e',
    colorNeutralBackground4: '#383838',
    colorNeutralForeground1: '#FFFFFF',
    colorNeutralForeground2: '#d6d6d6',
    colorNeutralForeground3: '#adadad',
    colorBrandForeground1: blueBrandRamp[110],
    colorBrandBackground2: blueBrandRamp[120],
    greenBackground: '#0d331a',
    greenBackgroundHover: '#144d27',
    greenBackgroundPressed: '#1a6634',
    greenForeground: '#00ff82',
    greenForegroundHover: '#1aff8f',
    greenForegroundPressed: '#33ff9c',

    colorCompoundBrandBackground: '#0078d4',
    colorCompoundBrandBackgroundHover: '#1a85db',
    colorCompoundBrandBackgroundPressed: '#0066ff',
    
    colorPaletteBlueForeground1: blueBrandRamp[110],
    colorPaletteBlueForeground2: blueBrandRamp[120],
    colorPaletteGreenBackground3: '#00e675',
    colorPaletteGreenForeground1: '#00ff82',
    colorPaletteGreenForeground2: '#1aff8f',
};

export const myLightTheme = {
    ...webLightTheme,
    ...lightTheme
};

export const myDarkTheme = {
    ...webDarkTheme,
    ...darkTheme
}