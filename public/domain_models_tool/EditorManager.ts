/* eslint-disable no-console */
import * as Apollon from '../../src/main';
import ModelManager from './ModelManager/ModelManager';
import { APP_CONFIG } from './AppConfig';
import MultipleModelsManager from './MultipleModelsManager';

// Add at the top of your file with other imports:
declare global {
    interface Window {
        apollon: {
            addToQueryPath: () => void;
            // Add other methods that apollon might have
        }
    }
}

/**
 * Represents the result of an editor operation with success status and optional data or error
 * @template T The type of data returned on success
 */
export type EditorOperationResult<T> = {
    success: boolean;   // Indicates whether the operation succeeded
    data?: T;           // Optional data returned on success
    error?: string;     // Optional error message on failure
};

/**
 * Data structure representing the current selection state to be shared with listeners
 */
export type LastSelectionUpdateData = {
    hasClassSelected: boolean;        // Whether a class element is selected
    hasRelationshipSelected: boolean; // Whether a relationship is selected
    hasQueryRootSelected: boolean;    // Whether a query root element is selected
    selectedElementIds: string[];     // IDs of all selected elements
    selectedRelationshipIds: string[]; // IDs of all selected relationships
    onlyOneThingSelected: boolean; // Whether only one element is selected
    activeEditorId: string;           // ID of the active editor
};

/**
 * EditorManager handles the lifecycle and operations of UML editors.
 * Responsible for creating, configuring, and managing editor instances.
 * Maintains state for multiple editors and provides a unified interface for working with them.
 */
export class EditorManager {
    // CSS class applied to the active editor's container to visually highlight it
    private static readonly CSS_CLASS_ACTIVE_EDITOR = 'active-editor';
    // Event name for selection changes, used to notify subscribers
    private static readonly EVENT_SELECTION_CHANGED = 'apollon:selection-changed';

    // Stores Apollon editor instances by ID for retrieval and lifecycle management
    private editors: Map<string, Apollon.ApollonEditor> = new Map();
    // Stores DOM elements where editors are rendered
    private containers: Map<string, HTMLElement> = new Map();
    // Stores configuration options for each editor to maintain their state
    private options: Map<string, Apollon.ApollonOptions> = new Map();

    // Tracks which editor is currently active (default to GDM as the main editor)
    private activeEditorId: string = APP_CONFIG.EDITOR_IDS.GDM;

    // Selection state flags for UI feedback and action enablement
    private _hasClassSelected: boolean = false;
    private _hasRelationshipSelected: boolean = false;
    private _hasQueryRootSelected: boolean = false;

    // Track selected element and relationship IDs for reference and operations
    private selectedElementIds: string[] = [];
    private selectedRelationshipIds: string[] = [];

    // Cache of selected UML elements for quick access without re-querying
    private selectedElements: Apollon.UMLClassifier[] = [];
    private selectedRelationships: Apollon.UMLRelationship[] = [];

    // Flag for tracking whether a root path selection workflow is in progress
    private isRootPathSelectionInProgress: boolean = false;

    // Flag for tracking whether the same selection is repeated automatically
    private lastOperationWasQueryPath: boolean = false;

    private lastRelationshipSelectedId: string | null = null;

    // Reference to the models manager that contains the actual UML models data
    private modelsManager: MultipleModelsManager;

    /**
     * Creates a new EditorManager instance
     * 
     * @param modelsManager - Manager for UML model data that contains both the GDM and LDM models
     */
    constructor(modelsManager: MultipleModelsManager) {
        // Store the model manager for later use by editor operations
        this.modelsManager = modelsManager;
    }

    public toggleSelectionRepeat(): void {
        // Toggle the selection repeat flag
        this.lastOperationWasQueryPath = !this.lastOperationWasQueryPath;
        // Log the new state for debugging
        console.log(`Selection repeat is now ${this.lastOperationWasQueryPath ? 'enabled' : 'disabled'}`);
    }

    /**
     * Retrieves the models manager instance used by this editor manager
     * 
     * @returns The MultipleModelsManager instance
     */
    public getModelsManager(): MultipleModelsManager {
        // Return the models manager to allow direct operations on the models
        return this.modelsManager;
    }

