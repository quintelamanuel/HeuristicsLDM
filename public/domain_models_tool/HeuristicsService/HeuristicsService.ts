import * as Apollon from '../../../src/main';  // Import core Apollon UML modeling framework for model types
import { EditorManager } from "../EditorManager";  // Import editor management functions for UI interaction
import MultipleModelsManager from "../MultipleModelsManager";  // Import for managing both GDM and LDM models
import { RelationshipMultiplcity } from "../ModelManager/ModelQueryService";  // Import type for relationship multiplicity definition
import QueryShapeManager from "../QueryShapeManager/QueryShapeManager";  // Import for managing query shapes in the UI
import { UpdaterService } from "../UpdaterService";  // Import for applying updates to models
import { RelationshipEndInfo } from "../ModelManager/ModelQueryService";  // Import type for relationship endpoint metadata
import ModelManager from "../ModelManager/ModelManager";  // Import for lower-level model operations
import RelationshipEndInfoSet from './ValueEqualitySet';  // Import custom set implementation for relationship end information

/**
 * Service that implements domain modeling heuristics to maintain model consistency
 * Analyzes relationships between classes and applies tagging rules automatically
 * Acts as the reasoning engine that maintains the derived LDM based on GDM tags
 */
class HeuristicsService {
    private instantiableClassesIds: Set<string>;  // Tracks class IDs that can be instantiated in the application
    private modifiableClassesIds: Set<string>;  // Tracks class IDs that can be modified through user operations
    private queryRootsIds: Set<string>;  // Tracks class IDs that serve as starting points for queries
    private queriedClassesIds: Set<string>;  // Tracks class IDs that are included in query results
    private requiredClassesIds: Set<string>;  // Tracks class IDs that must be included in the LDM

    private modifiableRelationshipsEndInfo: RelationshipEndInfoSet;  // Tracks relationship ends that can be modified
    private queriedRelationshipsEndInfo: RelationshipEndInfoSet;  // Tracks relationship ends that appear in queries
    private requiredRelationshipsEndInfo: RelationshipEndInfoSet;  // Tracks relationship ends that must be in the LDM

    private pendingClassesIds: Set<string>;  // Tracks class IDs that need attention (unresolved status)
    private changesSinceLastHeuristicRun: boolean;  // Flag to track if heuristic execution made changes

    private modelsManager: MultipleModelsManager;  // Reference to the models manager for accessing GDM and LDM
    private updaterService: UpdaterService;  // Reference to the service that applies tags and updates
    private queryShapeManager: QueryShapeManager;  // Reference to the service managing query visualization
    private editorManager: EditorManager;  // Reference to the editor management service for UI updates

    /**
     * Creates a new HeuristicsService instance
     * 
     * @param modelsManager - Reference to the models manager for accessing model data
     * @param updaterService - Reference to the service that applies updates to models
     * @param queryShapeManager - Reference to the service managing query visualization
     */
    constructor(modelsManager: MultipleModelsManager, updaterService: UpdaterService, queryShapeManager: QueryShapeManager) {
        this.instantiableClassesIds = new Set<string>();  // Initialize empty set for instantiable classes
        this.modifiableClassesIds = new Set<string>();  // Initialize empty set for modifiable classes
        this.queryRootsIds = new Set<string>();  // Initialize empty set for query root classes
        this.queriedClassesIds = new Set<string>();  // Initialize empty set for queried classes
        this.requiredClassesIds = new Set<string>();  // Initialize empty set for required classes
        this.pendingClassesIds = new Set<string>();  // Initialize empty set for pending classes
        this.changesSinceLastHeuristicRun = false;  // Initialize change tracking flag to false

        this.modifiableRelationshipsEndInfo = new RelationshipEndInfoSet();  // Initialize empty set for modifiable relationship ends
        this.queriedRelationshipsEndInfo = new RelationshipEndInfoSet();  // Initialize empty set for queried relationship ends
        this.requiredRelationshipsEndInfo = new RelationshipEndInfoSet();  // Initialize empty set for required relationship ends

        this.modelsManager = modelsManager;  // Store reference to models manager
        this.updaterService = updaterService;  // Store reference to updater service
        this.queryShapeManager = queryShapeManager;  // Store reference to query shape manager
    }

