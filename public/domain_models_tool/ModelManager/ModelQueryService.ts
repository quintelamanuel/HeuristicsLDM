import * as Apollon from '../../../src/main';
import * as helpers from '../../../src/main/compat/helpers';
import { APP_CONFIG } from '../AppConfig';
import ModelRepositoryService from './ModelRepositoryService';

// Type aliases
type ClassPropertyType = 'attributes' | 'methods';
type ClassIdentifier = { id: string } | { name: string };
type RelationshipIdentifier = { id: string } | { name: string };
type TagType = typeof APP_CONFIG.TAG_TYPES[keyof typeof APP_CONFIG.TAG_TYPES];
export type RelationshipMultiplcity = {
    relationshipId: string;
    end: 'source' | 'target';
    targetClassId: string;
    targetClassName: string;
    lower: number;
    upper: number;
}

export type RelationshipEndInfo = {
    relationshipType: Apollon.UMLRelationshipType;
    relationshipId: string;
    sourceClassId: string;
    targetClassId: string;
    endType: 'source' | 'target';
    roleName: string;
    multiplicity: RelationshipMultiplcity;
}

/**
 * Service for all read-only operations on the UML model.
 * This class is responsible for querying the model and retrieving specific elements and their properties.
 * It contains methods for working with classes, relationships, and tags.
 * No method in this class should modify the model - all operations are read-only.
 */
class ModelQueryService {
    /**
     * Reference to the repository service that contains the UML model
     */
    private repository: ModelRepositoryService;

    /**
     * Creates a new ModelQueryService instance
     * 
     * @param repository - The repository service that holds the UML model to query
     */
    constructor(repository: ModelRepositoryService) {
        // Store a reference to the repository to access the model when needed
        this.repository = repository;
    }

    // CLASS QUERIES

    /**
     * Gets a class element by its ID
     * 
     * @param id - The unique identifier of the class element to retrieve
     * @returns The class element if found, undefined otherwise
     */
    getClassElementById(id: string): Apollon.UMLClassifier | undefined {
        // Get the current model from the repository
        const model = this.repository.getModel();

        // Use the helpers utility to find the element with the given ID in the model
        const classElement = helpers.findElement(model, id);

        // If no element was found with this ID, log an error and return undefined
        if (!classElement) {
            console.error(`Element with id ${id} not found in model`);
            return undefined;
        }

        // Return the found element cast to a UMLClassifier type
        // This is needed because findElement returns a more generic type
        return classElement as Apollon.UMLClassifier;
    }

    /**
     * Gets a class element by its name
     * 
     * @param className - The name of the class element to retrieve
     * @returns The class element if found, undefined otherwise
     */
    getClassElementByName(className: string): Apollon.UMLClassifier | undefined {
        // Get the current model from the repository
        const model = this.repository.getModel();

        // Extract all elements from the model into an array for easier filtering
        const modelElements: Apollon.UMLElement[] = Object.values(model.elements);

        // Find the first element whose name matches the given className
        // This assumes class names are unique in the model
        const classElement = modelElements.find(
            (element: Apollon.UMLElement): boolean =>
                // Cast to UMLClassifier to access the name property and compare with the given className
                (element as Apollon.UMLClassifier).name === className
        ) as Apollon.UMLClassifier;

        // If no element was found with this name, log an error and return undefined
        if (!classElement) {
            console.error(`Element with name ${className} not found in model`);
            return undefined;
        }

        // Return the found class element
        return classElement;
    }

    /**
     * Gets a class element using either ID or name
     * This is a private helper method used by other methods in this class
     * 
     * @param identifier - An object containing either an id or name property to identify the class
     * @returns The class element if found, undefined otherwise
     * @private
     */
    private getClassElement(identifier: ClassIdentifier): Apollon.UMLClassifier | undefined {
        // Check if the identifier contains an id property
        if ('id' in identifier) {
            // If we have an ID, use the ID-based lookup method
            return this.getClassElementById(identifier.id);
        } else {
            // Otherwise, use the name-based lookup method
            return this.getClassElementByName(identifier.name);
        }
    }

