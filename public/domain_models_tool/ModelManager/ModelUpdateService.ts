/* eslint-disable no-console */
import * as Apollon from '../../../src/main';
import * as helpers from '../../../src/main/compat/helpers';
import { APP_CONFIG } from '../AppConfig';
import ModelRepositoryService from './ModelRepositoryService';
import ModelQueryService from './ModelQueryService';

// Define a type alias for the tag types to make code more readable
// This creates a union type of all possible tag types from the APP_CONFIG
type TagType = typeof APP_CONFIG.TAG_TYPES[keyof typeof APP_CONFIG.TAG_TYPES];

/**
 * Service for all operations that modify the UML model.
 * This class is responsible for all write operations on the model.
 * It uses ModelQueryService for reading data and ModelRepositoryService for persistence.
 * All model modifications should be performed through this service to ensure consistency.
 */
class ModelUpdateService {
    /**
     * Maps tag types to their corresponding colors for consistent styling
     * This allows us to visually distinguish different types of tags in the model
     */
    private tagColorMap: Record<TagType, string> = {
        [APP_CONFIG.TAG_TYPES.INSTANTIABLE]: APP_CONFIG.TAG_COLORS.INSTANTIABLE,
        [APP_CONFIG.TAG_TYPES.MODIFIABLE]: APP_CONFIG.TAG_COLORS.MODIFIABLE,
        [APP_CONFIG.TAG_TYPES.REQUIRED]: APP_CONFIG.TAG_COLORS.REQUIRED,
        [APP_CONFIG.TAG_TYPES.QUERIED]: APP_CONFIG.TAG_COLORS.QUERIED,
        [APP_CONFIG.TAG_TYPES.QUERY_ROOT]: APP_CONFIG.TAG_COLORS.QUERY_ROOT,
        [APP_CONFIG.TAG_TYPES.PENDING]: APP_CONFIG.TAG_COLORS.PENDING
    };

    /**
     * Reference to the repository service for accessing and updating the model
     */
    private modelRepositoryService: ModelRepositoryService;

    /**
     * Reference to the query service for retrieving information from the model
     */
    private modelQueryService: ModelQueryService;

    /**
     * Creates a new ModelUpdateService instance
     * 
     * @param modelRepositoryService - The repository service for model persistence
     * @param modelQueryService - The query service for retrieving model information
     */
    constructor(modelRepositoryService: ModelRepositoryService, modelQueryService: ModelQueryService) {
        // Store references to the provided services for later use
        this.modelRepositoryService = modelRepositoryService;
        this.modelQueryService = modelQueryService;
    }

    // ELEMENT COMMANDS

    /**
     * Adds or updates an element in the model
     * If the element already exists, it will be updated; otherwise, it will be added
     * 
     * @param element - The UML element to add or update
     */
    addOrUpdateElement(element: Apollon.UMLElement): void {
        // Use the repository's updateModel method to modify the model
        // This ensures all changes are properly tracked and persisted
        this.modelRepositoryService.updateModel(model => {
            // Use the helpers utility to handle the element update logic
            // This ensures we follow the correct procedure for updating the model structure
            helpers.addOrUpdateElement(model, element);
        });
    }

    // RELATIONSHIP COMMANDS

    /**
     * Adds or updates a relationship in the model
     * If the relationship already exists, it will be updated; otherwise, it will be added
     * 
     * @param relationship - The UML relationship to add or update
     */
    addOrUpdateRelationship(relationship: Apollon.UMLRelationship): void {
        // Use the repository's updateModel method to modify the model
        // This ensures all changes are properly tracked and persisted
        this.modelRepositoryService.updateModel(model => {
            // Use the helpers utility to handle the relationship update logic
            // This ensures we follow the correct procedure for updating the model structure
            helpers.addOrUpdateRelationship(model, relationship);
        });
    }