    /**
     * Clears all heuristics tracking data
     * Resets the service state to an empty state with no tags
     */
    public clearHeuristicsData(): void {
        this.instantiableClassesIds.clear();  // Remove all instantiable class IDs
        this.modifiableClassesIds.clear();  // Remove all modifiable class IDs
        this.queryRootsIds.clear();  // Remove all query root class IDs
        this.queriedClassesIds.clear();  // Remove all queried class IDs
        this.requiredClassesIds.clear();  // Remove all required class IDs
        this.pendingClassesIds.clear();  // Remove all pending class IDs

        this.modifiableRelationshipsEndInfo.clear();  // Remove all modifiable relationship end info
        this.queriedRelationshipsEndInfo.clear();  // Remove all queried relationship end info
        this.requiredRelationshipsEndInfo.clear();  // Remove all required relationship end info

        this.changesSinceLastHeuristicRun = false;  // Reset change tracking flag
    }

    /**
     * Runs the heuristic rules repeatedly until a fixed point is reached
     * A fixed point is reached when no new tags are added during an iteration
     * @private
     */
    private runHeuristicsLoop(): void {
        this.changesSinceLastHeuristicRun = false;  // Reset change tracking flag at start of iteration

        // Store initial set sizes to detect changes after heuristics run
        const allTagsSizes = {  // Create object to track sizes of all tag sets
            instantiableClassesIds: this.instantiableClassesIds.size,  // Record current size of instantiable classes
            modifiableClassesIds: this.modifiableClassesIds.size,  // Record current size of modifiable classes
            queryRootsIds: this.queryRootsIds.size,  // Record current size of query root classes
            queriedClassesIds: this.queriedClassesIds.size,  // Record current size of queried classes
            requiredClassesIds: this.requiredClassesIds.size,  // Record current size of required classes
            pendingClassesIds: this.pendingClassesIds.size,  // Record current size of pending classes
            modifiableRelationshipsEndInfo: this.modifiableRelationshipsEndInfo.size,  // Record current size of modifiable relationship ends
            queriedRelationshipsEndInfo: this.queriedRelationshipsEndInfo.size,  // Record current size of queried relationship ends
            requiredRelationshipsEndInfo: this.requiredRelationshipsEndInfo.size,  // Record current size of required relationship ends
        };

        // Apply all heuristic rules in sequence
        this.heuristic1_anyTagIsAlsoTaggedAsRequired();  // Apply rule: any tagged class is also required
        this.heuristic2_nonZeroLowerCardinalities();  // Apply rule: relationships with non-zero lower cardinality are required
        this.heuristic3_parentClasses();  // Apply rule: parent classes of required classes are required
        this.heuristic4_requiredRelationshipsEnds();  // Apply rule: classes at ends of required relationships are required
        this.constraintVerification_eitherIntantiableOrQueried();  // Verify constraint: classes must be either instantiable or queried

        // Check if any set sizes changed during this iteration
        for (const [tag, size] of Object.entries(allTagsSizes)) {  // Iterate through each tag set
            const newSize = this[tag].size;  // Get current size after heuristics run
            if (newSize !== size) {  // Compare with size before heuristics
                this.changesSinceLastHeuristicRun = true;  // Set flag if size changed
                break;  // Exit loop early once we know changes occurred
            }
        }

        // If changes occurred, run the heuristics again until fixed point
        if (this.changesSinceLastHeuristicRun) {  // Check change flag
            this.runHeuristicsLoop();  // Recursively call to continue iterations
        }
    }

    /**
     * Updates the Local Domain Model with the results of the heuristics
     * Transfers required classes and relationships to the LDM
     * @private
     */
    private updateLDM(): void {
        // Convert sets to arrays for the updater service
        const requiredClassesIds: string[] = Array.from(this.requiredClassesIds);  // Convert required classes set to array
        const requiredRelationshipsEndInfo: RelationshipEndInfo[] = this.requiredRelationshipsEndInfo.toArray();  // Convert required relationship ends to array
        const requiredRelationshipsIds: string[] = this.requiredRelationshipsEndInfo.toArray().map(
            (relationshipEndInfo: RelationshipEndInfo) => relationshipEndInfo.relationshipId  // Extract just the relationship IDs
        );

        // Update the LDM with required elements
        this.updaterService.updateLDMAfterHeuristics(requiredClassesIds, requiredRelationshipsIds);  // Update LDM with required classes and relationships
        this.updaterService.updateLDMRelationships(requiredRelationshipsEndInfo);  // Update LDM relationships with detailed end information
    }