    /**
     * Gets class properties (attributes or methods) for a given class
     * 
     * @param identifier - An object with either id or name to identify the class
     * @param propertyType - The type of properties to retrieve ('attributes' or 'methods')
     * @returns An array of property elements if found, undefined otherwise
     */
    getClassProperty(
        identifier: ClassIdentifier,
        propertyType: ClassPropertyType
    ): Apollon.UMLModelElement[] | undefined {
        // Get the current model from the repository
        const model = this.repository.getModel();

        // Get the class element using the provided identifier
        const classElement = this.getClassElement(identifier);

        // If the class element wasn't found, log an error with the identifier details and return undefined
        if (!classElement) {
            // Create a descriptive message that includes either the ID or name for better error reporting
            const idInfo = 'id' in identifier ? `id ${identifier.id}` : `name ${identifier.name}`;
            console.error(`Class element with ${idInfo} not found in model`);
            return undefined;
        }

        // Get the array of property IDs from the class element (either attributes or methods)
        const propertyIds = classElement[propertyType];

        // If no properties of the requested type exist, log an error and return undefined
        if (!propertyIds || propertyIds.length === 0) {
            // Create a descriptive message for better error reporting
            const idInfo = 'id' in identifier ? `id ${identifier.id}` : `name ${identifier.name}`;
            console.error(`No ${propertyType} found for class element with ${idInfo}`);
            return undefined;
        }

        // Initialize an array to collect the property elements
        const propertyElements: Apollon.UMLModelElement[] = [];

        // Loop through each property ID and find the corresponding element in the model
        for (const propertyId of propertyIds) {
            // Find the property element using its ID
            const propertyElement = helpers.findElement(model, propertyId);

            // If the property element was found, add it to the result array
            if (propertyElement) {
                propertyElements.push(propertyElement as Apollon.UMLModelElement);
            }
            // If not found, we silently skip it (the property ID might be invalid or the element might have been deleted)
        }

        // Return the array of property elements
        return propertyElements;
    }

    /**
     * Gets attributes of a class element by its ID
     * 
     * @param id - The ID of the class element
     * @returns An array of attribute elements if found, undefined otherwise
     */
    getClassAttributesById(id: string): Apollon.UMLModelElement[] | undefined {
        // Delegate to the more general getClassProperty method with the id and 'attributes' type
        // This simplifies the API by providing a more specific method
        return this.getClassProperty({ id }, 'attributes');
    }

    /**
     * Gets methods of a class element by its ID
     * 
     * @param id - The ID of the class element
     * @returns An array of method elements if found, undefined otherwise
     */
    getClassMethodsById(id: string): Apollon.UMLModelElement[] | undefined {
        // Delegate to the more general getClassProperty method with the id and 'methods' type
        // This simplifies the API by providing a more specific method
        return this.getClassProperty({ id }, 'methods');
    }

    /**
     * Gets attributes of a class element by its name
     * 
     * @param className - The name of the class element
     * @returns An array of attribute elements if found, undefined otherwise
     */
    getClassAttributesByName(className: string): Apollon.UMLModelElement[] | undefined {
        // Delegate to the more general getClassProperty method with the name and 'attributes' type
        // This provides a convenient alternative when the ID is not available
        return this.getClassProperty({ name: className }, 'attributes');
    }

    /**
     * Gets methods of a class element by its name
     * 
     * @param className - The name of the class element
     * @returns An array of method elements if found, undefined otherwise
     */
    getClassMethodsByName(className: string): Apollon.UMLModelElement[] | undefined {
        // Delegate to the more general getClassProperty method with the name and 'methods' type
        // This provides a convenient alternative when the ID is not available
        return this.getClassProperty({ name: className }, 'methods');
    }

    // RELATIONSHIP QUERIES

    /**
     * Gets a relationship by its ID
     * 
     * @param id - The unique identifier of the relationship to retrieve
     * @returns The relationship if found, undefined otherwise
     */
    getRelationshipById(id: string): Apollon.UMLAssociation | undefined {
        // Get the current model from the repository
        const model = this.repository.getModel();

        // Use the helpers utility to find the relationship with the given ID
        const relationship = helpers.findRelationship(model, id);

        // If no relationship was found with this ID, log an error and return undefined
        if (!relationship) {
            console.error(`Relationship with id ${id} not found in model`);
            return undefined;
        }

        // Return the found relationship cast to a UMLAssociation type
        // This is needed because findRelationship returns a more generic type
        return relationship as Apollon.UMLAssociation;
    }

    /**
     * Gets a relationship by its name
     * 
     * @param relationshipName - The name of the relationship to retrieve
     * @returns The relationship if found, undefined otherwise
     */
    getRelationshipByName(relationshipName: string): Apollon.UMLAssociation | undefined {
        // Get the current model from the repository
        const model = this.repository.getModel();

        // Extract all relationships from the model into an array for easier filtering
        const modelRelationships: Apollon.UMLRelationship[] = Object.values(model.relationships);

        // Find the first relationship whose name matches the given relationshipName
        // This assumes relationship names are unique in the model
        const relationship = modelRelationships.find(
            (rel: Apollon.UMLRelationship): boolean => rel.name === relationshipName
        );

        // If no relationship was found with this name, log an error and return undefined
        if (!relationship) {
            console.error(`Relationship with name ${relationshipName} not found in model`);
            return undefined;
        }

        // Return the found relationship cast to a UMLAssociation type
        return relationship as Apollon.UMLAssociation;
    }

