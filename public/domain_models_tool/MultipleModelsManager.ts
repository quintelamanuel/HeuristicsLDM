import * as Apollon from '../../src/main';  // Import Apollon core functionality
import ModelManager from './ModelManager/ModelManager';  // Import the ModelManager to handle individual models
import { APP_CONFIG } from './AppConfig';  // Import configuration constants
import { RelationshipEndInfo } from './ModelManager/ModelQueryService';  // Import type definition for relationship endpoints

/**
 * Manages multiple UML models and operations between them.
 * Provides coordination between Global Domain Model (GDM) and Local Domain Model (LDM).
 */
class MultipleModelsManager {
    /**
     * ModelManager for the Global Domain Model (GDM)
     * @private
     */
    private gdmManager: ModelManager;  // Maintains the Global Domain Model state and operations

    /**
     * ModelManager for the Local Domain Model (LDM)
     * @private
     */
    private ldmManager: ModelManager;  // Maintains the Local Domain Model state and operations

    /**
     * Creates a new MultipleModelsManager to manage both GDM and LDM
     * @param gdmStorageKey - localStorage key for the GDM
     * @param ldmStorageKey - localStorage key for the LDM
     */
    constructor(gdmStorageKey: string, ldmStorageKey: string) {
        this.gdmManager = new ModelManager(gdmStorageKey);  // Initialize GDM manager with its storage key
        this.ldmManager = new ModelManager(ldmStorageKey);  // Initialize LDM manager with its storage key
    }

    /**
     * Gets the Global Domain Model (GDM)
     * @returns The current GDM
     */
    getModelGDM(): Apollon.UMLModelCompat {
        return this.gdmManager.getModel();  // Delegate to GDM manager's getModel method
    }

    /**
     * Gets the Local Domain Model (LDM)
     * @returns The current LDM
     */
    getModelLDM(): Apollon.UMLModelCompat {
        return this.ldmManager.getModel();  // Delegate to LDM manager's getModel method
    }

    /**
     * Sets the Global Domain Model (GDM)
     * @param model - The new GDM to set
     */
    setModelGDM(model: Apollon.UMLModelCompat): void {
        this.gdmManager.setModel(model);  // Delegate to GDM manager's setModel method
    }

    /**
     * Sets the Local Domain Model (LDM)
     * @param model - The new LDM to set
     */
    setModelLDM(model: Apollon.UMLModelCompat): void {
        this.ldmManager.setModel(model);  // Delegate to LDM manager's setModel method
    }

    /**
     * Save the GDM to localStorage
     */
    saveGDMToLocalStorage(): void {
        this.gdmManager.saveToLocalStorage();  // Delegate to GDM manager's save method
    }

    /**
     * Save the LDM to localStorage
     */
    saveLDMToLocalStorage(): void {
        this.ldmManager.saveToLocalStorage();  // Delegate to LDM manager's save method
    }

    /**
     * Save both models to localStorage
     */
    saveModelsToLocalStorage(): void {
        this.saveGDMToLocalStorage();  // Save GDM first
        this.saveLDMToLocalStorage();  // Then save LDM
    }

    /**
     * Clear the GDM from localStorage
     */
    clearGDMFromLocalStorage(): void {
        this.gdmManager.clearFromLocalStorage();  // Delegate to GDM manager's clear method
    }

    /**
     * Clear the LDM from localStorage
     */
    clearLDMFromLocalStorage(): void {
        this.ldmManager.clearFromLocalStorage();  // Delegate to LDM manager's clear method
    }

    /**
     * Clear both models from localStorage
     */
    clearModelsFromLocalStorage(): void {
        this.clearGDMFromLocalStorage();  // Clear GDM first
        this.clearLDMFromLocalStorage();  // Then clear LDM
    }

    /**
     * Gets the ModelManager for the Global Domain Model
     * @returns The GDM ModelManager
     */
    getGDMManager(): ModelManager {
        return this.gdmManager;  // Return the GDM manager instance
    }

    /**
     * Gets the ModelManager for the Local Domain Model
     * @returns The LDM ModelManager
     */
    getLDMManager(): ModelManager {
        return this.ldmManager;  // Return the LDM manager instance
    }