    /**
     * Runs all heuristic rules and updates the LDM with the results
     * This is the main entry point for the heuristic engine
     * @private
     */
    private runHeuristics(): void {
        this.runHeuristicsLoop();  // Run heuristics until fixed point
        this.updateLDM();  // Update LDM with the results
    }

    /**
     * Marks multiple classes as required
     * Helper method for heuristic rules to update the required set
     * 
     * @param classesIds - Array of class IDs to mark as required
     * @private
     */
    private makeClassesRequired(classesIds: string[]) {
        for (const classId of classesIds) {  // Iterate through each class ID
            this.requiredClassesIds.add(classId);  // Add class ID to required set
        }
    }

    /**
     * Marks multiple relationship ends as required
     * Helper method for heuristic rules to update the required set
     * 
     * @param relationshipsEndInfo - Array of relationship end info to mark as required
     * @private
     */
    private makeRelationshipsRequired(relationshipsEndInfo: RelationshipEndInfo[]) {
        for (const relationshipEndInfo of relationshipsEndInfo) {  // Iterate through each relationship end
            this.requiredRelationshipsEndInfo.add(relationshipEndInfo);  // Add relationship end to required set
        }
    }

    /**
     * Heuristic rule 1: Any class with any tag is also required
     * Ensures that all tagged classes are included in the LDM
     * @private
     */
    private heuristic1_anyTagIsAlsoTaggedAsRequired(): void {
        // Combine all tagged classes into one set
        const allTaggedClassesIds: Set<string> = new Set([  // Create a unified set of all tagged classes
            ...this.instantiableClassesIds,  // Include all instantiable classes
            ...this.modifiableClassesIds,  // Include all modifiable classes
            ...this.queryRootsIds,  // Include all query root classes
            ...this.queriedClassesIds,  // Include all queried classes
        ]);
        this.makeClassesRequired(Array.from(allTaggedClassesIds));  // Mark all tagged classes as required

        // Combine all tagged relationship ends into one set
        const allTaggedRelationshipsEndInfo: Set<RelationshipEndInfo> = new Set([  // Create a unified set of all tagged relationship ends
            ...this.modifiableRelationshipsEndInfo.toArray(),  // Include all modifiable relationship ends
            ...this.queriedRelationshipsEndInfo.toArray(),  // Include all queried relationship ends
        ]);
        this.makeRelationshipsRequired(Array.from(allTaggedRelationshipsEndInfo));  // Mark all tagged relationship ends as required
    }

    /**
     * Heuristic rule 2: Relationships with non-zero lower cardinality are required
     * Ensures that mandatory relationships (minimum cardinality > 0) are included
     * @private
     */
    private heuristic2_nonZeroLowerCardinalities(): void {
        const gdmModelManager: ModelManager = this.modelsManager.getGDMManager();  // Get access to GDM model

        // For each instantiable class, check its outgoing relationships with non-zero lower multiplicity
        for (const instantiableClassId of this.instantiableClassesIds) {  // Iterate through instantiable classes
            // Get relationships where this class has outgoing connections with lower bound > 0
            const relationships: Apollon.UMLAssociation[] = gdmModelManager.getClassOutgoingAssociationsWithLowerMultiplicityNotZero(instantiableClassId)!;

            // For each such relationship, mark both ends as required
            for (const relationship of relationships) {  // Iterate through each relationship
                // Determine if this class is at source or target end
                const relationshipEndType: 'source' | 'target' = gdmModelManager.getRelationsipIsSourceOrTarget(relationship.id, instantiableClassId)!;
                const oppositeRelationshipEndType: 'source' | 'target' = relationshipEndType === 'source' ? 'target' : 'source';  // Get the opposite end

                // Get information about both ends of the relationship
                const relationshipEndInfo: RelationshipEndInfo = gdmModelManager.getAssociationEndInfo(relationship.id, relationshipEndType)!;
                const oppositeRelationshipEndInfo: RelationshipEndInfo = gdmModelManager.getAssociationEndInfo(relationship.id, oppositeRelationshipEndType)!;

                // Mark both ends as required
                this.requiredRelationshipsEndInfo.add(relationshipEndInfo);  // Add this end to required set
                this.requiredRelationshipsEndInfo.add(oppositeRelationshipEndInfo);  // Add opposite end to required set
            }
        }
    }

