import * as Apollon from '../../../src/main';
import { APP_CONFIG } from '../AppConfig';
import ModelRepositoryService from './ModelRepositoryService';
import ModelQueryService, { RelationshipEndInfo, RelationshipMultiplcity } from './ModelQueryService';
import ModelUpdateService from './ModelUpdateService';

type TagType = typeof APP_CONFIG.TAG_TYPES[keyof typeof APP_CONFIG.TAG_TYPES];

/**
 * Facade that coordinates between the repository, query, and command services.
 * This class provides a unified interface for working with UML models, 
 * hiding the complexity of the underlying services and their interactions.
 * It delegates operations to the appropriate specialized services.
 */
class ModelManager {
    /**
     * Repository service that manages model storage and persistence
     * @private
     */
    private modelRepositoryService: ModelRepositoryService;

    /**
     * Service that handles all read-only operations on the model
     * @private
     */
    private modelQueryService: ModelQueryService;

    /**
     * Service that handles all operations that modify the model
     * @private
     */
    private modelUpdateService: ModelUpdateService;

    /**
     * Creates a new ModelManager instance
     * 
     * @param localStorageKey - The key used to store and retrieve the model from localStorage
     * @param initialModel - Optional initial model. If provided, it will be used instead of loading from storage
     */
    constructor(localStorageKey: string, initialModel?: Apollon.UMLModelCompat) {
        // Initialize the layers in the correct order (repository first, then query, then command)
        this.modelRepositoryService = new ModelRepositoryService(localStorageKey, initialModel);
        this.modelQueryService = new ModelQueryService(this.modelRepositoryService);
        this.modelUpdateService = new ModelUpdateService(this.modelRepositoryService, this.modelQueryService);
    }

    // MODEL ACCESS METHODS

    /**
     * Gets the current UML model
     * 
     * @returns The current UML model instance
     */
    getModel(): Apollon.UMLModelCompat {
        return this.modelRepositoryService.getModel();
    }

    /**
     * Sets a new UML model, replacing the current one
     * 
     * @param model - The new model to set
     */
    setModel(model: Apollon.UMLModelCompat): void {
        this.modelRepositoryService.setModel(model);
    }

    /**
     * Saves the current model to localStorage
     * This ensures that any changes to the model are persisted between sessions
     */
    saveToLocalStorage(): void {
        this.modelRepositoryService.saveToStorage();
    }

    /**
     * Clears the model from localStorage and resets to an empty model
     * This effectively starts a new, blank diagram
     */
    clearFromLocalStorage(): void {
        this.modelRepositoryService.clearStorage();
    }

    // QUERY METHODS (delegated to QueryService)

    /**
     * Gets a class element by its ID
     * 
     * @param id - The unique identifier of the class element to retrieve
     * @returns The class element if found, undefined otherwise
     */
    getClassElementById(id: string): Apollon.UMLClassifier | undefined {
        return this.modelQueryService.getClassElementById(id);
    }

    /**
     * Gets a class element by its name
     * 
     * @param className - The name of the class element to retrieve
     * @returns The class element if found, undefined otherwise
     */
    getClassElementByName(className: string): Apollon.UMLClassifier | undefined {
        return this.modelQueryService.getClassElementByName(className);
    }

    /**
     * Gets a relationship by its ID
     * 
     * @param id - The unique identifier of the relationship to retrieve
     * @returns The relationship if found, undefined otherwise
     */
    getRelationshipById(id: string): Apollon.UMLAssociation | undefined {
        return this.modelQueryService.getRelationshipById(id);
    }

    /**
     * Gets a relationship by its name
     * 
     * @param relationshipName - The name of the relationship to retrieve
     * @returns The relationship if found, undefined otherwise
     */
    getRelationshipByName(relationshipName: string): Apollon.UMLAssociation | undefined {
        return this.modelQueryService.getRelationshipByName(relationshipName);
    }

    /**
     * Gets attributes of a class element by its ID
     * 
     * @param id - The ID of the class element
     * @returns An array of attribute elements if found, undefined otherwise
     */
    getClassAttributesById(id: string): Apollon.UMLModelElement[] | undefined {
        return this.modelQueryService.getClassAttributesById(id);
    }