    /**
     * Gets a relationship using either ID or name
     * This is a private helper method used by other methods in this class
     * 
     * @param identifier - An object containing either an id or name property to identify the relationship
     * @returns The relationship if found, undefined otherwise
     * @private
     */
    private getRelationship(identifier: RelationshipIdentifier): Apollon.UMLAssociation | undefined {
        // Check if the identifier contains an id property
        if ('id' in identifier) {
            // If we have an ID, use the ID-based lookup method
            return this.getRelationshipById(identifier.id);
        } else {
            // Otherwise, use the name-based lookup method
            return this.getRelationshipByName(identifier.name);
        }
    }

    /**
     * Gets all relationships associated with a specific class
     * 
     * @param classId - The ID of the class to get relationships for
     * @returns An array of relationships connected to the class, undefined if the class wasn't found
     */
    getClassRelationshipsById(classId: string): Apollon.UMLRelationship[] | undefined {
        // First, verify that the class exists
        const classElement = this.getClassElementById(classId);
        if (!classElement) {
            // If the class doesn't exist, log an error and return undefined
            console.error(`Class element with id ${classId} not found in model`);
            return undefined;
        }

        // Get the current model from the repository
        const model = this.repository.getModel();

        // Extract all relationships from the model into an array for easier filtering
        const relationships: Apollon.UMLRelationship[] = Object.values(model.relationships);

        // Initialize an array to collect relationships connected to the class
        const classRelationships: Apollon.UMLRelationship[] = [];

        // Loop through each relationship and check if it's connected to the class
        for (const relationship of relationships) {
            // Check if the class is either the source or target of this relationship
            if (relationship.source.element === classId || relationship.target.element === classId) {
                // If connected, add the relationship to the result array
                classRelationships.push(relationship);
            }
        }

        // Return the array of class relationships
        return classRelationships;
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
        // Get the relationship using its ID
        const relationship = this.getRelationshipById(relationshipId);
        if (!relationship) {
            // If the relationship doesn't exist, log an error and return false
            console.error(`Cannot check reachability: Relationship with id ${relationshipId} not found in model`);
            return false;
        }

        // Determine the position of both classes in the relationship
        // We need to know if the source class is at the "source" or "target" end of the relationship
        // And similarly for the target class
        const isSourceAtSource = relationship.source.element === sourceClassId;
        const isSourceAtTarget = relationship.target.element === sourceClassId;
        const isTargetAtTarget = relationship.target.element === targetClassId;
        const isTargetAtSource = relationship.source.element === targetClassId;

        // Check if the classes are actually connected by this relationship
        // They must be at opposite ends (one at source, one at target)
        if (!((isSourceAtSource && isTargetAtTarget) || (isSourceAtTarget && isTargetAtSource))) {
            // If not connected, return false immediately
            return false;
        }

        // Check the relationship type to determine traversability
        // Bidirectional, aggregation, and composition relationships are navigable in both directions
        if (relationship.type === 'ClassBidirectional' ||
            relationship.type === 'ClassAggregation' ||
            relationship.type === 'ClassComposition') {
            return true;
        }

        // For unidirectional relationships, navigation is only possible from source to target
        if (relationship.type === 'ClassUnidirectional') {
            // Can only traverse if the source class is at the "source" end and the target class is at the "target" end
            return isSourceAtSource && isTargetAtTarget;
        }

        // For unsupported relationship types, log a warning and return false
        console.warn(`Unsupported relationship type: ${relationship.type}`);
        return false;
    }

