/* eslint-disable no-console */
// Import theming configuration from JSON file to support light/dark mode themes
import * as themings from '../themings.json';
// Import EditorManager to interact with the diagram editors
import { LastSelectionUpdateData, EditorManager } from './EditorManager';
// Import application configuration constants
import { APP_CONFIG } from './AppConfig';

import * as Apollon from '../../src/main';

import ModelManager from './ModelManager/ModelManager';
import QueryPathBuilder from './QueryShapeManager/QueryPathBuilder';

/**
 * Encapsulates all conditions that affect button states
 */
interface ButtonState {
    hasClassSelected: boolean;
    hasRelationshipSelected: boolean;
    hasQueryRootSelected: boolean;
    isQueryPathInProgress: boolean;
    onlyOneThingSelected: boolean;
    showingQueryShape: boolean;
}

/**
 * UIController handles UI-related functionality for the Apollon application.
 * Manages user interactions, theme switching, and visual state.
 */
export class SidebarUIController {

    private lastSelectionUpdateData: LastSelectionUpdateData | null = null;
    private currentQueryPathBuilder: QueryPathBuilder | null = null;
    private editorManager: EditorManager;
    private showingQueryShapeBtn: boolean = false;

    /**
     * Create a new UIController
     * @param editorManager - Reference to the editor manager for editor operations
     */
    constructor(editorManager: EditorManager) {
        this.editorManager = editorManager;
    }

    /**
     * Initialize UI components and styles
     */
    public initialize(): void {
        // Add CSS styles to the document for UI elements
        this.initStyles();
        // Set up event handlers for UI controls like theme buttons
        this.setupEventListeners();

        // Set light theme as default for better initial visibility
        this.setTheming('light');

        // Initialize query shape buttons state
        this.initQueryShapeButtons();

        // Setup button states according to selection capabilities
        this.setupSelectionStateListeners();

        // Initialize all button states
        this.updateAllButtonStates(false, false, false, this.isQueryPathInProgress(), false, false);
    }

    setCurrentQueryPathBuilder(queryPathBuilder: QueryPathBuilder | null): void {
        this.currentQueryPathBuilder = queryPathBuilder;
    }

    /**
     * Set up event listeners for UI elements
     */
    private setupEventListeners(): void {
        // Get references to the theme toggle buttons in the DOM
        const lightModeButton = document.getElementById('theming-light-mode-button');
        const darkModeButton = document.getElementById('theming-dark-mode-button');

        // Add click handler to light mode button if it exists in the DOM
        if (lightModeButton) {
            // When light mode button is clicked, switch to light theme
            lightModeButton.addEventListener('click', () => this.setTheming('light'));
        }

        // Add click handler to dark mode button if it exists in the DOM
        if (darkModeButton) {
            // When dark mode button is clicked, switch to dark theme
            darkModeButton.addEventListener('click', () => this.setTheming('dark'));
        }

        // Set up event listeners for query shape buttons
        this.setupQueryShapeButtonListeners();
    }

    /**
     * Initialize the query shape buttons to their default state
     */
    private initQueryShapeButtons(): void {
        this.enableButton('selectQueryRootBtn');
        this.disableButton('addToPathBtn');
        this.disableButton('finishPathBtn');
    }

    /**
     * Set up event listeners for query shape buttons
     */
    private setupQueryShapeButtonListeners(): void {
        const selectQueryRootBtn = document.getElementById('selectQueryRootBtn');
        const addToPathBtn = document.getElementById('addToPathBtn');
        const finishPathBtn = document.getElementById('finishPathBtn');
        const showQueryShapeBtn = document.getElementById('showQueryShapeBtn');
        const stopShowingQueryShapeBtn = document.getElementById('stopShowingQueryShapeBtn');

        if (selectQueryRootBtn) {
            selectQueryRootBtn.addEventListener('click', () => this.selectQueryRoot());
        }

        if (addToPathBtn) {
            addToPathBtn.addEventListener('click', () => this.addToQueryPath());
        }

        if (finishPathBtn) {
            finishPathBtn.addEventListener('click', () => this.finishQueryPath());
        }

        if (showQueryShapeBtn) {
            showQueryShapeBtn.addEventListener('click', () => this.showQueryShape());
        }

        if (stopShowingQueryShapeBtn) {
            stopShowingQueryShapeBtn.addEventListener('click', () => this.stopShowingQueryShape());
        }
    }

    /**
     * Handle the select query shape root button click
     */
    public selectQueryRoot(): void {
        console.log('Query shape root selected');

        this.disableButton('selectQueryRootBtn');
        this.enableButton('addToPathBtn');
        this.enableButton('finishPathBtn');
    }

    /**
     * Handle add to query path button click
     */
    public addToQueryPath(): void {
        console.log('Added to query path');
    }