    /**
     * Appends text to a relationship end's role name
     * This is commonly used to add tags or other notations to relationship ends
     * 
     * @param relationshipId - The ID of the relationship to modify
     * @param end - Which end of the relationship to modify ('source' or 'target')
     * @param text - The text to append to the role name
     */
    appendToRelationshipEndRole(relationshipId: string, end: 'source' | 'target', text: string): void {
        // First, verify that the relationship exists using the query service
        // This prevents attempts to modify non-existent relationships
        const relationship = this.modelQueryService.getRelationshipById(relationshipId);
        if (!relationship) {
            // If the relationship doesn't exist, log an error and return early
            // This prevents further processing that would fail
            console.error(`Cannot append to relationship: Relationship with id ${relationshipId} not found in model`);
            return;
        }

        // Use the repository's updateModel method to modify the model
        // This ensures all changes are properly tracked and persisted
        this.modelRepositoryService.updateModel(model => {
            // Find the relationship in the model
            // We need to get a reference to the actual object in the model to modify it
            const rel = helpers.findRelationship(model, relationshipId) as Apollon.UMLAssociation;
            if (rel) {
                // Determine which end to update and append the text to its role name
                if (end === 'source') {
                    // For the source end, update the source.role property
                    rel.source.role += text;
                } else {
                    // For the target end, update the target.role property
                    rel.target.role += text;
                }
            }
            // If the relationship couldn't be found in the model, no action is taken
            // This is a safeguard in case the model changed between the initial check and the update
        });
    }

    /**
     * Changes the stroke color of a relationship
     * This is often used to highlight relationships for emphasis or to indicate special status
     * 
     * @param relationshipId - The ID of the relationship to modify
     * @param rgbColor - The RGB color string to set as the stroke color
     */
    changeRelationshipStrokeColor(relationshipId: string, rgbColor: string): void {
        // First, verify that the relationship exists using the query service
        // This prevents attempts to modify non-existent relationships
        const relationship = this.modelQueryService.getRelationshipById(relationshipId);
        if (!relationship) {
            // If the relationship doesn't exist, log an error and return early
            // This prevents further processing that would fail
            console.error(`Cannot highlight relationship: Relationship with id ${relationshipId} not found in model`);
            return;
        }

        // Use the repository's updateModel method to modify the model
        // This ensures all changes are properly tracked and persisted
        this.modelRepositoryService.updateModel(model => {
            // Find the relationship in the model
            // We need to get a reference to the actual object in the model to modify it
            const rel = helpers.findRelationship(model, relationshipId);
            if (rel) {
                // Update the stroke color to the provided RGB color
                // This will change how the relationship is rendered visually
                rel.strokeColor = rgbColor;
            }
            // If the relationship couldn't be found in the model, no action is taken
            // This is a safeguard in case the model changed between the initial check and the update
        });
    }

    /**
     * Resets the stroke color of a relationship to the default color
     * This is useful after temporary highlighting is no longer needed
     * 
     * @param relationshipId - The ID of the relationship to reset
     */
    resetRelationshipStrokeColor(relationshipId: string): void {
        // First, verify that the relationship exists using the query service
        // This prevents attempts to modify non-existent relationships
        const relationship = this.modelQueryService.getRelationshipById(relationshipId);
        if (!relationship) {
            // If the relationship doesn't exist, log an error and return early
            // This prevents further processing that would fail
            console.error(`Cannot reset color: Relationship with id ${relationshipId} not found in model`);
            return;
        }

        // Use the repository's updateModel method to modify the model
        // This ensures all changes are properly tracked and persisted
        this.modelRepositoryService.updateModel(model => {
            // Find the relationship in the model
            // We need to get a reference to the actual object in the model to modify it
            const rel = helpers.findRelationship(model, relationshipId);
            if (rel) {
                // Reset the stroke color to the default stroke color from the app configuration
                // This returns the relationship to its standard visual appearance
                rel.strokeColor = APP_CONFIG.DEFAULT_COLORS.STROKE;
            }
            // If the relationship couldn't be found in the model, no action is taken
            // This is a safeguard in case the model changed between the initial check and the update
        });
    }

    // TAG COMMANDS