    /**
     * Copies a class element and all its properties from GDM to LDM by ID
     * @param id - The ID of the class element to copy
     */
    copyClassifierFromGDMToLDMById(id: string): void {
        // Get the source class element from GDM
        const gdmElement = this.gdmManager.getClassElementById(id);

        if (!gdmElement) {
            console.error(`GDM element with id ${id} not found`);
            return;
        }

        // Copy attributes from GDM to LDM
        const gdmAttributes = this.gdmManager.getClassAttributesById(id);
        if (gdmAttributes) {
            for (const attribute of gdmAttributes) {
                this.ldmManager.addOrUpdateElement(attribute as Apollon.UMLElement);
            }
        }

        // Copy methods from GDM to LDM
        const gdmMethods = this.gdmManager.getClassMethodsById(id);
        if (gdmMethods) {
            for (const method of gdmMethods) {
                this.ldmManager.addOrUpdateElement(method as Apollon.UMLElement);
            }
        }


        // Copy the class element itself to LDM
        this.ldmManager.addOrUpdateElement(gdmElement);
        this.saveModelsToLocalStorage();
    }

    /**
     * Copies a class element and all its properties from GDM to LDM by name
     * @param name - The name of the class element to copy
     */
    copyClassifierFromGDMToLDMByName(name: string): void {
        const gdmElement = this.gdmManager.getClassElementByName(name);

        if (!gdmElement) {
            console.error(`GDM element with name ${name} not found`);
            return;
        }

        // Use the ID-based method now that we have the element
        this.copyClassifierFromGDMToLDMById(gdmElement.id);
    }

    /**
     * Copies a relationship from GDM to LDM by ID
     * @param id - The ID of the relationship to copy
     */
    copyRelationshipFromGDMToLDMById(id: string): void {
        const gdmRelationship: Apollon.UMLAssociation | undefined = this.gdmManager.getRelationshipById(id);

        if (!gdmRelationship) {
            console.error(`GDM relationship with id ${id} not found`);
            return;
        }


        // Make a deep copy of the gdmRelationship
        const gdmRelationshipCopy: Apollon.UMLAssociation = JSON.parse(JSON.stringify(gdmRelationship));
        gdmRelationshipCopy.id = 'ldm' + gdmRelationshipCopy.id; // Ensure the ID is preserved

        gdmRelationshipCopy.strokeColor = APP_CONFIG.DEFAULT_COLORS.STROKE; // Reset the stroke color to default
        // Copy the relationship to LDM
        this.ldmManager.addOrUpdateRelationship(gdmRelationshipCopy);
        this.saveModelsToLocalStorage();
    }

    /**
     * Copies a relationship from GDM to LDM by name
     * @param name - The name of the relationship to copy
     */
    copyRelationshipFromGDMToLDMByName(name: string): void {
        const gdmRelationship: Apollon.UMLAssociation | undefined = this.gdmManager.getRelationshipByName(name);

        if (!gdmRelationship) {
            console.error(`GDM relationship with name ${name} not found`);
            return;
        }

        // Make a deep copy of the gdmRelationship
        const gdmRelationshipCopy: Apollon.UMLAssociation = JSON.parse(JSON.stringify(gdmRelationship));
        gdmRelationshipCopy.id = 'ldm' + gdmRelationshipCopy.id; // Ensure the ID is preserved

        gdmRelationshipCopy.strokeColor = APP_CONFIG.DEFAULT_COLORS.STROKE; // Reset the stroke color to default

        // Copy the relationship to LDM
        this.ldmManager.addOrUpdateRelationship(gdmRelationshipCopy);
        this.saveModelsToLocalStorage();
    }