    /**
     * Handle finish query path button click
     */
    public finishQueryPath(): void {
        console.log('Query path finished');

        this.enableButton('selectQueryRootBtn');
        this.disableButton('addToPathBtn');
        this.disableButton('finishPathBtn');
    }

    /**
     * Handle the show query shape button click
     */
    public showQueryShape(): void {
        console.log('Showing query shape');
        this.showingQueryShapeBtn = true;

        // Update buttons based on new state
        if (this.lastSelectionUpdateData) {
            const { hasClassSelected, hasRelationshipSelected, hasQueryRootSelected, onlyOneThingSelected } = this.lastSelectionUpdateData;
            this.updateAllButtonStates(
                hasClassSelected,
                hasRelationshipSelected,
                hasQueryRootSelected,
                this.isQueryPathInProgress(),
                onlyOneThingSelected,
                this.showingQueryShapeBtn
            );
        }
    }

    /**
     * Handle the stop showing query shape button click
     */
    public stopShowingQueryShape(): void {
        console.log('Stopped showing query shape');
        this.showingQueryShapeBtn = false;

        // Re-evaluate all button states based on current selection
        if (this.lastSelectionUpdateData) {
            const { hasClassSelected, hasRelationshipSelected, hasQueryRootSelected, onlyOneThingSelected } = this.lastSelectionUpdateData;
            this.updateAllButtonStates(
                hasClassSelected,
                hasRelationshipSelected,
                hasQueryRootSelected,
                this.isQueryPathInProgress(),
                onlyOneThingSelected,
                this.showingQueryShapeBtn
            );
        }
    }

    /**
     * Initialize styles for the editors
     */
    private initStyles(): void {
        // Create a new style element to hold our dynamic CSS
        const style = document.createElement('style');

        // Define CSS rules as a template string for better readability
        // These rules control the visual appearance of UI elements
        style.textContent = `
      .active-editor {
        box-shadow: 0 0 0 3px #4d90fe; /* Blue outline for active editor */
      }
      
      .theme-button {
        cursor: pointer;
        padding: 5px 10px;
        margin: 5px;
        border: 1px solid #ccc;
        border-radius: 3px;
      }
      
      .theme-button.selected {
        background-color: #4d90fe;
        color: white;
      }
    `;

        // Add the style element to the document head so the CSS rules take effect
        document.head.appendChild(style);
    }

    /**
     * Handle editor click event
     * @param editorId - ID of the editor that was clicked
     */
    public onEditorClick(editorId: string): void {
        // Tell the EditorManager to update its active editor state
        // This will update internal state and visual appearance
        this.editorManager.setActiveEditor(editorId);
    }

    /**
     * Handle change events for select elements
     * @param event - Event from select element change
     */
    public onChange(event: MouseEvent): void {
        // Cast the event target to HTMLSelectElement to access select-specific properties
        const target = event.target as HTMLSelectElement;
        // Exit early if target is null or undefined (safety check)
        if (!target) return;

        // Extract the input name and selected value from the element
        // Name identifies which option is being changed (e.g., 'scale')
        // Value contains the new setting value (e.g., '0.8')
        const { name, value } = target;

        // Update the active editor's options using computed property name
        // The [name] syntax creates a dynamic property with the name from the input
        this.editorManager.updateActiveOptions({ [name]: value });

        // Persist the changes to localStorage
        this.editorManager.saveActiveModel();
        // Refresh both editors to apply changes
        this.editorManager.renderAll();
    }

    /**
     * Handle switch events for checkboxes
     * @param event - Event from checkbox change
     */
    public onSwitch(event: MouseEvent): void {
        // Cast the event target to HTMLInputElement for checkbox properties
        const target = event.target as HTMLInputElement;
        // Exit early if target is null or undefined (safety check)
        if (!target) return;

        // Extract input name and checked state 
        // Name identifies which option is being changed (e.g., 'colorEnabled')
        // The checked property contains the boolean state of the checkbox
        const { name, checked: value } = target;

        // Update the active editor's options with the new checkbox state
        // Using computed property name to dynamically set the right property
        this.editorManager.updateActiveOptions({ [name]: value });

        // Save changes to localStorage for persistence
        this.editorManager.saveActiveModel();
        // Re-render both editors to reflect the changes
        this.editorManager.renderAll();
    }