    /**
     * Indicates whether a class element is currently selected
     * 
     * @returns True if a class element is selected, false otherwise
     */
    public get hasClassSelected(): boolean {
        // Return the private flag that's updated during selection changes
        return this._hasClassSelected;
    }

    /**
     * Indicates whether a relationship is currently selected
     * 
     * @returns True if a relationship is selected, false otherwise
     */
    public get hasRelationshipSelected(): boolean {
        // Return the private flag that's updated during selection changes
        return this._hasRelationshipSelected;
    }

    /**
     * Indicates whether a query root element is currently selected
     * 
     * @returns True if a query root element is selected, false otherwise
     */
    public get hasQueryRootSelected(): boolean {
        // Return the private flag that's updated during selection changes
        return this._hasQueryRootSelected;
    }

    /**
     * Retrieves the IDs of all currently selected elements
     * 
     * @returns A copy of the array of selected element IDs
     */
    public getSelectedElementIds(): string[] {
        // Return a clone of the array to prevent external modification
        return [...this.selectedElementIds];
    }

    /**
     * Retrieves the IDs of all currently selected relationships
     * 
     * @returns A copy of the array of selected relationship IDs
     */
    public getSelectedRelationshipIds(): string[] {
        // Return a clone of the array to prevent external modification
        return [...this.selectedRelationshipIds];
    }

    public setSelectedElementIds(selectedElementIds: string[]): void {
        // Set the selected element IDs to the provided array
        this.selectedElementIds = selectedElementIds;
    }
    public setSelectedRelationshipIds(selectedRelationshipIds: string[]): void {
        // Set the selected relationship IDs to the provided array
        this.selectedRelationshipIds = selectedRelationshipIds;
    }

    /**
     * Initializes the editor manager by setting up DOM containers and editor options
     * Must be called after the DOM is ready and before using other methods
     */
    public initialize(): void {
        // Get DOM container for GDM editor using the ID from config
        this.containers.set(
            APP_CONFIG.EDITOR_IDS.GDM,
            document.getElementById(APP_CONFIG.EDITOR_IDS.GDM)!
        );

        // Get DOM container for LDM editor using the ID from config
        this.containers.set(
            APP_CONFIG.EDITOR_IDS.LDM,
            document.getElementById(APP_CONFIG.EDITOR_IDS.LDM)!
        );

        // Get the initial GDM model from the models manager
        const gdmModel: Apollon.UMLModel = this.modelsManager.getModelGDM() as Apollon.UMLModel;

        // Create and store initial options for GDM editor with default settings
        this.options.set(APP_CONFIG.EDITOR_IDS.GDM, {
            model: gdmModel,                                // Use the retrieved model
            colorEnabled: APP_CONFIG.DEFAULT_OPTIONS.colorEnabled, // Enable color coding
            scale: APP_CONFIG.DEFAULT_OPTIONS.scale,        // Set initial zoom level
        });

        // Get the initial LDM model from the models manager
        const ldmModel: Apollon.UMLModel = this.modelsManager.getModelLDM() as Apollon.UMLModel;

        // Create and store initial options for LDM editor with default settings
        this.options.set(APP_CONFIG.EDITOR_IDS.LDM, {
            model: ldmModel,                                // Use the retrieved model
            colorEnabled: APP_CONFIG.DEFAULT_OPTIONS.colorEnabled, // Enable color coding
            scale: APP_CONFIG.DEFAULT_OPTIONS.scale,        // Set initial zoom level
        });

        // Render both editors with their initial options
        this.renderAll();
    }

    /**
     * Renders all configured editors in their respective containers
     * Creates editor instances and sets up event handlers
     */
    public renderAll(): void {
        // Render the GDM editor
        this.render(APP_CONFIG.EDITOR_IDS.GDM);
        // Render the LDM editor
        this.render(APP_CONFIG.EDITOR_IDS.LDM);
        // Apply visual styling to highlight which editor is active
        this.highlightActiveEditor();
    }