    /**
     * Updates a relationship in the LDM based on relationship end information from the GDM
     * Updates relationship type (bidirectional/unidirectional) and multiplicity based on available ends
     * 
     * @param relationshipEndInfo - Information about the primary relationship end to update
     * @param requiredRelationshipsEndInfo - Array of all related relationship end information for context
     */
    updateLDMRelationship(relationshipEndInfo: RelationshipEndInfo, requiredRelationshipsEndInfo: RelationshipEndInfo[]): void {
        // The relationships in ldm have a prefix 'ldm' in their id
        const currentLDMRelationship: Apollon.UMLAssociation | undefined = this.ldmManager.getRelationshipById('ldm' + relationshipEndInfo.relationshipId);

        if (!currentLDMRelationship) {
            console.error(`LDM relationship with id ${relationshipEndInfo.relationshipId} not found`);
            return;
        }

        let isBidirectional: boolean = false;
        let oppositeRelationshipEndInfo: RelationshipEndInfo | undefined = undefined;

        // We only need to revise if there are two different ends of the same relationship, confirming it's bidirectional.
        for (const requiredRelationshipEndInfo of requiredRelationshipsEndInfo) {
            const hasSameId: boolean = requiredRelationshipEndInfo.relationshipId === relationshipEndInfo.relationshipId;
            const areDifferentEnds: boolean = requiredRelationshipEndInfo !== relationshipEndInfo;
            if (hasSameId && areDifferentEnds) {
                if (requiredRelationshipEndInfo.sourceClassId !== relationshipEndInfo.sourceClassId) {
                    isBidirectional = true;
                    oppositeRelationshipEndInfo = requiredRelationshipEndInfo;
                    break;
                }
            }
        }

        // If there is only one end, we transform it into a unidirectional relationship with the source and target.
        if (isBidirectional && oppositeRelationshipEndInfo) {

            // If its bidirectional, we get info from the other end and restore it (in case it was previously deleted).
            currentLDMRelationship.type = 'ClassBidirectional';


            const currentLDMRelationshipEndType: 'source' | 'target' = oppositeRelationshipEndInfo.sourceClassId === currentLDMRelationship.source.element ? 'source' : 'target';
            const oppositeLDMRelationshipEndType: 'source' | 'target' = currentLDMRelationshipEndType === 'source' ? 'target' : 'source';

            const lower: number = oppositeRelationshipEndInfo.multiplicity.lower;
            const upper: number = oppositeRelationshipEndInfo.multiplicity.upper;
            const bothBoundsEqual: boolean = lower === upper;
            const zeroToInfinity: boolean = lower === 0 && upper === Number.POSITIVE_INFINITY;

            currentLDMRelationship[oppositeLDMRelationshipEndType].role = oppositeRelationshipEndInfo.roleName;

            switch (true) {
                case bothBoundsEqual:
                    currentLDMRelationship[oppositeLDMRelationshipEndType].multiplicity = lower.toString();
                    break;
                case zeroToInfinity:
                    currentLDMRelationship[oppositeLDMRelationshipEndType].multiplicity = "*";
                    break;
                default:
                    currentLDMRelationship[oppositeLDMRelationshipEndType].multiplicity = lower + ".." + upper;
            }

        } else {
            // If there's only one end, we set the relationship as unidirectional and remove the source end info.
            currentLDMRelationship.type = 'ClassUnidirectional';

            // If the source and target are the same, we need to swap them.
            if (currentLDMRelationship.source.element !== relationshipEndInfo.sourceClassId) {
                const currentSource = currentLDMRelationship.source;
                const currentTarget = currentLDMRelationship.target;
                currentLDMRelationship.source = currentTarget;
                currentLDMRelationship.target = currentSource;

            }

            currentLDMRelationship.source.multiplicity = "";
            currentLDMRelationship.source.role = "";
        }

        this.ldmManager.addOrUpdateRelationship(currentLDMRelationship);
        this.saveModelsToLocalStorage();
    }


    /**
     * Tags a class in the GDM with the specified tag type
     * Adds a stereotype or marker to identify special properties of the class
     * 
     * @param classId - The ID of the class to tag
     * @param tagType - The tag type from APP_CONFIG.TAG_TYPES
     */
    tagClass(classId: string, tagType: string): void {
        // We assume that ModelManager now has a generic tagClass method
        // that takes a class ID and a tag type string
        this.gdmManager.addTagToClass(classId, tagType);
    }

    /**
     * Removes a specific tag from a class in the GDM
     * Undoes a previously applied tag to change class classification
     * 
     * @param classId - The ID of the class to remove the tag from
     * @param tagType - The tag type to remove from APP_CONFIG.TAG_TYPES
     */
    removeClassTag(classId: string, tagType: string): void {
        // We assume that ModelManager now has a generic removeTagFromClass method
        // that takes a class ID and a tag type string
        this.gdmManager.removeClassTag(classId, tagType);
    }

    /**
     * Removes the "PENDING" tag from a class in the GDM
     * Convenience method for a common operation when accepting changes
     * 
     * @param classId - The ID of the class to remove the PENDING tag from
     */
    removeClassTagPending(classId: string): void {
        this.removeClassTag(classId, APP_CONFIG.TAG_TYPES.PENDING);
    }