    /**
     * Set the application theme (light/dark mode)
     * @param theming - Theme name ('light' or 'dark')
     */
    public setTheming(theming: string): void {
        // Get the root HTML element to set CSS variables at the document level
        // This ensures the theme affects all elements in the application
        const root = document.documentElement;

        // Get references to the theme toggle buttons to update their appearance
        // We determine which button should be selected based on the chosen theme
        const selectedButton = document.getElementById(
            // Get the button for the current theme (light/dark)
            theming === 'light' ? 'theming-light-mode-button' : 'theming-dark-mode-button'
        );
        const unselectedButton = document.getElementById(
            // Get the button for the other theme
            theming === 'light' ? 'theming-dark-mode-button' : 'theming-light-mode-button'
        );

        // Update button styles to visually indicate the current theme selection
        if (selectedButton && unselectedButton) {
            // Add 'selected' class to the button of the current theme
            selectedButton.classList.add('selected');
            // Remove 'selected' class from the other theme's button
            unselectedButton.classList.remove('selected');
        }

        // Apply CSS variables from the theme configuration to the document
        // We iterate through all CSS variables defined in the theme
        for (const themingVar of Object.keys(themings[theming])) {
            // Set each CSS variable on the root element
            // This changes colors, fonts, and other theme properties
            root.style.setProperty(themingVar, themings[theming][themingVar]);
        }
    }

    /**
     * Refresh the UI to match current state
     */
    public refreshUI(): void {
        // Get the current active editor ID to ensure the UI reflects the correct editor
        const activeEditorId = this.editorManager.getActiveEditorId();

        // Get the current options for the active editor to update UI controls
        const { options } = this.editorManager.getActiveEditor();

        // Only proceed if we have options (editor exists and is initialized)
        if (options) {
            // Update UI controls to reflect the current editor settings

            // Get the color enabled checkbox if it exists in the DOM
            const colorEnabledCheckbox = document.getElementById('colorEnabled') as HTMLInputElement;
            // Update checkbox state to match editor's colorEnabled option
            if (colorEnabledCheckbox) {
                // Set checked state, defaulting to false if undefined
                colorEnabledCheckbox.checked = options.colorEnabled || false;
            }

            // Get the scale selector dropdown if it exists in the DOM
            const scaleSelector = document.getElementById('scale') as HTMLSelectElement;
            // Update scale selector to match editor's scale option
            if (scaleSelector && options.scale) {
                // Set the dropdown value to match the current scale
                scaleSelector.value = options.scale.toString();
            }
        }
    }

    /**
     * Shows relationship modifiable options by configuring button states
     * @param relationshipInfo - Information about the selected relationship
     */
    public showRelationshipModifiableOptions(relationshipInfo: {
        relationshipId: string,
        sourceRole: string,
        targetRole: string
    }): void {
        const { relationshipId, sourceRole, targetRole } = relationshipInfo;

        // Get references to DOM button elements
        const mainButton: HTMLButtonElement = document.getElementById('tagModifiableBtn') as HTMLButtonElement;
        const optionBtn1: HTMLButtonElement = document.getElementById('modifiableOptionBtn1') as HTMLButtonElement;
        const optionBtn2: HTMLButtonElement = document.getElementById('modifiableOptionBtn2') as HTMLButtonElement;

        // Validate DOM elements
        if (!mainButton || !optionBtn1 || !optionBtn2) {
            console.error('One or more buttons not found in the DOM');
            return;
        }

        // Store relationship ID as data attributes
        optionBtn1.dataset.relationshipId = relationshipId;
        optionBtn2.dataset.relationshipId = relationshipId;

        // Update button states
        this.disableButton('tagModifiableBtn');

        this.enableButton('modifiableOptionBtn1');
        optionBtn1.textContent = sourceRole;

        this.enableButton('modifiableOptionBtn2');
        optionBtn2.textContent = targetRole;
    }

    /**
     * Resets relationship modifiable options after selection
     * @returns The stored relationship ID
     */
    public resetRelationshipModifiableOptions(): string | undefined {
        // Get references to option buttons
        const optionBtn1: HTMLButtonElement = document.getElementById('modifiableOptionBtn1') as HTMLButtonElement;
        const optionBtn2: HTMLButtonElement = document.getElementById('modifiableOptionBtn2') as HTMLButtonElement;

        // Get the stored relationship ID
        const relationshipId = optionBtn1.dataset.relationshipId;

        // Disable option buttons (handling separately since they need text clearing)
        this.disableButton('modifiableOptionBtn1');
        this.disableButton('modifiableOptionBtn2');

        // Clear data attributes
        delete optionBtn1.dataset.relationshipId;
        delete optionBtn2.dataset.relationshipId;

        // Re-enable main button
        this.enableButton('tagModifiableBtn');

        return relationshipId;
    }

    private isQueryPathInProgress(): boolean {
        return this.currentQueryPathBuilder !== null;
    }


    /**
     * Set up listeners for selection change events
     */
    private setupSelectionStateListeners(): void {
        document.addEventListener('apollon:selection-changed', (event: Event) => {
            const customEvent: CustomEvent = event as CustomEvent;
            this.lastSelectionUpdateData = customEvent.detail as LastSelectionUpdateData;
            const { hasClassSelected, hasRelationshipSelected, hasQueryRootSelected, onlyOneThingSelected } = this.lastSelectionUpdateData;

            // Update button states based on selection
            this.updateAllButtonStates(
                hasClassSelected,
                hasRelationshipSelected,
                hasQueryRootSelected,
                this.isQueryPathInProgress(),
                onlyOneThingSelected,
                this.showingQueryShapeBtn
            );
        });
    }

