import type { PrefetchAiBriefOptions } from './types';
export declare class PrefetchAiBriefClient {
    private options;
    private cache;
    private summarizerInstance;
    private isCheckingAi;
    private aiAvailable;
    private activeHoverTimer;
    private activeAbortController;
    private currentAnchor;
    private tooltipEl;
    private isInitialized;
    constructor(userOptions?: Partial<PrefetchAiBriefOptions>);
    init(): Promise<void>;
    private initChromeAI;
    private createTooltipElement;
    private attachEventListeners;
    private findMatchingAnchor;
    private handleLinkHover;
    private handleLinkLeave;
    private cleanupPendingRequests;
    private triggerBrief;
    private showTooltip;
    private hideTooltip;
    private positionTooltip;
    private injectDefaultStyles;
}
/**
 * Initializes the client-side AI brief previewer.
 */
export declare function initPrefetchAiBrief(options?: Partial<PrefetchAiBriefOptions>): PrefetchAiBriefClient;
//# sourceMappingURL=client.d.ts.map