    /**
     * Gets methods of a class element by its ID
     * 
     * @param id - The ID of the class element
     * @returns An array of method elements if found, undefined otherwise
     */
    getClassMethodsById(id: string): Apollon.UMLModelElement[] | undefined {
        return this.modelQueryService.getClassMethodsById(id);
    }

    /**
     * Gets attributes of a class element by its name
     * 
     * @param className - The name of the class element
     * @returns An array of attribute elements if found, undefined otherwise
     */
    getClassAttributesByName(className: string): Apollon.UMLModelElement[] | undefined {
        return this.modelQueryService.getClassAttributesByName(className);
    }

    /**
     * Gets methods of a class element by its name
     * 
     * @param className - The name of the class element
     * @returns An array of method elements if found, undefined otherwise
     */
    getClassMethodsByName(className: string): Apollon.UMLModelElement[] | undefined {
        return this.modelQueryService.getClassMethodsByName(className);
    }

    /**
     * Gets all relationships associated with a specific class
     * 
     * @param classId - The ID of the class to get relationships for
     * @returns An array of relationships connected to the class, undefined if the class wasn't found
     */
    getClassRelationshipsById(classId: string): Apollon.UMLRelationship[] | undefined {
        return this.modelQueryService.getClassRelationshipsById(classId);
    }

    /**
     * Checks if a target class is directly reachable from a source class through a specific relationship
     * This evaluates if there is a navigable path from source to target based on the relationship type
     * 
     * @param sourceClassId - The ID of the source class
     * @param targetClassId - The ID of the target class
     * @param relationshipId - The ID of the relationship to check
     * @returns True if the target is reachable from the source through the relationship, false otherwise
     */
    isClassDirectlyReachableFrom(sourceClassId: string, targetClassId: string, relationshipId: string): boolean {
        return this.modelQueryService.isClassDirectlyReachableFrom(sourceClassId, targetClassId, relationshipId);
    }

    /**
     * Gets all outgoing associations from a class
     * These are relationships that can be traversed from the given class to other classes
     * 
     * @param classId - The ID of the class to get outgoing associations for
     * @returns An array of navigable associations from the class, undefined if the class wasn't found
     */
    getClassOutgoingAssociationsById(classId: string): Apollon.UMLAssociation[] | undefined {
        return this.modelQueryService.getClassOutgoingAssociationsById(classId);
    }

    /**
     * Gets the opposite end class of a relationship for a given class
     * This finds the class at the other end of the relationship and checks if it's navigable
     * 
     * @param relationshipId - The ID of the relationship
     * @param classId - The ID of the class at one end of the relationship
     * @returns The class at the other end if navigable, undefined otherwise
     */
    getRelationshipOppositeEndClass(relationshipId: string, classId: string): Apollon.UMLClassifier | undefined {
        return this.modelQueryService.getRelationshipOppositeEndClass(relationshipId, classId);
    }

    /**
     * Gets the role name of a relationship end class
     * 
     * @param relationshipId - The ID of the relationship
     * @param targetClassId - The ID of the class whose role name to retrieve
     * @returns The role name of the class in the relationship, undefined if not found
     */
    getRelationshipEndClassRoleName(relationshipId: string, targetClassId: string): string | undefined {
        return this.modelQueryService.getRelationshipEndClassRoleName(relationshipId, targetClassId);
    }

    /**
     * Determines if a class is the source or target in a relationship
     * 
     * @param relationshipId - The ID of the relationship
     * @param classId - The ID of the class to check
     * @returns 'source', 'target', or undefined if the class is not part of the relationship
     */
    getRelationsipIsSourceOrTarget(relationshipId: string, classId: string): 'source' | 'target' | undefined {
        return this.modelQueryService.getRelationsipIsSourceOrTarget(relationshipId, classId);
    }

    /**
     * Gets all classes that can be reached from a source class through navigable relationships
     * 
     * @param sourceId - The ID of the source class
     * @returns An array of classes that can be reached from the source class
     */
    getReachableClasses(sourceId: string): Apollon.UMLClassifier[] {
        return this.modelQueryService.getReachableClasses(sourceId);
    }

