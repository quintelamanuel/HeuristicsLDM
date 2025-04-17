import * as Apollon from '../../../src/main';
import * as storage from '../ModelStorage';

/**
 * Central storage for the UML model with basic access methods.
 * Responsible for managing the lifecycle of the model data including:
 * - Loading from storage
 * - Saving to storage
 * - Providing controlled access to the model
 * - Managing model updates
 */
class ModelRepositoryService {
    /**
     * The current UML model instance
     * This is the central source of truth for the application
     */
    private model: Apollon.UMLModelCompat;

    /**
     * The key used to store and retrieve the model from localStorage
     * This allows multiple models to be stored with different keys
     */
    private localStorageKey: string;

    /**
     * Creates a new ModelRepositoryService instance
     * 
     * @param localStorageKey - The key used to store and retrieve the model from localStorage
     * @param initialModel - Optional initial model. If provided, it will be used instead of loading from storage
     */
    constructor(localStorageKey: string, initialModel?: Apollon.UMLModelCompat) {
        // Store the localStorage key for future save/load operations
        this.localStorageKey = localStorageKey;

        if (initialModel) {
            // Use the provided initialModel if available
            // This is useful for testing or when creating a new model programmatically
            this.model = initialModel;
        } else {
            // Try to load an existing model from localStorage
            const storedModel = storage.getModelFromLocalStorage(localStorageKey);

            // If a model exists in storage, use it; otherwise create a new empty model
            // This ensures we always have a valid model instance
            this.model = storedModel || this.getEmptyModel();
        }
    }

    /**
     * Returns the current model instance
     * 
     * @returns The current UML model
     * 
     * Note: While this returns the actual model object (not a copy),
     * consumers should treat it as read-only and use updateModel()
     * for any modifications to ensure proper change tracking and persistence.
     */
    getModel(): Apollon.UMLModelCompat {
        // Return the model instance
        // Callers should respect the contract and not modify it directly
        return this.model;
    }

    /**
     * Replaces the entire model with a new instance
     * 
     * @param model - The new model that will replace the current one
     * 
     * This should be used sparingly, typically only when loading a completely new diagram
     * or when undoing a series of operations.
     */
    setModel(model: Apollon.UMLModelCompat): void {
        // Replace the current model with the new one
        // This is a destructive operation that discards the previous model entirely
        this.model = model;
    }

    /**
     * Performs an update operation on the model and automatically saves the result
     * 
     * @param updateFunction - A function that will receive the model and modify it
     * 
     * This is the preferred way to make changes to the model as it:
     * 1. Provides a consistent interface for modifications
     * 2. Ensures changes are persisted to storage
     * 3. Can be extended to add change tracking, events, etc.
     */
    updateModel(updateFunction: (model: Apollon.UMLModelCompat) => void): void {
        // Execute the provided update function, passing it the current model
        // The function is expected to modify the model in-place
        updateFunction(this.model);

        // After the model is updated, automatically save it to storage
        // This ensures changes are persisted and not lost
        this.saveToStorage();
    }

    /**
     * Saves the current model to localStorage
     * 
     * This method is typically called automatically after model updates,
     * but can be called manually to force a save.
     */
    saveToStorage(): void {
        // Delegate to the storage module to handle the serialization and saving
        // This keeps the storage implementation details separate from this class
        storage.addModelToLocalStorage(this.localStorageKey, this.model);
    }

    /**
     * Clears the model from localStorage and resets to an empty model
     * 
     * This effectively starts a new, blank diagram.
     */
    clearStorage(): void {
        // First remove the model from localStorage to free up space
        // and ensure we don't load it again on refresh
        storage.removeModelFromLocalStorage(this.localStorageKey);

        // Then reset the current model to a new empty model
        // This allows continued use without having to create a new repository
        this.model = this.getEmptyModel();
    }

    /**
     * Creates an empty UML model with default settings
     * 
     * @returns A new empty UML model instance
     * 
     * This is used when no existing model is found in storage or
     * when explicitly clearing the current model.
     * @private
     */
    private getEmptyModel(): Apollon.UMLModelCompat {
        // Return a minimal valid model structure with required properties
        return {
            // The version of the Apollon format being used
            version: '3.0.0',

            // The type of diagram (we're working with class diagrams)
            type: 'ClassDiagram',

            // Default canvas size (will be adjusted as elements are added)
            size: { width: 0, height: 0 },

            // Empty dictionary to store UML elements (classes, interfaces, etc.)
            elements: {},

            // Container for interactive state information (selection, etc.)
            interactive: { elements: {}, relationships: {} },

            // Empty dictionary to store relationships between elements
            relationships: {},

            // Container for assessment information (feedback, scoring, etc.)
            assessments: {},
        };
    }
}

export default ModelRepositoryService;