    /**
     * Gets all outgoing associations from a class
     * These are relationships that can be traversed from the given class to other classes
     * 
     * @param classId - The ID of the class to get outgoing associations for
     * @returns An array of navigable associations from the class, undefined if the class wasn't found
     */
    getClassOutgoingAssociationsById(classId: string): Apollon.UMLAssociation[] | undefined {
        // First, get all relationships connected to the class
        const allRelationships = this.getClassRelationshipsById(classId);
        if (!allRelationships) return undefined;

        // Initialize an array to collect navigable associations
        const outgoingAssociations: Apollon.UMLAssociation[] = [];

        // Loop through each relationship and check if it's navigable from the class
        for (const relationship of allRelationships) {
            // Get the IDs of both classes connected by this relationship
            const sourceElementId = relationship.source.element;
            const targetElementId = relationship.target.element;

            // Determine which class is at the other end of the relationship
            let classToVisit;
            if (sourceElementId === classId) {
                // If our class is at the source end, the other class is at the target end
                classToVisit = targetElementId;
            } else if (targetElementId === classId) {
                // If our class is at the target end, the other class is at the source end
                classToVisit = sourceElementId;
            } else {
                // This should never happen (relationship would not have been returned by getClassRelationshipsById)
                // But we include it as a safeguard
                continue;
            }

            // Check if the relationship is navigable from our class to the other class
            const isReachable = this.isClassDirectlyReachableFrom(classId, classToVisit, relationship.id);
            if (isReachable) {
                // If navigable, add the relationship to the result array
                outgoingAssociations.push(relationship as Apollon.UMLAssociation);
            }
        }

        // Return the array of navigable associations
        return outgoingAssociations;
    }

    getRelationshipEndClass(relationshipId: string, endType: 'source' | 'target'): Apollon.UMLClassifier | undefined {
        // Get the relationship using its ID
        const relationship = this.getRelationshipById(relationshipId);
        if (!relationship) {
            // If the relationship doesn't exist, log an error and return undefined
            console.error(`Relationship with id ${relationshipId} not found in model`);
            return undefined;
        }

        // Return the class at the specified end of the relationship
        return this.getClassElementById(relationship[endType].element);
    }

    getRelationshipRoleNameClass(relationshipId: string, roleName: string): Apollon.UMLClassifier | undefined {
        // Get the relationship using its ID
        const relationship = this.getRelationshipById(relationshipId);
        if (!relationship) {
            // If the relationship doesn't exist, log an error and return undefined
            console.error(`Relationship with id ${relationshipId} not found in model`);
            return undefined;
        }

        let roleNameClassId: string

        if (relationship.source.role === roleName) {
            roleNameClassId = relationship.source.element;
        } else if (relationship.target.role === roleName) {
            roleNameClassId = relationship.target.element;
        } else {
            // If the role name doesn't match either end, log an error and return undefined
            console.error(`Role name ${roleName} not found in relationship ${relationshipId}`);
            return undefined;
        }

        // Return the class at the specified end of the relationship
        return this.getClassElementById(roleNameClassId);
    }

    /**
     * Gets the opposite end of a relationship for a given class
     * This is used to determine if the class is at the source or target end of the relationship
     * 
     * @param relationshipId - The ID of the relationship
     * @param sourceClassId - The ID of the class at one end of the relationship
     * @returns 'source', 'target', or undefined if the class is not part of the relationship
     */
    getRelationshipOppositeEnd(relationshipId: string, sourceClassId: string): 'source' | 'target' | undefined {
        // Get the relationship using its ID
        const relationship = this.getRelationshipById(relationshipId);
        if (!relationship) {
            // If the relationship doesn't exist, log an error and return undefined
            console.error(`Relationship with id ${relationshipId} not found in model`);
            return undefined;
        }

        // Check if the class is part of this relationship
        if (relationship.source.element !== sourceClassId && relationship.target.element !== sourceClassId) {
            // If the class is not at either end, log an error and return undefined
            console.error(`Class with id ${sourceClassId} is not part of relationship ${relationshipId}`);
            return undefined;
        }

        // Determine which class is at the opposite end
        const oppositeEnd = relationship.source.element === sourceClassId
            ? 'target'  // If our class is at the source end, the opposite is at the target end
            : 'source'; // Otherwise, the opposite is at the source end

        return oppositeEnd;
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
        const relationship = this.getRelationshipById(relationshipId);
        if (!relationship) {
            // If the relationship doesn't exist, log an error and return undefined
            console.error(`Relationship with id ${relationshipId} not found in model`);
            return undefined;
        }
        const oppositeEnd: 'source' | 'target' | undefined = this.getRelationshipOppositeEnd(relationshipId, classId);

        if (!oppositeEnd) {
            // If the opposite end couldn't be determined, log an error and return undefined
            console.error(`Cannot determine opposite end for relationship with id ${relationshipId}`);
            return undefined;
        }

        // Determine which class is at the opposite end
        const oppositeEndId = relationship[oppositeEnd].element;

        // Check if the relationship is navigable from our class to the opposite class
        const isReachable = this.isClassDirectlyReachableFrom(classId, oppositeEndId, relationshipId);
        if (!isReachable) {
            // If not navigable, log a warning and return undefined
            console.warn(`Class ${classId} cannot traverse to ${oppositeEndId} through relationship ${relationshipId}`);
            return undefined;
        }

        // Get and return the class at the opposite end
        return this.getClassElementById(oppositeEndId);
    }