    /**
     * Checks if a class has a specific tag
     * Tags are implemented as special attributes with specific names
     * 
     * @param classId - The ID of the class to check
     * @param tagType - The type of tag to check for
     * @returns True if the class has the tag, false otherwise
     */
    isClassTaggedAs(classId: string, tagType: TagType): boolean {
        return this.modelQueryService.isClassTaggedAs(classId, tagType);
    }

    /**
     * Gets the role text of a relationship end
     * 
     * @param relationshipId - The ID of the relationship
     * @param end - Which end of the relationship to check ('source' or 'target')
     * @returns The role text of the specified end, undefined if the relationship wasn't found
     */
    getRelationshipEndRoleById(relationshipId: string, end: 'source' | 'target'): string | undefined {
        return this.modelQueryService.getRelationshipEndRoleById(relationshipId, end);
    }

    /**
     * Checks if a relationship end has a specific tag
     * Tags for relationship ends are implemented as text within the role name
     * 
     * @param relationshipId - The ID of the relationship
     * @param end - Which end of the relationship to check ('source' or 'target')
     * @param tagType - The type of tag to check for
     * @returns True if the relationship end has the tag, false otherwise
     */
    hasRelationshipEndTag(relationshipId: string, end: 'source' | 'target', tagType: TagType): boolean {
        return this.modelQueryService.hasRelationshipEndTag(relationshipId, end, tagType);
    }

    /**
     * Checks if a relationship has a specific tag on either end
     * 
     * @param relationshipId - The ID of the relationship
     * @param tagType - The type of tag to check for
     * @returns True if either end of the relationship has the tag, false otherwise
     */
    hasRelationshipTag(relationshipId: string, tagType: TagType): boolean {
        return this.modelQueryService.hasRelationshipTag(relationshipId, tagType);
    }

    /**
     * Checks if a relationship has a specific tag on its source end
     * 
     * @param relationshipId - The ID of the relationship
     * @param tagType - The type of tag to check for
     * @returns True if the source end has the tag, false otherwise
     */
    hasRelationshipSourceTag(relationshipId: string, tagType: TagType): boolean {
        return this.modelQueryService.hasRelationshipSourceTag(relationshipId, tagType);
    }

    /**
     * Checks if a relationship has a specific tag on its target end
     * 
     * @param relationshipId - The ID of the relationship
     * @param tagType - The type of tag to check for
     * @returns True if the target end has the tag, false otherwise
     */
    hasRelationshipTargetTag(relationshipId: string, tagType: TagType): boolean {
        return this.modelQueryService.hasRelationshipTargetTag(relationshipId, tagType);
    }

    /**
     * Determines the UML type of an element or relationship based on its ID
     * 
     * @param id - The ID of the element or relationship
     * @returns The UML type if found, undefined otherwise
     */
    getUMLTypeById(id: string): Apollon.UMLElementType | Apollon.UMLRelationshipType | undefined {
        return this.modelQueryService.getUMLTypeById(id);
    }

    /**
     * Gets all classes in the model
     * 
     * @returns An array of all classes in the model
     */
    getAllClasses(): Apollon.UMLClassifier[] {
        return this.modelQueryService.getAllClasses();
    }

    /**
     * Gets all relationships in the model
     *
     * @returns An array of all relationships in the model
     */
    getAllRelationships(): Apollon.UMLRelationship[] {
        return this.modelQueryService.getAllRelationships();
    }

    /**
     * Gets all classes tagged with a specific tag type
     * 
     * @param tagType - The type of tag to filter by
     * @returns An array of classes that have the specified tag
     */
    getAllClassesTaggedAs(tagType: TagType): Apollon.UMLClassifier[] {
        return this.modelQueryService.getAllClassesTaggedAs(tagType);
    }

    /**
     * Gets all relationships tagged with a specific tag type
     * 
     * @param tagType - The type of tag to filter by
     * @returns An array of relationships that have the specified tag
     */
    getAllRelationshipsTaggedAs(tagType: TagType): Apollon.UMLRelationship[] {
        return this.modelQueryService.getAllRelationshipsTaggedAs(tagType);
    }