    /**
     * Heuristic rule 3: Parent classes of required classes are also required
     * Ensures that inheritance hierarchies are complete in the LDM
     * @private
     */
    private heuristic3_parentClasses(): void {
        const gdmModelManager: ModelManager = this.modelsManager.getGDMManager();  // Get access to GDM model

        // For each required class, check if it has a parent and mark the parent relationship as required
        for (const requiredClassId of this.requiredClassesIds) {  // Iterate through required classes
            // Get the parent class if one exists
            const parentClass: Apollon.UMLClassifier | undefined = gdmModelManager.getClassParent(requiredClassId);

            if (!parentClass) {  // Skip if class has no parent
                continue;  // Continue to next required class
            }

            // Get the inheritance relationship to the parent
            const parentClassRelationship: Apollon.UMLRelationship = gdmModelManager.getClassParentRelationship(requiredClassId)!;

            // Mark the target end of the inheritance relationship as required
            const relationshipEndType: 'source' | 'target' = 'target';  // Inheritance relationships target the parent
            const relationshipEndInfo: RelationshipEndInfo = gdmModelManager.getAssociationEndInfo(parentClassRelationship.id, relationshipEndType)!;
            this.requiredRelationshipsEndInfo.add(relationshipEndInfo);  // Add parent relationship end to required set
        }
    }

    /**
     * Heuristic rule 4: Classes at either end of required relationships are required
     * Ensures that relationships don't point to non-existent classes
     * @private
     */
    private heuristic4_requiredRelationshipsEnds(): void {
        // Combine all tagged relationship ends into one set
        const allTaggedRelationshipsEndInfo: Set<RelationshipEndInfo> = new Set([  // Create a unified set of all tagged relationship ends
            ...this.modifiableRelationshipsEndInfo.toArray(),  // Include all modifiable relationship ends
            ...this.queriedRelationshipsEndInfo.toArray(),  // Include all queried relationship ends
            ...this.requiredRelationshipsEndInfo.toArray()  // Include all required relationship ends
        ]);

        // For each tagged relationship end, mark both classes at source and target as required
        for (const relationshipEndInfo of allTaggedRelationshipsEndInfo) {  // Iterate through each relationship end
            this.requiredClassesIds.add(relationshipEndInfo.sourceClassId);  // Add source class to required set
            this.requiredClassesIds.add(relationshipEndInfo.targetClassId);  // Add target class to required set
        }
    }

    /**
     * Checks if a class is a parent in any inheritance relationship
     * Helper method for constraint verification
     * 
     * @param classId - The ID of the class to check
     * @returns True if the class is a parent in any inheritance relationship
     * @private
     */
    private isClassParent(classId: string): boolean {
        // Check all required relationship ends for inheritance relationships targeting this class
        for (const requiredRelationshipsEndInfo of this.requiredRelationshipsEndInfo.toArray()) {  // Iterate through required relationship ends
            const isInheritanceRelationship: boolean = requiredRelationshipsEndInfo.relationshipType === 'ClassInheritance';  // Check if it's inheritance
            const isClassTarget: boolean = requiredRelationshipsEndInfo.targetClassId === classId;  // Check if this class is the target (parent)
            if (isInheritanceRelationship && isClassTarget) {  // If both conditions are true
                return true;  // Class is a parent, return true
            }
        }
        return false;  // Class is not a parent, return false
    }

    /**
     * Constraint verification: Required classes must be either instantiable, queried, or parent classes
     * Marks classes that don't meet this constraint as pending for user review
     * @private
     */
    private constraintVerification_eitherIntantiableOrQueried(): void {
        // Check each required class against the constraint
        for (const requiredClassId of this.requiredClassesIds) {  // Iterate through required classes
            // Check all possible valid tags that would satisfy the constraint
            const isTaggedAsInstantiable: boolean = this.instantiableClassesIds.has(requiredClassId);  // Check if class is instantiable
            const isTaggedAsQueried: boolean = this.queriedClassesIds.has(requiredClassId);  // Check if class is queried
            const isTaggedAsQueryRoot: boolean = this.queryRootsIds.has(requiredClassId);  // Check if class is a query root
            const isTaggedAsPending: boolean = this.pendingClassesIds.has(requiredClassId);  // Check if class is already pending
            const isParentClass: boolean = this.isClassParent(requiredClassId);  // Check if class is a parent class

            // If the class doesn't meet any of the satisfaction criteria, mark it as pending
            if (!isTaggedAsInstantiable && !isTaggedAsQueried && !isTaggedAsQueryRoot && !isParentClass) {  // If none of the valid tags exist
                this.pendingClassesIds.add(requiredClassId);  // Add to pending set
                this.updaterService.tagClassAsPending([requiredClassId]);  // Apply pending tag in the model
            } else if (isTaggedAsPending) {  // If class was previously pending but now satisfies a criterion
                this.pendingClassesIds.delete(requiredClassId);  // Remove from pending set
                this.updaterService.removeTagClassPending([requiredClassId]);  // Remove pending tag in the model
            }
        }
    }