    /**
     * Gets the role name of a relationship end class
     * 
     * @param relationshipId - The ID of the relationship
     * @param targetClassId - The ID of the class whose role name to retrieve
     * @returns The role name of the class in the relationship, undefined if not found
     */
    getRelationshipEndClassRoleName(relationshipId: string, targetClassId: string): string | undefined {
        // Get the relationship using its ID
        const relationship = this.getRelationshipById(relationshipId);
        if (!relationship) {
            // If the relationship doesn't exist, log an error and return undefined
            console.error(`Relationship with id ${relationshipId} not found in model`);
            return undefined;
        }

        // Check if the class is at the source end and return its role
        if (relationship.source.element === targetClassId) {
            return relationship.source.role;
        }
        // Check if the class is at the target end and return its role
        else if (relationship.target.element === targetClassId) {
            return relationship.target.role;
        }

        // If the class is not part of this relationship, log an error and return undefined
        console.error(`Class with id ${targetClassId} is not part of relationship ${relationshipId}`);
        return undefined;
    }

    /**
     * Determines if a class is the source or target in a relationship
     * 
     * @param relationshipId - The ID of the relationship
     * @param classId - The ID of the class to check
     * @returns 'source', 'target', or undefined if the class is not part of the relationship
     */
    getRelationsipIsSourceOrTarget(relationshipId: string, classId: string): 'source' | 'target' | undefined {
        // Get the relationship using its ID
        const relationship = this.getRelationshipById(relationshipId);
        if (!relationship) {
            // If the relationship doesn't exist, log an error and return undefined
            console.error(`Relationship with id ${relationshipId} not found in model`);
            return undefined;
        }

        // Check if the class is at the source end
        if (relationship.source.element === classId) {
            return 'source';
        }
        // Check if the class is at the target end
        else if (relationship.target.element === classId) {
            return 'target';
        }

        // If the class is not part of this relationship, log an error and return undefined
        console.error(`Class with id ${classId} is not part of relationship ${relationshipId}`);
        return undefined;
    }

    /**
     * Gets all classes that can be reached from a source class through navigable relationships
     * 
     * @param sourceId - The ID of the source class
     * @returns An array of classes that can be reached from the source class
     */
    getReachableClasses(sourceId: string): Apollon.UMLClassifier[] {
        // Verify that the source class exists
        const sourceClass = this.getClassElementById(sourceId);
        if (!sourceClass) {
            // If the class doesn't exist, log an error and return an empty array
            console.error(`Source class with id ${sourceId} not found in model`);
            return [];
        }

        // Get the current model from the repository
        const model = this.repository.getModel();

        // Get all relationships in the model and cast them to UMLAssociation
        const allRelationships: Apollon.UMLAssociation[] = Object.values(model.relationships) as Apollon.UMLAssociation[];

        // Initialize an array to collect reachable classes
        const reachableClasses: Apollon.UMLClassifier[] = [];

        // Create a set to track processed classes and avoid duplicates
        const processedClasses: Set<string> = new Set<string>();

        // Loop through each relationship in the model
        for (const relationship of allRelationships) {
            // Check if the relationship is a navigable type (association, aggregation, composition)
            if (this.isAssociationAggregationOrComposition(relationship)) {
                // Initialize variable to hold the target class if found
                let targetClass: Apollon.UMLClassifier | undefined = undefined;

                // Determine if our source class is at either end of the relationship
                const isSourceClass = relationship.source.element === sourceId;
                const isTargetClass = relationship.target.element === sourceId;

                // Determine if the relationship is bidirectional
                const isBidirectional = this.isBidirectionalRelationship(relationship);

                // If the source class is at the source end, we can navigate to the target
                if (isSourceClass) {
                    targetClass = this.getClassElementById(relationship.target.element);
                }
                // If the source class is at the target end and the relationship is bidirectional,
                // we can navigate to the source (only for bidirectional relationships)
                else if (isTargetClass && isBidirectional) {
                    targetClass = this.getClassElementById(relationship.source.element);
                }

                // If we found a target class and haven't processed it yet
                if (targetClass && !processedClasses.has(targetClass.id)) {
                    // Add the class to the result array
                    reachableClasses.push(targetClass);
                    // Mark the class as processed to avoid duplicates
                    processedClasses.add(targetClass.id);
                }
            }
        }

        // Return the array of reachable classes
        return reachableClasses;
    }