    /**
     * Gets the multiplicity of a relationship end
     * 
     * @param relationshipId - The ID of the relationship
     * @param end - Which end of the relationship to check ('source' or 'target')
     * @returns The multiplicity of the specified end, undefined if not found
     */
    getRelationshipEndMultiplicity(relationshipId: string, end: 'source' | 'target'): RelationshipMultiplcity | undefined {
        return this.modelQueryService.getRelationshipEndMultiplicity(relationshipId, end);
    }

    /**
     * Gets all outgoing associations from a class with a lower multiplicity not equal to zero
     * This is useful for identifying associations that can be traversed in a specific way
     * 
     * @param classId - The ID of the class to check
     * @returns An array of associations with lower multiplicity not equal to zero
     */
    public getClassOutgoingAssociationsWithLowerMultiplicityNotZero(classId: string): Apollon.UMLAssociation[] {
        return this.modelQueryService.getClassOutgoingAssociationsWithLowerMultiplicityNotZero(classId);
    }

    /**
     * Gets the parent class of a specific class
     * 
     * @param classId - The ID of the class to check
     * @returns The parent class if found, undefined otherwise
     */
    public getClassParent(classId: string): Apollon.UMLClassifier | undefined {
        return this.modelQueryService.getClassParent(classId);
    }

    /**
     * Gets the parent relationship of a specific class
     * 
     * @param classId - The ID of the class to check
     * @returns The parent relationship if found, undefined otherwise
     */
    public getClassParentRelationship(classId: string): Apollon.UMLRelationship | undefined {
        return this.modelQueryService.getClassParentRelationship(classId);
    }

    public getRelationshipEndClass(relationshipId: string, end: 'source' | 'target'): Apollon.UMLClassifier | undefined {
        return this.modelQueryService.getRelationshipEndClass(relationshipId, end);
    }

    public getRelationshipRoleNameClass(relationshipId: string, end: 'source' | 'target'): Apollon.UMLClassifier | undefined {
        return this.modelQueryService.getRelationshipRoleNameClass(relationshipId, end);
    }

    public getAssociationEndInfo(relationshipId: string, end: 'source' | 'target'): RelationshipEndInfo | undefined {
        return this.modelQueryService.getRelationshipEndInfo(relationshipId, end);
    }

    // COMMAND METHODS (delegated to CommandService)

    /**
     * Adds or updates an element in the model
     * If the element already exists, it will be updated; otherwise, it will be added
     * 
     * @param element - The UML element to add or update
     */
    addOrUpdateElement(element: Apollon.UMLElement): void {
        this.modelUpdateService.addOrUpdateElement(element);
    }

    /**
     * Adds or updates a relationship in the model
     * If the relationship already exists, it will be updated; otherwise, it will be added
     * 
     * @param relationship - The UML relationship to add or update
     */
    addOrUpdateRelationship(relationship: Apollon.UMLRelationship): void {
        this.modelUpdateService.addOrUpdateRelationship(relationship);
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
        this.modelUpdateService.appendToRelationshipEndRole(relationshipId, end, text);
    }

    /**
     * Changes the stroke color of a relationship
     * This is often used to highlight relationships for emphasis or to indicate special status
     * 
     * @param relationshipId - The ID of the relationship to modify
     * @param rgbColor - The RGB color string to set as the stroke color
     */
    changeRelationshipStrokeColor(relationshipId: string, rgbColor: string): void {
        this.modelUpdateService.changeRelationshipStrokeColor(relationshipId, rgbColor);
    }

    /**
     * Resets the stroke color of a relationship to the default color
     * This is useful after temporary highlighting is no longer needed
     * 
     * @param relationshipId - The ID of the relationship to reset
     */
    resetRelationshipStrokeColor(relationshipId: string): void {
        this.modelUpdateService.resetRelationshipStrokeColor(relationshipId);
    }

    /**
     * Adds a tag to a class
     * Tags are implemented as attributes with specific names and colors
     * 
     * @param classId - The ID of the class to tag
     * @param tagType - The type of tag to add
     */
    addTagToClass(classId: string, tagType: TagType): void {
        this.modelUpdateService.addTagToClass(classId, tagType);
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
        this.modelUpdateService.tagRelationshipEnd(relationshipId, end, tagType);
    }

    removeClassTag(classId: string, tagType: TagType): void {
        this.modelUpdateService.removeClassTag(classId, tagType);
    }
}

export default ModelManager;