    /**
     * Renders a specific editor identified by its ID
     * Creates a new editor instance and sets up event handlers
     * 
     * @param editorId - ID of the editor to render
     * @returns Operation result indicating success or failure with details
     */
    public render(editorId: string): EditorOperationResult<void> {
        // Get the DOM element where the editor should be rendered
        const container = this.containers.get(editorId);
        // Get the configuration options for this editor
        const options = this.options.get(editorId);

        // Safety check - don't proceed if container or options are missing
        if (!container || !options) {
            // Log the error for debugging
            this.logError('render', `Cannot render editor: missing container or options for ${editorId}`);
            // Return a failure result with explanation
            return { success: false, error: `Missing container or options for ${editorId}` };
        }

        // If an editor instance already exists for this ID, destroy it first
        const existingEditor = this.editors.get(editorId);
        if (existingEditor) {
            // Clean up the existing editor instance to prevent memory leaks and DOM conflicts
            existingEditor.destroy();
        }

        try {
            // Create a fresh editor instance with the container and options
            const editor = new Apollon.ApollonEditor(container, options);
            // Store the new editor instance in the map for future reference
            this.editors.set(editorId, editor);

            // Configure editor event handlers for model updates and selection changes
            this.setupEditorModelDiscreteChangeSubscriptions(editorId, editor);
            this.setupEditorSelectionChangeSubscriptions();
            // Set up mouse click handlers to detect when this editor becomes active
            this.setupClickHandlers(editorId, container);

            // Return success since the editor was created without errors
            return { success: true };
        } catch (error) {
            // Log any errors that occurred during editor creation
            this.logError('render', `Error creating editor: ${error}`);
            // Return a failure result with the error details
            return { success: false, error: String(error) };
        }
    }

    private setupEditorModelDiscreteChangeSubscriptions(editorId: string, editor: Apollon.ApollonEditor): void {

        // Subscribe to model changes to persist them automatically
        editor.subscribeToModelDiscreteChange((model: Apollon.UMLModel) => {
            // When the model changes, update storage and options
            this.handleModelChange(editorId, model);
        });
    }

    private setupEditorSelectionChangeSubscriptions(): void {
        // Always the GDM editor
        const editor = this.editors.get(APP_CONFIG.EDITOR_IDS.GDM)!;
        // Subscribe to selection changes to update internal state
        // Subscribe to selection changes to update internal state
        editor.subscribeToSelectionChange((selection) => {
            // When the selection changes, update internal state and notify listeners
            this.handleSelectionChange(selection);
        });

    }
    /**
     * Handles model changes from an editor by updating storage and options
     * 
     * @param editorId - ID of the editor that changed
     * @param model - The updated UML model
     */
    private handleModelChange(editorId: string, model: Apollon.UMLModel): void {
        // Determine which editor changed and update the appropriate model
        if (editorId === APP_CONFIG.EDITOR_IDS.GDM) {
            // Update the GDM model in the model manager
            this.modelsManager.setModelGDM(model);
            // Save the updated model to localStorage for persistence
            this.modelsManager.saveGDMToLocalStorage();
        } else {
            // Update the LDM model in the model manager
            this.modelsManager.setModelLDM(model);
            // Save the updated model to localStorage for persistence
            this.modelsManager.saveLDMToLocalStorage();
        }

        // Update the editor options with the new model
        const currentOptions = this.options.get(editorId);
        if (currentOptions) {
            // Create a new options object with the updated model
            this.options.set(editorId, { ...currentOptions, model });
        }
    }