    /**
     * Gets the parent class of a given class element
     * This is used to determine the inheritance hierarchy of classes
     * 
     * @param childClassId - The ID of the class element to check
     * @returns The parent class if found, undefined otherwise
     */
    getClassParent(childClassId: string): Apollon.UMLClassifier | undefined {
        const inheritanceRelationship: Apollon.UMLRelationship | undefined = this.getClassParentRelationship(childClassId);

        if (!inheritanceRelationship) {
            // If no inheritance relationship was found, log an error and return undefined
            console.error(`Class with id ${childClassId} has no inheritance relationships`);
            return undefined;
        }

        // Return the parent class of the class element
        return this.getClassElementById(inheritanceRelationship.target.element);
    }

    getClassParentRelationship(childClassId: string) {
        // Get the class element using its ID
        const relationships: Apollon.UMLRelationship[] | undefined = this.getClassRelationshipsById(childClassId);
        if (!relationships) {
            // If the class doesn't exist, log an error and return undefined
            console.error(`Class element with id ${childClassId} not found in model`);
            return undefined;
        }

        const inheritanceRelationships: Apollon.UMLRelationship[] = relationships.filter(
            (relationship: Apollon.UMLRelationship) => {
                const isInheritanceRelationship: boolean = relationship.type === 'ClassInheritance';
                const oppositeEndType: 'source' | 'target' = this.getRelationshipOppositeEnd(relationship.id, childClassId)!;
                const isOppositeEndTarget: boolean = oppositeEndType === 'target';
                return isInheritanceRelationship && isOppositeEndTarget;
            }
        );

        if (inheritanceRelationships.length > 1) {
            throw new Error(`Class ${childClassId} has multiple inheritance relationships, which is not supported`);
        }

        if (inheritanceRelationships.length === 0) {
            // If no inheritance relationships were found, log an error and return undefined
            console.error(`Class with id ${childClassId} has no inheritance relationships`);
            return undefined;
        }

        // Return the parent class of the class element
        return inheritanceRelationships[0];
    }

    /**
     * Determines if a relationship is an association, aggregation, or composition
     * These are the relationship types that typically allow navigation between classes
     * 
     * @param relationship - The relationship to check
     * @returns True if the relationship is a navigable type, false otherwise
     * @private
     */
    private isAssociationAggregationOrComposition(relationship: Apollon.UMLRelationship): boolean {
        // Check the relationship type against known navigable types
        return relationship.type === 'ClassBidirectional' ||
            relationship.type === 'ClassUnidirectional' ||
            relationship.type === 'ClassComposition' ||
            relationship.type === 'ClassAggregation';
    }

    /**
     * Determines if a relationship is bidirectional
     * This affects whether the relationship can be traversed in both directions
     * 
     * @param relationship - The relationship to check
     * @returns True if the relationship is bidirectional, false otherwise
     * @private
     */
    private isBidirectionalRelationship(relationship: Apollon.UMLRelationship): boolean {
        // Check if the relationship is specifically of the bidirectional type
        return relationship.type === 'ClassBidirectional';
    }

    // TAG QUERIES

    /**
     * Checks if a class has a specific tag
     * Tags are implemented as special attributes with specific names
     * 
     * @param classId - The ID of the class to check
     * @param tagType - The type of tag to check for
     * @returns True if the class has the tag, false otherwise
     */
    isClassTaggedAs(classId: string, tagType: TagType): boolean {
        // Get all attributes of the class
        const classAttributes = this.getClassAttributesById(classId);

        // If the class doesn't have any attributes, it can't have any tags
        if (!classAttributes) {
            console.error(`Cannot check ${tagType} tag: No attributes found for class with id ${classId}`);
            return false;
        }

        // Loop through each attribute and check if its name matches the tag type
        for (const attribute of classAttributes) {
            if (attribute.name === tagType) {
                // If a matching attribute is found, the class has the tag
                return true;
            }
        }

        // If no matching attribute was found, the class doesn't have the tag
        return false;
    }

    /**
     * Gets the role text of a relationship end
     * 
     * @param relationshipId - The ID of the relationship
     * @param end - Which end of the relationship to check ('source' or 'target')
     * @returns The role text of the specified end, undefined if the relationship wasn't found
     */
    getRelationshipEndRoleById(relationshipId: string, end: 'source' | 'target'): string | undefined {
        // Get the relationship using its ID
        const relationship = this.getRelationshipById(relationshipId);
        if (!relationship) {
            // If the relationship doesn't exist, log an error and return undefined
            console.error(`Cannot check ${end}: Relationship with id ${relationshipId} not found in model`);
            return undefined;
        }

        // Return the role text of the specified end
        // The relationship object has 'source' and 'target' properties, each with a 'role' field
        return relationship[end].role;
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
        // Get the role text of the specified relationship end
        const roleText = this.getRelationshipEndRoleById(relationshipId, end);
        if (!roleText) {
            // If there's no role text, the end can't have any tags
            console.error(`Cannot check ${tagType} tag: Role text not found for relationship with id ${relationshipId}`);
            return false;
        }

        // Check if the role text includes the tag text
        // This assumes tags are represented as substrings within the role text
        return roleText.includes(tagType);
    }