    /**
     * Tags a relationship end in the GDM with the specified tag type
     * Adds a stereotype or marker to identify special properties of the relationship end
     * 
     * @param relationshipId - The ID of the relationship to tag
     * @param end - The end of the relationship to tag ('source' or 'target')
     * @param tagType - The tag type from APP_CONFIG.TAG_TYPES
     */
    tagRelationshipEnd(relationshipId: string, end: 'source' | 'target', tagType: string): void {
        // We assume that ModelManager now has a generic tagRelationshipEnd method
        // that takes a relationship ID, an end ('source' or 'target'), and a tag type
        this.gdmManager.tagRelationshipEnd(relationshipId, end, tagType);
    }

    /**
     * Changes the stroke color of a relationship in the GDM
     * Used to visually highlight or categorize relationships
     * 
     * @param relationshipId - The ID of the relationship to modify
     * @param rgbColor - The color to set (in RGB format)
     */
    changeRelationshipStrokeColor(relationshipId: string, rgbColor: string): void {
        this.gdmManager.changeRelationshipStrokeColor(relationshipId, rgbColor);
    }

    /**
     * Resets the stroke color of a relationship in the GDM to default
     * Removes custom highlighting from a relationship
     * 
     * @param relationshipId - The ID of the relationship to reset
     */
    resetRelationshipStrokeColor(relationshipId: string): void {
        this.gdmManager.resetRelationshipStrokeColor(relationshipId);
    }

    // Convenience methods for common tagging operations

    /**
     * Tags a class in the GDM as instantiable
     * Marks a class that can be instantiated in the application
     * 
     * @param classId - The ID of the class to tag
     */
    tagClassAsInstantiable(classId: string): void {
        this.tagClass(classId, APP_CONFIG.TAG_TYPES.INSTANTIABLE);
    }

    /**
     * Tags a class in the GDM as modifiable
     * Marks a class that can be modified in the application
     * 
     * @param classId - The ID of the class to tag
     */
    tagClassAsModifiable(classId: string): void {
        this.tagClass(classId, APP_CONFIG.TAG_TYPES.MODIFIABLE);
    }

    /**
     * Tags a class in the GDM as required
     * Marks a class that is required for the application to function
     * 
     * @param classId - The ID of the class to tag
     */
    tagClassAsRequired(classId: string): void {
        this.tagClass(classId, APP_CONFIG.TAG_TYPES.REQUIRED);
    }

    /**
     * Tags a class in the GDM as queried
     * Marks a class that is included in query operations
     * 
     * @param classId - The ID of the class to tag
     */
    tagClassAsQueried(classId: string): void {
        this.tagClass(classId, APP_CONFIG.TAG_TYPES.QUERIED);
    }

    /**
     * Tags a class in the GDM as query root
     * Marks a class that serves as a root for query operations
     * 
     * @param classId - The ID of the class to tag
     */
    tagClassAsQueryRoot(classId: string): void {
        this.tagClass(classId, APP_CONFIG.TAG_TYPES.QUERY_ROOT);
    }

    /**
     * Tags a class in the GDM as pending
     * Marks a class that has changes pending approval
     * 
     * @param classId - The ID of the class to tag
     */
    tagClassAsPending(classId: string): void {
        this.tagClass(classId, APP_CONFIG.TAG_TYPES.PENDING);
    }

    /**
     * Tags a relationship end in the GDM as modifiable
     * Marks a relationship end that can be modified in the application
     * 
     * @param relationshipId - The ID of the relationship to tag
     * @param end - The end of the relationship ('source' or 'target')
     */
    tagRelationshipEndAsModifiable(relationshipId: string, end: 'source' | 'target'): void {
        this.tagRelationshipEnd(relationshipId, end, APP_CONFIG.TAG_TYPES.MODIFIABLE);
    }

    /**
     * Tags a relationship end in the GDM as queried
     * Marks a relationship end that is included in query operations
     * 
     * @param relationshipId - The ID of the relationship to tag
     * @param end - The end of the relationship ('source' or 'target')
     */
    tagRelationshipEndAsQueried(relationshipId: string, end: 'source' | 'target'): void {
        this.tagRelationshipEnd(relationshipId, end, APP_CONFIG.TAG_TYPES.QUERIED);
    }
}

export default MultipleModelsManager;  // Export the class for use in other modules