    /**
     * Handles selection changes from an editor by updating internal state and notifying listeners
     * 
     * @param editorId - ID of the editor where selection changed
     * @param selection - The new selection state
     */
    private handleSelectionChange(selection: Apollon.Selection): void {
        if (this.lastOperationWasQueryPath) {
            this.lastOperationWasQueryPath = false;
            return;
        }
        // Log selection changes for debugging
        console.log(`Selection Changed:`, selection);

        // Extract selected element IDs from the selection object
        this.selectedElementIds = Object.keys(selection.elements);
        // Extract selected relationship IDs from the selection object
        this.selectedRelationshipIds = Object.keys(selection.relationships);

        // Update internal selection state flags based on what's selected
        this.updateSelectionState(APP_CONFIG.EDITOR_IDS.GDM);
        // Log detailed information about the selected items for debugging
        this.logSelectionDetails();
        // Notify listeners about the selection change via events
        this.emitSelectionChangeEvent();

        console.log("Is root path selection in progress: ", this.isRootPathSelectionInProgress);
        console.log("Selected relationships length: ", this.selectedRelationshipIds.length);
        console.log("Has relationship selected: ", this._hasRelationshipSelected);

        // Only call addToQueryPath when appropriate conditions are met
        if (this.isRootPathSelectionInProgress &&
            this.selectedRelationshipIds.length === 1 &&
            this._hasRelationshipSelected &&
            this.selectedRelationshipIds[0] !== this.lastRelationshipSelectedId) {
            // After reloading the editor another selection event is triggered
            // So in this way we avoid repeating the same selection.
            this.lastRelationshipSelectedId = this.selectedRelationshipIds[0];
            // This will be handled by the queryShapeController which has proper validation
            this.lastOperationWasQueryPath = true;

            // If called directly there are problems with the rendering of the editors and tags get missed.
            // Making it async through a setTimeout solves the problem.
            setTimeout(() => {
                // apollon is a global variable in index.html
                window.apollon.addToQueryPath();
            }, 0);

        }
    }

    /**
     * Logs detailed information about selected elements and relationships
     * Used for debugging and development purposes
     */
    private logSelectionDetails(): void {
        // Log information about each selected element
        for (const id of this.selectedElementIds) {
            // Show element ID and type for debugging
            console.log(`Selected element ID: ${id} of type ${this.modelsManager.getGDMManager().getUMLTypeById(id)}`);
        }

        // Log information about each selected relationship
        for (const id of this.selectedRelationshipIds) {
            // Show relationship ID and type for debugging
            console.log(`Selected relationship ID: ${id} of type ${this.modelsManager.getGDMManager().getUMLTypeById(id)}`);
        }

        // For each selected element, also show its outgoing relationships
        for (const id of this.selectedElementIds) {
            // Get all outgoing associations for this element
            const relationships = this.modelsManager.getGDMManager().getClassOutgoingAssociationsById(id);
            // Log the relationships for debugging purposes
            console.log(`Outgoing relationships for selected class ID: ${id}`, relationships);
        }
    }

    /**
     * Emits a custom event to notify listeners about selection changes
     * Includes detailed information about the current selection state
     */
    private emitSelectionChangeEvent(): void {
        // Prepare a data object with all selection information
        const selectionState: LastSelectionUpdateData = {
            hasClassSelected: this._hasClassSelected,           // Whether a class is selected
            hasRelationshipSelected: this._hasRelationshipSelected, // Whether a relationship is selected
            hasQueryRootSelected: this._hasQueryRootSelected,   // Whether a query root is selected
            selectedElementIds: [...this.selectedElementIds],   // IDs of selected elements
            selectedRelationshipIds: [...this.selectedRelationshipIds], // IDs of selected relationships
            onlyOneThingSelected: (this.selectedElementIds.length + this.selectedRelationshipIds.length) === 1, // Whether more than one element is selected
            activeEditorId: this.activeEditorId                 // Which editor is active
        };

        // Create a custom event with the selection data
        const event = new CustomEvent(EditorManager.EVENT_SELECTION_CHANGED, {
            detail: selectionState,  // Include the selection data
            bubbles: true            // Allow event to bubble up DOM tree
        });

        //Always the GDM editor
        const container = this.containers.get(APP_CONFIG.EDITOR_IDS.GDM)!;

        container.dispatchEvent(event);
    }