    /**
     * Checks if a relationship has a specific tag on either end
     * 
     * @param relationshipId - The ID of the relationship
     * @param tagType - The type of tag to check for
     * @returns True if either end of the relationship has the tag, false otherwise
     */
    hasRelationshipTag(relationshipId: string, tagType: TagType): boolean {
        // Check if either the source or target end has the tag
        return this.hasRelationshipEndTag(relationshipId, 'source', tagType) ||
            this.hasRelationshipEndTag(relationshipId, 'target', tagType);
    }

    /**
     * Checks if a relationship has a specific tag on its source end
     * 
     * @param relationshipId - The ID of the relationship
     * @param tagType - The type of tag to check for
     * @returns True if the source end has the tag, false otherwise
     */
    hasRelationshipSourceTag(relationshipId: string, tagType: TagType): boolean {
        // Check specifically if the source end has the tag
        return this.hasRelationshipEndTag(relationshipId, 'source', tagType);
    }

    /**
     * Checks if a relationship has a specific tag on its target end
     * 
     * @param relationshipId - The ID of the relationship
     * @param tagType - The type of tag to check for
     * @returns True if the target end has the tag, false otherwise
     */
    hasRelationshipTargetTag(relationshipId: string, tagType: TagType): boolean {
        // Check specifically if the target end has the tag
        return this.hasRelationshipEndTag(relationshipId, 'target', tagType);
    }

    /**
     * Determines the UML type of an element or relationship based on its ID
     * 
     * @param id - The ID of the element or relationship
     * @returns The UML type if found, undefined otherwise
     */
    getUMLTypeById(id: string): Apollon.UMLElementType | Apollon.UMLRelationshipType | undefined {
        // Get the current model from the repository
        const model = this.repository.getModel();

        // First check if there's an element with this ID
        const element = helpers.findElement(model, id);

        // If an element was found, return its type
        if (element) {
            return element.type;
        }

        // If no element was found, check if there's a relationship with this ID
        const relationship = helpers.findRelationship(model, id);
        if (!relationship) {
            // If neither an element nor a relationship was found, log an error and return undefined
            console.error(`No element or relationship found with id ${id}`);
            return undefined;
        }

        // Return the type of the relationship
        return relationship.type;
    }

    getAllClasses(): Apollon.UMLClassifier[] {
        // Get the current model from the repository
        const model = this.repository.getModel();

        // Extract all classes from the model into an array for easier filtering
        const modelElements: Apollon.UMLElement[] = Object.values(model.elements);

        // Filter the elements to include only those of type UMLClassifier (classes)
        const classElements: Apollon.UMLClassifier[] = modelElements.filter(
            (element: Apollon.UMLElement): element is Apollon.UMLClassifier => element.type === 'Class'
        );

        // Return the array of class elements
        return classElements;
    }

    getAllRelationships(): Apollon.UMLRelationship[] {
        // Get the current model from the repository
        const model = this.repository.getModel();

        // Extract all relationships from the model into an array for easier filtering
        const modelRelationships: Apollon.UMLRelationship[] = Object.values(model.relationships);

        // Return the array of association elements
        return modelRelationships;
    }

    getAllClassesTaggedAs(tagType: TagType): Apollon.UMLClassifier[] {
        // Get all classes from the model
        const allClasses = this.getAllClasses();

        // Filter the classes to include only those tagged with the specified tag type
        const taggedClasses = allClasses.filter((classElement: Apollon.UMLClassifier) =>
            this.isClassTaggedAs(classElement.id, tagType)
        );

        // Return the array of tagged class elements
        return taggedClasses;
    }
    getAllRelationshipsTaggedAs(tagType: TagType): Apollon.UMLRelationship[] {
        // Get all relationships from the model
        const allRelationships = this.getAllRelationships();

        // Filter the relationships to include only those tagged with the specified tag type
        const taggedRelationships = allRelationships.filter((relationship: Apollon.UMLRelationship) =>
            this.hasRelationshipTag(relationship.id, tagType)
        );

        // Return the array of tagged relationship elements
        return taggedRelationships;
    }

