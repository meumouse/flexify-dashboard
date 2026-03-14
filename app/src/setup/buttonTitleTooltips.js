const TOOLTIP_ATTR = 'data-fd-tooltip';
const VIEWPORT_GAP = 8;
const TOOLTIP_GAP = 8;

let initialized = false;
let tooltipElement = null;
let activeButton = null;

const ensureTooltipElement = () => {
    if (tooltipElement) {
        return tooltipElement;
    }

    tooltipElement = document.createElement('div');
    tooltipElement.className = 'fd-button-tooltip';
    tooltipElement.setAttribute('role', 'tooltip');
    tooltipElement.setAttribute('data-placement', 'top');
    document.body.appendChild(tooltipElement);

    return tooltipElement;
};

const enhanceButton = (button) => {
    if (!(button instanceof HTMLButtonElement)) {
        return;
    }

    const title = button.getAttribute('title');

    if (!title) {
        return;
    }

    button.setAttribute(TOOLTIP_ATTR, title);
    button.removeAttribute('title');
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getBestPlacement = (targetRect, tooltipRect) => {
    const available = {
        top: targetRect.top,
        bottom: window.innerHeight - targetRect.bottom,
        left: targetRect.left,
        right: window.innerWidth - targetRect.right,
    };

    const needed = {
        top: tooltipRect.height + TOOLTIP_GAP,
        bottom: tooltipRect.height + TOOLTIP_GAP,
        left: tooltipRect.width + TOOLTIP_GAP,
        right: tooltipRect.width + TOOLTIP_GAP,
    };

    const orderedBySpace = ['top', 'bottom', 'right', 'left'].sort(
        (a, b) => available[b] - available[a]
    );

    return orderedBySpace.find((placement) => available[placement] >= needed[placement]) || orderedBySpace[0];
};

const positionTooltip = (button) => {
    const tooltip = ensureTooltipElement();
    const targetRect = button.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    const placement = getBestPlacement(targetRect, tooltipRect);
    tooltip.setAttribute('data-placement', placement);

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    let y = targetRect.top - tooltipRect.height - TOOLTIP_GAP;

    if (placement === 'bottom') {
        y = targetRect.bottom + TOOLTIP_GAP;
    }

    if (placement === 'left') {
        x = targetRect.left - tooltipRect.width - TOOLTIP_GAP;
        y = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
    }

    if (placement === 'right') {
        x = targetRect.right + TOOLTIP_GAP;
        y = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
    }

    const maxX = Math.max(VIEWPORT_GAP, viewportWidth - tooltipRect.width - VIEWPORT_GAP);
    const maxY = Math.max(VIEWPORT_GAP, viewportHeight - tooltipRect.height - VIEWPORT_GAP);

    x = clamp(x, VIEWPORT_GAP, maxX);
    y = clamp(y, VIEWPORT_GAP, maxY);

    tooltip.style.left = `${window.scrollX + x}px`;
    tooltip.style.top = `${window.scrollY + y}px`;
};

const showTooltip = (button) => {
    const text = button.getAttribute(TOOLTIP_ATTR);

    if (!text) {
        return;
    }

    activeButton = button;

    const tooltip = ensureTooltipElement();
    tooltip.textContent = text;
    tooltip.classList.add('is-visible');

    positionTooltip(button);
};

const hideTooltip = (button) => {
    if (button && activeButton && button !== activeButton) {
        return;
    }

    const tooltip = ensureTooltipElement();
    tooltip.classList.remove('is-visible');
    activeButton = null;
};

const injectTooltipStyles = () => {
    if (document.getElementById('fd-button-tooltip-style')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'fd-button-tooltip-style';
    style.textContent = `
        .fd-button-tooltip {
        position: absolute;
        z-index: 9999;
        max-width: 260px;
        padding: 6px 8px;
        border-radius: 6px;
        background: rgb(24 24 27 / 0.95);
        color: #fff;
        font-size: 11px;
        line-height: 1.3;
        white-space: normal;
        text-align: center;
        pointer-events: none;
        opacity: 0;
        transition: opacity 150ms ease, transform 150ms ease;
        box-shadow: 0 8px 24px rgb(0 0 0 / 0.35);
        }

        .fd-button-tooltip[data-placement='top'] {
        transform: translateY(-4px);
        }

        .fd-button-tooltip[data-placement='bottom'] {
        transform: translateY(4px);
        }

        .fd-button-tooltip[data-placement='left'] {
        transform: translateX(-4px);
        }

        .fd-button-tooltip[data-placement='right'] {
        transform: translateX(4px);
        }

        .fd-button-tooltip.is-visible {
        opacity: 1;
        transform: translate(0, 0);
        }

        .fd-button-tooltip::after {
        content: '';
        position: absolute;
        width: 0;
        height: 0;
        border: 5px solid transparent;
        }

        .fd-button-tooltip[data-placement='top']::after {
        left: 50%;
        top: 100%;
        transform: translateX(-50%);
        border-top-color: rgb(24 24 27 / 0.95);
        }

        .fd-button-tooltip[data-placement='bottom']::after {
        left: 50%;
        bottom: 100%;
        transform: translateX(-50%);
        border-bottom-color: rgb(24 24 27 / 0.95);
        }

        .fd-button-tooltip[data-placement='left']::after {
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        border-left-color: rgb(24 24 27 / 0.95);
        }

        .fd-button-tooltip[data-placement='right']::after {
        right: 100%;
        top: 50%;
        transform: translateY(-50%);
        border-right-color: rgb(24 24 27 / 0.95);
        }
    `;

    document.head.appendChild(style);
};

const enhanceButtonsInNode = (node) => {
    if (!(node instanceof Element)) {
        return;
    }

    if (node.matches('button[title]')) {
        enhanceButton(node);
    }

    node.querySelectorAll('button[title]').forEach(enhanceButton);
};

const resolveButtonFromEvent = (event) => {
    if (!(event.target instanceof Element)) {
        return null;
    }

    return event.target.closest(`button[${TOOLTIP_ATTR}]`);
};

const handleEnter = (event) => {
    const button = resolveButtonFromEvent(event);

    if (!button) {
        return;
    }

    showTooltip(button);
};

const handleLeave = (event) => {
    const button = resolveButtonFromEvent(event);

    if (!button) {
        return;
    }

    if (event.relatedTarget instanceof Node && button.contains(event.relatedTarget)) {
        return;
    }

    hideTooltip(button);
};

const handleScrollAndResize = () => {
    if (!activeButton) {
        return;
    }

    positionTooltip(activeButton);
};

export const setupButtonTitleTooltips = () => {
    if (initialized || typeof document === 'undefined') {
        return;
    }

    initialized = true;

    injectTooltipStyles();
    enhanceButtonsInNode(document.body);

    document.addEventListener('mouseover', handleEnter);
    document.addEventListener('focusin', handleEnter);
    document.addEventListener('mouseout', handleLeave);
    document.addEventListener('focusout', handleLeave);

    window.addEventListener('scroll', handleScrollAndResize, true);
    window.addEventListener('resize', handleScrollAndResize);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach(enhanceButtonsInNode);

            if (
                mutation.type === 'attributes' &&
                mutation.target instanceof HTMLButtonElement &&
                mutation.attributeName === 'title'
            ) {
                enhanceButton(mutation.target);
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['title'],
    });
};