    /**
     * Gets the color for a specific tag type
     * This ensures consistent coloring across all tags of the same type
     * 
     * @param tagType - The type of tag to get the color for
     * @returns The color associated with the tag type, or a default color if not found
     * @private
     */
    private getTagColor(tagType: TagType): string {
        // Look up the color in the tag color map using the tag type as the key
        // If no color is defined for this tag type, fall back to the default color
        // This ensures we always have a valid color even for unexpected tag types
        return this.tagColorMap[tagType] || APP_CONFIG.TAG_COLORS.DEFAULT;
    }

    /**
     * Adds a tag to a class
     * Tags are implemented as attributes with specific names and colors
     * 
     * @param classId - The ID of the class to tag
     * @param tagType - The type of tag to add
     */
    addTagToClass(classId: string, tagType: TagType): void {
        // First, check if the class already has this tag to prevent duplicates
        // Tags should only be applied once to a class
        if (this.modelQueryService.isClassTaggedAs(classId, tagType)) {
            // If already tagged, log a message and return early
            // This prevents creating duplicate tag attributes
            console.log(`Cannot add attribute: Class with id ${classId} already tagged with ${tagType}`);
            return;
        }

        // Verify that the class exists using the query service
        // This prevents attempts to tag non-existent classes
        const classElement = this.modelQueryService.getClassElementById(classId);
        if (!classElement) {
            // If the class doesn't exist, log an error and return early
            // This prevents further processing that would fail
            console.error(`Cannot add attribute: Class with id ${classId} not found in model`);
            return;
        }

        // Create a unique ID for the new attribute
        // Using the classId and current timestamp ensures uniqueness
        const attributeId = `${classId}_attr_${Date.now()}`;

        // Get the appropriate color for this tag type
        // This ensures visual consistency for tags of the same type
        const fillColor = this.getTagColor(tagType);

        // Create the attribute element that will represent the tag
        // This includes all necessary properties for an attribute in the UML model
        const attributeElement: Apollon.UMLModelElement = {
            id: attributeId,               // Unique identifier for the attribute
            name: tagType,                 // The name of the attribute is the tag type itself
            type: 'ClassAttribute',        // This is a class attribute element type
            owner: classId,                // Link the attribute to its owning class
            bounds: { x: 0, y: 0, width: 159, height: 30 }, // Default size and position
            fillColor: fillColor,          // Use the tag-specific color for the background
            strokeColor: APP_CONFIG.DEFAULT_COLORS.STROKE, // Use default stroke color
            textColor: APP_CONFIG.DEFAULT_COLORS.TEXT,     // Use default text color
        };

        // Use the repository's updateModel method to modify the model
        // This ensures all changes are properly tracked and persisted
        this.modelRepositoryService.updateModel(model => {
            // Add the new attribute element to the model
            // This makes the attribute part of the model data structure
            helpers.addOrUpdateElement(model, attributeElement as Apollon.UMLElement);

            // Find the class in the model and update its attributes list
            // We need to work with the actual class object in the model, not our cached reference
            const cls = helpers.findElement(model, classId) as Apollon.UMLClassifier;
            if (cls) {
                // Initialize the attributes array if it doesn't exist
                // This handles the case where the class doesn't have any attributes yet
                if (!cls.attributes) cls.attributes = [];

                // Add the new attribute's ID to the class's attributes array
                // This creates the link between the class and its new attribute
                cls.attributes.push(attributeId);

                // Update the class element in the model with the modified attributes array
                // This ensures the changes are properly saved in the model
                helpers.addOrUpdateElement(model, cls);
            }
            // If the class couldn't be found in the model, no action is taken
            // This is a safeguard in case the model changed between the initial check and the update
        });
    }

    /**
     * Tags a class with a specific tag type
     * This is an alias for addTagToClass for more intuitive API usage
     * 
     * @param classId - The ID of the class to tag
     * @param tagType - The type of tag to add
     */
    tagClass(classId: string, tagType: TagType): void {
        // Simply delegate to the addTagToClass method
        // This provides a more semantically meaningful method name for the operation
        this.addTagToClass(classId, tagType);
    }