    getRelationshipEndMultiplicity(relationshipId: string, end: 'source' | 'target'): RelationshipMultiplcity | undefined {
        // Get the relationship using its ID
        const relationship: Apollon.UMLAssociation | undefined = this.getRelationshipById(relationshipId);
        if (!relationship) {
            // If the relationship doesn't exist, log an error and return undefined
            console.error(`Cannot check ${end} multiplicity: Relationship with id ${relationshipId} not found in model`);
            return undefined;
        }

        const targetClassId: string = end === 'source' ? relationship.source.element : relationship.target.element;
        const targetClassName: string | undefined = this.getClassElementById(targetClassId)?.name;
        const multiplicityString: string = end === 'source' ? relationship.source.multiplicity : relationship.target.multiplicity;
        const multiplcity: { lower: number, upper: number } = this.getMultiplicityFromString(multiplicityString);

        if (!targetClassName) {
            // If the class name is not found, log an error and return undefined
            console.error(`Cannot check ${end} multiplicity: Class with id ${targetClassId} not found in model`);
            return undefined;
        }


        const relationshipMultiplcity: RelationshipMultiplcity = {
            relationshipId: relationship.id,
            end: end,
            targetClassId: targetClassId,
            targetClassName: targetClassName,
            lower: multiplcity.lower,
            upper: multiplcity.upper,
        };

        // Return the multiplicity of the specified end
        return relationshipMultiplcity;
    }

    public getRelationshipEndInfo = (relationshipId: string, targetEndType: 'source' | 'target'): RelationshipEndInfo => {
        // Reset the relationship options UI and get the relationship ID
        // This hides the options buttons and returns the ID of the relationship
        const relationship: Apollon.UMLAssociation = this.getRelationshipById(relationshipId!)!;

        // Determine which end of the relationship to tag based on the option selected
        // Option 1 is the source end, option 2 is the target end
        const sourceEndType: 'source' | 'target' = targetEndType === 'source' ? 'target' : 'source';

        const roleName: string = this.getRelationshipEndRoleById(relationshipId, targetEndType)!;
        const sourceClass: Apollon.UMLClassifier = this.getRelationshipEndClass(relationshipId, sourceEndType)!;
        const targetClass: Apollon.UMLClassifier = this.getRelationshipEndClass(relationshipId, targetEndType)!;
        const targetEndMultiplicity: RelationshipMultiplcity = this.getRelationshipEndMultiplicity(relationshipId, targetEndType)!;

        const taggedAssociationEndInfo: RelationshipEndInfo = {
            relationshipType: relationship.type,
            relationshipId: relationshipId,
            sourceClassId: sourceClass.id,
            targetClassId: targetClass.id,
            endType: targetEndType,
            roleName: roleName,
            multiplicity: targetEndMultiplicity
        }

        return taggedAssociationEndInfo;
    }

    private getMultiplicityFromString(multiplicityString: string): { lower: number, upper: number } {

        // If its empty or not correctly formatted, return default values.
        const number: number = Number(multiplicityString);
        if (!isNaN(Number(multiplicityString))) {
            return { lower: Number(multiplicityString), upper: Number(multiplicityString) };
        }

        // Check if the multiplicity string is empty or doesn't contain the expected format
        if (multiplicityString === "") {
            return { lower: 0, upper: 1 };
        }

        if (multiplicityString === "*") {
            // If the multiplicity string doesn't contain '..', return default values
            return { lower: 0, upper: Number.POSITIVE_INFINITY };
        }

        if (!multiplicityString.includes("..")) {

            return { lower: 0, upper: 1 };
        }

        // Split the multiplicity string into lower and upper bounds
        const [lower, upper] = multiplicityString.split('..').map(Number);
        // Return an object containing the lower and upper bounds
        return { lower: isNaN(lower) ? 0 : lower, upper: isNaN(upper) ? 1 : upper };
    }

    public getClassOutgoingAssociationsWithLowerMultiplicityNotZero(classId: string): Apollon.UMLAssociation[] {
        // Get all outgoing associations from the class
        const outgoingAssociations = this.getClassOutgoingAssociationsById(classId);
        if (!outgoingAssociations) return [];

        // Filter the associations to include only those with lower multiplicity not equal to zero
        const filteredAssociations = outgoingAssociations.filter((association: Apollon.UMLAssociation) => {
            // Find if the targetClass is source or target
            const targetClassEnd: 'source' | 'target' = this.getRelationshipOppositeEnd(association.id, classId)!;
            const targetMultiplicity: RelationshipMultiplcity = this.getRelationshipEndMultiplicity(association.id, targetClassEnd)!;

            return (targetMultiplicity.lower !== 0);
        });

        // Return the filtered array of associations
        return filteredAssociations;
    }


}

export default ModelQueryService;