    public getLastSelectionUpdateData(): LastSelectionUpdateData | null {
        return this.lastSelectionUpdateData;
    }

    /**
     * Update all button states based on selection status
     */
    public updateAllButtonStates(
        hasClassSelected: boolean,
        hasRelationshipSelected: boolean,
        hasQueryRootSelected: boolean,
        isQueryPathInProgress: boolean,
        onlyOneThingSelected: boolean,
        showingQueryShapeBtn: boolean
    ): void {
        const state: ButtonState = {
            hasClassSelected,
            hasRelationshipSelected,
            hasQueryRootSelected,
            isQueryPathInProgress,
            onlyOneThingSelected,
            showingQueryShape: showingQueryShapeBtn
        };

        this.updateButtonStates(state);
    }

    /**
     * Update all buttons based on the provided state
     */
    private updateButtonStates(state: ButtonState): void {
        // When showing query shape, only the stop button should be enabled
        if (state.showingQueryShape) {
            this.disableAllButtons();
            this.enableButton('stopShowingQueryShapeBtn');
            return;
        }

        // Class-related buttons
        this.updateButton('instantiableClassBtn',
            state.onlyOneThingSelected &&
            state.hasClassSelected &&
            !state.isQueryPathInProgress);

        this.updateButton('modifiableClassBtn',
            state.onlyOneThingSelected &&
            state.hasClassSelected &&
            !state.isQueryPathInProgress);

        // Relationship-related buttons
        this.updateButton('tagModifiableBtn',
            state.onlyOneThingSelected &&
            state.hasRelationshipSelected &&
            !state.isQueryPathInProgress);

        // Query-related buttons
        this.updateButton('selectQueryRootBtn',
            state.onlyOneThingSelected &&
            state.hasClassSelected &&
            !state.isQueryPathInProgress);

        // Query shape buttons
        this.updateButton('showQueryShapeBtn',
            state.onlyOneThingSelected &&
            state.hasQueryRootSelected &&
            !state.isQueryPathInProgress);

        this.updateButton('stopShowingQueryShapeBtn', false);
    }

    /**
     * Enable or disable a button based on condition
     */
    private updateButton(buttonId: string, shouldEnable: boolean): void {
        if (shouldEnable) {
            this.enableButton(buttonId);
        } else {
            this.disableButton(buttonId);
        }
    }

    /**
     * Disable all buttons
     */
    private disableAllButtons(): void {
        const buttons = [
            'selectQueryRootBtn',
            'addToPathBtn',
            'finishPathBtn',
            'showQueryShapeBtn',
            'instantiableClassBtn',
            'modifiableClassBtn',
            'tagModifiableBtn',
            'modifiableOptionBtn1',
            'modifiableOptionBtn2'
        ];

        buttons.forEach(buttonId => this.disableButton(buttonId));
    }

    /**
     * Enables a button and adds the active class
     * @param buttonId - ID of the button to enable
     * @private
     */
    private enableButton(buttonId: string): void {
        const button: HTMLButtonElement | null = document.getElementById(buttonId) as HTMLButtonElement;
        if (button) {
            button.disabled = false;
            button.removeAttribute('disabled');
            button.classList.add('active');
        }
    }

    /**
     * Disables a button and removes the active class
     * @param buttonId - ID of the button to disable
     * @private
     */
    private disableButton(buttonId: string): void {
        const button: HTMLButtonElement | null = document.getElementById(buttonId) as HTMLButtonElement;
        if (button) {
            button.disabled = true;
            button.setAttribute('disabled', 'true');
            button.classList.remove('active');
        }
    }

    public highlightRelarionships(relationships: Apollon.UMLRelationship[]): void {
        // Call the editor manager to highlight relationships
        const modelManager: ModelManager = this.editorManager.getModelsManager().getGDMManager();

        for (const relationship of relationships) {
            // Highlight the relationship in the GDM editor
            modelManager.changeRelationshipStrokeColor(relationship.id, APP_CONFIG.HIGHLIGHT_COLOR);
        }
    }

    public resetHighlightedRelationships(): void {
        // Call the editor manager to reset highlighted relationships
        const modelManager: ModelManager = this.editorManager.getModelsManager().getGDMManager();

        const allRelationships: Apollon.UMLRelationship[] = Object.values(modelManager.getModel().relationships);

        for (const relationship of allRelationships) {
            // Reset the stroke color of the relationship to its original state
            modelManager.resetRelationshipStrokeColor(relationship.id);
        }
    }
}