    /**
     * Adds a class to the instantiable set and runs heuristics
     * Instantiable classes can be created in the application
     * 
     * @param classId - The ID of the class to mark as instantiable
     */
    public addInstantiableClassId(classId: string): void {
        const classElement = this.modelsManager.getGDMManager().getClassElementById(classId);  // Get the class element
        if (classElement?.type === 'Class') {  // Verify it's a Class (not an interface, etc.)
            {
                this.instantiableClassesIds.add(classId);  // Add to instantiable set
                this.runHeuristics();  // Run heuristics to update derived tags
            }
        }
    }

    /**
     * Adds a class to the modifiable set and runs heuristics
     * Modifiable classes can be updated by users in the application
     * 
     * @param classId - The ID of the class to mark as modifiable
     */
    public addModifiableClassId(classId: string): void {
        const classElement = this.modelsManager.getGDMManager().getClassElementById(classId);  // Get the class element
        if (classElement?.type === 'Class') {  // Verify it's a Class (not an interface, etc.)
            {
                this.modifiableClassesIds.add(classId);  // Add to modifiable set
                this.runHeuristics();  // Run heuristics to update derived tags
            }
        }
    }

    /**
     * Adds a relationship end to the modifiable set and runs heuristics
     * Modifiable relationship ends can be updated by users in the application
     * 
     * @param taggedAssociationEndInfo - Information about the relationship end to mark as modifiable
     */
    public addModifiableRelationshipId(taggedAssociationEndInfo: RelationshipEndInfo): void {
        this.modifiableRelationshipsEndInfo.add(taggedAssociationEndInfo);  // Add to modifiable relationship ends set
        this.runHeuristics();  // Run heuristics to update derived tags
    }

    /**
     * Adds a class to the query root set and runs heuristics
     * Query root classes serve as entry points for queries
     * 
     * @param classId - The ID of the class to mark as a query root
     */
    public addQueryRootId(classId: string): void {
        const classElement = this.modelsManager.getGDMManager().getClassElementById(classId);  // Get the class element
        if (classElement?.type === 'Class') {  // Verify it's a Class (not an interface, etc.)
            {
                this.queryRootsIds.add(classId);  // Add to query roots set
                this.runHeuristics();  // Run heuristics to update derived tags
            }
        }
    }

    /**
     * Adds a class to the queried set and runs heuristics
     * Queried classes are included in query results
     * 
     * @param classId - The ID of the class to mark as queried
     */
    public addQueriedClassId(classId: string): void {
        const classElement = this.modelsManager.getGDMManager().getClassElementById(classId);  // Get the class element
        if (classElement?.type === 'Class') {  // Verify it's a Class (not an interface, etc.)
            {
                this.queriedClassesIds.add(classId);  // Add to queried classes set
                this.runHeuristics();  // Run heuristics to update derived tags
            }
        }
    }

    /**
     * Adds a relationship end to the queried set and runs heuristics
     * Queried relationship ends are included in query traversals
     * 
     * @param taggedAssociationEndInfo - Information about the relationship end to mark as queried
     */
    public addQueriedRelationshipEndInfo(taggedAssociationEndInfo: RelationshipEndInfo): void {
        this.queriedRelationshipsEndInfo.add(taggedAssociationEndInfo);  // Add to queried relationship ends set
        this.runHeuristics();  // Run heuristics to update derived tags
    }

    /**
     * Adds a class to the required set and runs heuristics
     * Required classes must be included in the LDM
     * 
     * @param classId - The ID of the class to mark as required
     */
    public addRequiredClassId(classId: string): void {
        const classElement = this.modelsManager.getGDMManager().getClassElementById(classId);  // Get the class element
        if (classElement?.type === 'Class') {  // Verify it's a Class (not an interface, etc.)
            {
                this.requiredClassesIds.add(classId);  // Add to required classes set
                this.runHeuristics();  // Run heuristics to update derived tags
            }
        }
    }

