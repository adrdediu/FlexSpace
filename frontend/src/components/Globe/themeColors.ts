export interface ThemeColors{
    stroke:string;
    fill:string;
    glow:string;
    pointColor:string;
    globeColor: string;
    arcColor: string;
    highlightFill: string;
    dimmedFill: string;
}
export function getThemeColors(themeMode: string, fillOpacity: number): ThemeColors {
    const isDark = themeMode ==='dark';

    if(isDark) {
        return {
            stroke:'#1a85db',
            fill:`rgba(26, 133, 219, ${fillOpacity})`,
            glow:'#3392e2',
            pointColor:'#4d9fe9',
            globeColor:'#1a1a1a',
            arcColor:'#1a85db',
            highlightFill:`rgba(51,146,226, ${Math.min(fillOpacity +0.2),1})`,
            dimmedFill:`rgba(26,133,219,${fillOpacity *0.5}),`
        }
    } else {
        return {
            stroke:'#0078d4',
            fill:`rgba(0, 120, 212, ${fillOpacity})`,
            glow:'#3392e2',
            pointColor:'#1a85db',
            globeColor:'#ffffff',
            arcColor:'#0078d4',
            highlightFill:`rgba(26,133,219, ${Math.min(fillOpacity +0.4),1})`,
            dimmedFill:`rgba(0,120,212,${fillOpacity *0.5}),`
        }
    }
}