    /**
     * Tags a relationship end with a specific tag type
     * For relationships, tags are added to the role text of an end
     * 
     * @param relationshipId - The ID of the relationship to tag
     * @param end - Which end of the relationship to tag ('source' or 'target')
     * @param tagType - The type of tag to add
     */
    tagRelationshipEnd(relationshipId: string, end: 'source' | 'target', tagType: TagType): void {
        // First, check if the relationship end already has this tag to prevent duplicates
        // Tags should only be applied once to a relationship end
        if (this.modelQueryService.hasRelationshipEndTag(relationshipId, end, tagType)) {
            // If already tagged, log an error and return early
            // This prevents creating duplicate tag text in the role
            console.error(`Cannot tag relationship: Relationship end ${end} with id ${relationshipId} already tagged with ${tagType}`);
            return;
        }

        // Verify that the relationship exists using the query service
        // This prevents attempts to tag non-existent relationships
        const relationship = this.modelQueryService.getRelationshipById(relationshipId);
        if (!relationship) {
            // If the relationship doesn't exist, log an error and return early
            // This prevents further processing that would fail
            console.error(`Cannot tag relationship: Relationship with id ${relationshipId} not found in model`);
            return;
        }

        // Get the ID of the class at the specified end of the relationship
        // This is needed to verify that the class exists before tagging
        const endElementId = end === 'source' ? relationship.source.element : relationship.target.element;

        // Verify that the class at the relationship end exists
        // If the class doesn't exist, we shouldn't tag the relationship end
        const classElement = this.modelQueryService.getClassElementById(endElementId);
        if (!classElement) {
            // If the class doesn't exist, log an error and return early
            // This prevents tagging a relationship end that points to a non-existent class
            console.error(`Cannot tag relationship: Class with id ${endElementId} not found in model`);
            return;
        }

        // Add the tag to the relationship end by appending the tag text to the role
        // This is the actual operation that applies the tag
        this.appendToRelationshipEndRole(relationshipId, end, tagType);
    }

    /**
     * Removes a tag from a class
     * This deletes the attribute that represents the tag
     * 
     * @param classId - The ID of the class to remove the tag from
     * @param tagType - The type of tag to remove
     */
    removeClassTag(classId: string, tagType: TagType): void {
        // First, verify that the class exists using the query service
        const classElement: Apollon.UMLClassifier | undefined = this.modelQueryService.getClassElementById(classId);
        if (!classElement) {
            // If the class doesn't exist, log an error and return early
            console.error(`Cannot remove tag: Class with id ${classId} not found in model`);
            return;
        }

        // Check if the class has the tag before attempting to remove it
        // This prevents unnecessary model updates
        if (!this.modelQueryService.isClassTaggedAs(classId, tagType)) {
            // If the class doesn't have this tag, log a message and return early
            console.log(`Class with id ${classId} is not tagged with ${tagType}`);
            return;
        }

        // Use the repository's updateModel method to modify the model
        // This ensures all changes are properly tracked and persisted
        this.modelRepositoryService.updateModel(
            (model: Apollon.UMLModelCompat) => {
                // Find the class in the model
                // We need to get a reference to the actual object in the model to modify it
                const classElement = helpers.findElement(model, classId) as Apollon.UMLClassifier;
                if (classElement && classElement.attributes) {

                    for (const attributeId of classElement.attributes) {
                        const attribute = helpers.findElement(model, attributeId);
                        if (attribute && attribute.name === tagType) {
                            // Remove the attribute ID from the class's attributes array
                            classElement.attributes = classElement.attributes.filter(id => id !== attribute.id);

                            // Update the class element in the model with the modified attributes array
                            helpers.addOrUpdateElement(model, classElement);

                            delete model.elements[attribute.id]; // Delete the attribute from the model
                            break; // Exit loop after removing the tag
                        }
                    }
                }
            });
    }
}

export default ModelUpdateService;