    /**
     * Adds a relationship end to the required set and runs heuristics
     * Required relationship ends must be included in the LDM
     * 
     * @param taggedAssociationEndInfo - Information about the relationship end to mark as required
     */
    public addRequiredRelationshipEndInfo(taggedAssociationEndInfo: RelationshipEndInfo): void {
        this.requiredRelationshipsEndInfo.add(taggedAssociationEndInfo);  // Add to required relationship ends set
        this.runHeuristics();  // Run heuristics to update derived tags
    }

    /**
     * Adds a class to the pending set and runs heuristics
     * Pending classes need user review to resolve their status
     * 
     * @param classId - The ID of the class to mark as pending
     */
    public addPendingClassId(classId: string): void {
        const classElement = this.modelsManager.getGDMManager().getClassElementById(classId);  // Get the class element
        if (classElement?.type === 'Class') {  // Verify it's a Class (not an interface, etc.)
            {
                this.pendingClassesIds.add(classId);  // Add to pending classes set
                this.runHeuristics();  // Run heuristics to update derived tags
            }
        }
    }

    /**
     * Gets the set of instantiable class IDs
     * @returns Set of class IDs marked as instantiable
     */
    public getInstantiableClassesIds(): Set<string> {
        return this.instantiableClassesIds;  // Return the instantiable classes set
    }

    /**
     * Gets the set of modifiable class IDs
     * @returns Set of class IDs marked as modifiable
     */
    public getModifiableClassesIds(): Set<string> {
        return this.modifiableClassesIds;  // Return the modifiable classes set
    }

    /**
     * Gets the set of modifiable relationship end information
     * @returns Set of relationship ends marked as modifiable
     */
    public getModifiableRelationshipsEndInfo(): RelationshipEndInfoSet {
        return this.modifiableRelationshipsEndInfo;  // Return the modifiable relationship ends set
    }

    /**
     * Gets the set of query root class IDs
     * @returns Set of class IDs marked as query roots
     */
    public getQueryRootsIds(): Set<string> {
        return this.queryRootsIds;  // Return the query root classes set
    }

    /**
     * Gets the set of queried class IDs
     * @returns Set of class IDs marked as queried
     */
    public getQueriedClassesIds(): Set<string> {
        return this.queriedClassesIds;  // Return the queried classes set
    }

    /**
     * Gets the set of queried relationship end information
     * @returns Set of relationship ends marked as queried
     */
    public getQueriedRelationshipsIds(): RelationshipEndInfoSet {
        return this.queriedRelationshipsEndInfo;  // Return the queried relationship ends set
    }

    /**
     * Gets the set of required class IDs
     * @returns Set of class IDs marked as required
     */
    public getRequiredClassesIds(): Set<string> {
        return this.requiredClassesIds;  // Return the required classes set
    }

    /**
     * Gets the set of required relationship end information
     * @returns Set of relationship ends marked as required
     */
    public getRequiredRelationshipsIds(): RelationshipEndInfoSet {
        return this.requiredRelationshipsEndInfo;  // Return the required relationship ends set
    }

    /**
     * Gets the set of pending class IDs
     * @returns Set of class IDs marked as pending
     */
    public getPendingClassesIds(): Set<string> {
        return this.pendingClassesIds;  // Return the pending classes set
    }

    /**
     * Clears all tag sets
     * Removes all tracking of tagged elements
     */
    public clear(): void {
        this.instantiableClassesIds.clear();  // Clear instantiable classes
        this.modifiableClassesIds.clear();  // Clear modifiable classes
        this.modifiableRelationshipsEndInfo.clear();  // Clear modifiable relationship ends
        this.queryRootsIds.clear();  // Clear query root classes
        this.queriedClassesIds.clear();  // Clear queried classes
        this.queriedRelationshipsEndInfo.clear();  // Clear queried relationship ends
        this.requiredClassesIds.clear();  // Clear required classes
        this.requiredRelationshipsEndInfo.clear();  // Clear required relationship ends
        this.pendingClassesIds.clear();  // Clear pending classes
    }

    /**
     * Gets the union of all tagged class IDs
     * @returns Set containing all class IDs with any tag
     */
    public getAllClassesIds(): Set<string> {
        return new Set([  // Create a new set with the union of all tagged classes
            ...this.instantiableClassesIds,  // Include instantiable classes
            ...this.modifiableClassesIds,  // Include modifiable classes
            ...this.queryRootsIds,  // Include query root classes
            ...this.queriedClassesIds,  // Include queried classes
            ...this.requiredClassesIds,  // Include required classes
            ...this.pendingClassesIds,  // Include pending classes
        ]);
    }
}

export default HeuristicsService;  // Export the class for use in other modules