    /**
     * Updates internal selection state flags based on the current selection
     * These flags are used to enable/disable UI actions based on what's selected
     * 
     * @param editorId - ID of the editor whose selection changed
     */
    private updateSelectionState(editorId: string): void {
        // Reset all selection flags at the start to avoid stale state
        this._hasClassSelected = false;
        this._hasRelationshipSelected = false;
        this._hasQueryRootSelected = false;

        // Get the appropriate model manager based on which editor was updated
        const modelManager = editorId === APP_CONFIG.EDITOR_IDS.GDM
            ? this.modelsManager.getGDMManager()  // Use GDM manager if GDM editor
            : this.modelsManager.getLDMManager(); // Use LDM manager if LDM editor

        // Early return if nothing is selected to avoid unnecessary processing
        if (this.selectedElementIds.length === 0 && this.selectedRelationshipIds.length === 0) {
            return;
        }

        // Create arrays to store the selected elements and relationships
        const selectedElements: Apollon.UMLClassifier[] = [];
        const selectedRelationships: Apollon.UMLRelationship[] = [];

        // Process each selected element
        for (const elementId of this.selectedElementIds) {
            // Get the element details from the model manager
            const element = this.modelsManager.getGDMManager().getClassElementById(elementId);

            // Skip if the element wasn't found in the model
            if (!element) continue;

            // Add the element to our collection for later reference
            selectedElements.push(element);
            // Get the element's UML type to determine what's selected
            const elementType = element.type;

            // Check if it's a class element
            if (elementType === Apollon.UMLElementType.Class) {
                // Set flag to indicate a class is selected (enables class-specific actions)
                this._hasClassSelected = true;

                // Check if this class is tagged as a query root
                if (modelManager.isClassTaggedAs(elementId, APP_CONFIG.TAG_TYPES.QUERY_ROOT)) {
                    // Set flag to indicate a query root is selected (enables query root actions)
                    this._hasQueryRootSelected = true;
                }
            }
        }

        // Set relationship flag only when EXACTLY ONE relationship is selected
        // This is important for relationship operations that require exactly one target
        this._hasRelationshipSelected = this.selectedRelationshipIds.length === 1;

        // Early return if no relationships are selected
        if (this.selectedRelationshipIds.length === 0) {
            return;
        }

        // Process each selected relationship
        for (const relationshipId of this.selectedRelationshipIds) {
            // Get the relationship details from the model manager
            const relationship = modelManager.getRelationshipById(relationshipId);
            // Add the relationship to our collection if found
            if (relationship) {
                selectedRelationships.push(relationship);
            }
        }
    }

    /**
     * Sets up click handlers on editor containers to activate the editor when clicked
     * 
     * @param editorId - ID of the editor being configured
     * @param container - DOM container for the editor
     */
    private setupClickHandlers(editorId: string, container: HTMLElement): void {
        // Set click handler to make this editor the active one when its container is clicked
        container.onclick = () => this.setActiveEditor(editorId);
    }

    /**
     * Sets the active editor and updates the UI to reflect the change
     * 
     * @param editorId - ID of the editor to set as active
     * @returns This instance for method chaining
     */
    public setActiveEditor(editorId: string): EditorManager {
        // Update the active editor ID
        this.activeEditorId = editorId;
        // Update visual styling to indicate which editor is active
        this.highlightActiveEditor();
        // Return this instance for method chaining
        return this;
    }

    /**
     * Updates the visual styling of editor containers to highlight the active one
     * Adds a CSS class to the active editor container and removes it from others
     */
    private highlightActiveEditor(): void {
        // Iterate through all editor containers
        for (const [id, container] of this.containers.entries()) {
            // Toggle the active class based on whether this is the active editor
            // Add class if active, remove if not
            container.classList.toggle(EditorManager.CSS_CLASS_ACTIVE_EDITOR, id === this.activeEditorId);
        }
    }

    /**
     * Executes an action on a specific editor with error handling
     * Abstracts error handling and editor lookup for reuse across methods
     * 
     * @param editorId - ID of the editor to act on
     * @param action - Function to execute with the editor instance
     * @returns Result of the operation with success status and data or error
     */
    private executeEditorAction<T>(editorId: string, action: (editor: Apollon.ApollonEditor) => T): EditorOperationResult<T> {
        // Get the editor instance by ID
        const editor = this.editors.get(editorId);

        // Return error if editor not found
        if (!editor) {
            return { success: false, error: `Editor with ID ${editorId} not found` };
        }

        try {
            // Execute the provided action with the editor instance
            const result = action(editor);
            // Return success result with the action's return value
            return { success: true, data: result };
        } catch (error) {
            // Log any errors that occur during action execution
            this.logError('executeEditorAction', String(error));
            // Return failure result with error message
            return { success: false, error: String(error) };
        }
    }

