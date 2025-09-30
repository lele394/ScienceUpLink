export default class SpacerWidget {
    /**
     * The constructor is the only part of this widget that does anything.
     * It finds its own container and restyles it to be an invisible line break.
     */
    constructor(canvas, config) {
        // We need the widget's own container div, which is the parent of the canvas's parent.
        const widgetContainer = canvas.parentElement.parentElement;

        // 1. Remove all default content.
        widgetContainer.innerHTML = '';
        
        // 2. Apply the crucial CSS to force a line break and make it invisible.
        widgetContainer.style.flexBasis = '100%'; // The most important rule!
        widgetContainer.style.height = '0';
        widgetContainer.style.padding = '0';
        widgetContainer.style.margin = '0';
        widgetContainer.style.border = 'none';
        widgetContainer.style.boxShadow = 'none'; // Also remove the default shadow
    }

    /**
     * This widget does not need to display any data, so the update method
     * is empty. It exists only to fulfill the widget contract.
     */
    update(allData) {
        // Do nothing.
    }

    /**
     * Optional: Cleanup logic.
     */
    destroy() {
        // Nothing to clean up.
    }
}