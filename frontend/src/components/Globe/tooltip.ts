export function createTooltip(container: HTMLElement, themeMode: string): HTMLDivElement {
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.padding = '6px 12px';
    tooltip.style.background = themeMode ==='dark'
        ? 'rgba(72,39,175,0.8)'
        : 'rgba(255,66,8, 0.8';
    tooltip.style.color = '#fff';
    tooltip.style.borderRadius = '4px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.fontSize='14px';
    tooltip.style.opacity ='0';
    tooltip.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    //container.appendChild(tooltip);

    return tooltip;
}