    /**
     * Retrieves the active editor, its options, and ID
     * 
     * @returns Object containing the active editor, its options, and ID
     */
    public getActiveEditor(): {
        editor: Apollon.ApollonEditor | undefined,
        options: Apollon.ApollonOptions | undefined,
        editorId: string
    } {
        return {
            // Get the editor instance for the active editor
            editor: this.editors.get(this.activeEditorId),
            // Get the options for the active editor
            options: this.options.get(this.activeEditorId),
            // Include the active editor ID for reference
            editorId: this.activeEditorId
        };
    }

    /**
     * Retrieves an editor instance by its ID
     * 
     * @param editorId - ID of the editor to retrieve
     * @returns The editor instance if found, undefined otherwise
     */
    public getEditor(editorId: string): Apollon.ApollonEditor | undefined {
        // Return the editor instance from the map if it exists
        return this.editors.get(editorId);
    }

    /**
     * Updates the options for a specific editor
     * 
     * @param editorId - ID of the editor to update
     * @param newOptions - New options to apply (partial options allowed)
     * @returns This instance for method chaining
     */
    public updateOptions(editorId: string, newOptions: Partial<Apollon.ApollonOptions>): EditorManager {
        // Get the current options for the specified editor
        const currentOptions = this.options.get(editorId);

        // Only update if we found existing options
        if (currentOptions) {
            // Merge current options with new options (new options override existing)
            this.options.set(editorId, { ...currentOptions, ...newOptions });
        }

        // Return this instance for method chaining
        return this;
    }

    /**
     * Updates the options for the currently active editor
     * Convenience method that delegates to updateOptions
     * 
     * @param newOptions - New options to apply to the active editor
     * @returns This instance for method chaining
     */
    public updateActiveOptions(newOptions: Partial<Apollon.ApollonOptions>): EditorManager {
        // Delegate to updateOptions using the active editor ID
        return this.updateOptions(this.activeEditorId, newOptions);
    }

    /**
     * Saves the model from the active editor to storage
     * 
     * @returns Result of the save operation with updated options on success
     */
    public saveActiveModel(): EditorOperationResult<Apollon.ApollonOptions> {
        // Get the active editor, its options, and ID
        const { editor, editorId } = this.getActiveEditor();

        // Return error if no active editor exists
        if (!editor) {
            return { success: false, error: 'No active editor found' };
        }

        // Get the current model from the editor
        const model = editor.model;

        // Determine which storage to use based on the active editor
        if (editorId === APP_CONFIG.EDITOR_IDS.GDM) {
            // Update the GDM model in the model manager
            this.modelsManager.setModelGDM(model);
            // Save to local storage for persistence across sessions
            this.modelsManager.saveGDMToLocalStorage();
        } else {
            // Update the LDM model in the model manager
            this.modelsManager.setModelLDM(model);
            // Save to local storage for persistence across sessions
            this.modelsManager.saveLDMToLocalStorage();
        }

        // Get the current options for the active editor
        const currentOptions = this.options.get(editorId);
        // Return error if options not found (should never happen if editor exists)
        if (!currentOptions) {
            return { success: false, error: 'Could not find options for active editor' };
        }

        // Create updated options with the latest model
        const updatedOptions = { ...currentOptions, model };
        // Store updated options for future reference
        this.options.set(editorId, updatedOptions);

        // Return success with the updated options
        return { success: true, data: updatedOptions };
    }

    /**
     * Clears the active editor's model in storage and resets it to an empty model
     * 
     * @returns This instance for method chaining
     */
    public clearActiveModel(): EditorManager {
        // Determine which editor is active and clear the appropriate model
        if (this.activeEditorId === APP_CONFIG.EDITOR_IDS.GDM) {
            // Clear the GDM model from storage
            this.modelsManager.clearGDMFromLocalStorage();
            // Get a fresh empty GDM model
            const gdmModel: Apollon.UMLModel = this.modelsManager.getModelGDM() as Apollon.UMLModel;



            // Update the editor options with the empty model
            this.updateOptions(this.activeEditorId, { model: gdmModel });
        } else {
            // Clear the LDM model from storage
            this.modelsManager.clearLDMFromLocalStorage();
            // Get a fresh empty LDM model
            const ldmModel: Apollon.UMLModel = this.modelsManager.getModelLDM() as Apollon.UMLModel;
            // Update the editor options with the empty model
            this.updateOptions(this.activeEditorId, { model: ldmModel });
        }

        // Re-render the active editor to display the empty model
        this.render(this.activeEditorId);
        // Return this instance for method chaining
        return this;
    }

    /**
     * Clears the inactive editor's model in storage and resets it to an empty model
     * 
     * @returns This instance for method chaining
     */
    public clearInactiveModel(): EditorManager {
        // Determine which editor is inactive (the opposite of the active one)
        const inactiveEditorId = this.activeEditorId === APP_CONFIG.EDITOR_IDS.GDM
            ? APP_CONFIG.EDITOR_IDS.LDM
            : APP_CONFIG.EDITOR_IDS.GDM;

        // Clear the appropriate model based on which editor is inactive
        if (inactiveEditorId === APP_CONFIG.EDITOR_IDS.GDM) {
            // Clear the GDM model from storage
            this.modelsManager.clearGDMFromLocalStorage();
            // Get a fresh empty GDM model
            const gdmModel: Apollon.UMLModel = this.modelsManager.getModelGDM() as Apollon.UMLModel;
            // Update the editor options with the empty model
            this.updateOptions(inactiveEditorId, { model: gdmModel });
        } else {
            // Clear the LDM model from storage
            this.modelsManager.clearLDMFromLocalStorage();
            // Get a fresh empty LDM model
            const ldmModel: Apollon.UMLModel = this.modelsManager.getModelLDM() as Apollon.UMLModel;
            // Update the editor options with the empty model
            this.updateOptions(inactiveEditorId, { model: ldmModel });
        }

        // Re-render the inactive editor to display the empty model
        this.render(inactiveEditorId);
        // Return this instance for method chaining
        return this;
    }

    /**
     * Retrieves the current selection state from an editor
     * 
     * @param editorId - ID of the editor to get selection from (defaults to active)
     * @returns The current selection state or undefined if editor doesn't exist
     */
    public getSelection(editorId?: string): Apollon.Selection | undefined {

        // Get always the GDM editor
        const editor = this.editors.get(APP_CONFIG.EDITOR_IDS.GDM);
        // Return the selection if editor exists, undefined otherwise
        return editor?.selection;
    }

    /**
     * Retrieves the ID of the currently active editor
     * 
     * @returns The ID of the active editor
     */
    public getActiveEditorId(): string {
        // Return the active editor ID for external reference
        return this.activeEditorId;
    }

    /**
     * Retrieves the IDs of all editors managed by this instance
     * 
     * @returns Array of editor IDs
     */
    public getEditorIds(): string[] {
        // Get the keys from the editors map as an array
        return Array.from(this.editors.keys());
    }

    /**
     * Checks whether root path selection is currently in progress
     * Used to coordinate UI state during path selection workflows
     * 
     * @returns Whether root path selection is in progress
     */
    public getIsRootPathSelectionInProgress(): boolean {
        // Return the flag for root path selection
        return this.isRootPathSelectionInProgress;
    }

    /**
     * Sets whether root path selection is in progress
     * Used to coordinate UI state during path selection workflows
     * 
     * @param isInProgress - New state for root path selection
     * @returns This instance for method chaining
     */
    public setIsRootPathSelectionInProgress(isInProgress: boolean): EditorManager {
        // Update the root path selection flag
        this.isRootPathSelectionInProgress = isInProgress;
        // Return this instance for method chaining
        return this;
    }

    /**
     * Logs an error message with consistent formatting for debugging
     * 
     * @param method - Name of the method where the error occurred
     * @param message - Error message to log
     */
    private logError(method: string, message: string): void {
        // Log with consistent format including class and method name for easy filtering
        console.error(`[EditorManager.${method}] ${message}`);
    }
}