// Import core Apollon UML library for type definitions related to UML elements
import * as Apollon from '../../../src/main';
// Import types related to query paths and shapes from QueryShapeManager
import { PathStep, QueryPath, QueryShape } from './QueryShapeManager';
// Import ModelManager for accessing and manipulating UML model data
import ModelManager from '../ModelManager/ModelManager';

/**
 * Builds and manages query paths that traverse through UML class relationships
 * A query path represents a traversal sequence through a UML model following relationships between classes
 */
class QueryPathBuilder {
    // Store the ID of the root class where this query path begins
    private queryRootId: string;
    // Store the actual UML Classifier object for the root class (contains name, attributes, etc.)
    private queryRootClass: Apollon.UMLClassifier;
    // Store the query path as an array of steps (each step represents traversing one relationship)
    private queryPath: QueryPath;
    // Reference to the model manager for checking relationship traversal validity
    private modelManager: ModelManager;

    /**
     * Creates a new QueryPathBuilder starting from a specified root class
     * 
     * @param queryRootId - ID of the root class where query paths will start from
     * @param queryRootClass - The full UML Classifier object for the root class
     * @param modelManager - Reference to model manager for validation and lookups
     */
    constructor(queryRootId: string, queryRootClass: Apollon.UMLClassifier, modelManager: ModelManager) {
        // Store the root class ID for reference when building paths
        this.queryRootId = queryRootId;
        // Store the full root class object which contains additional information like name
        this.queryRootClass = queryRootClass;
        // Initialize an empty query path (will be built step by step)
        this.queryPath = [];
        // Store reference to the model manager for validation operations
        this.modelManager = modelManager;
    }

    /**
     * Adds a new step to the query path
     * Validates that the step is possible based on the model's relationships
     * 
     * @param relationshipId - ID of the relationship to traverse
     * @param roleName - Role name on the target end of the relationship 
     * @param targetClassId - ID of the target class to reach in this step
     * @param targetClassName - Name of the target class (for readability)
     * @throws Error if the target is not directly reachable from the current position
     */
    public addStep(relationshipId: string): void {

        // Get the last step in the current query path (if any)
        const lastStep: PathStep | undefined = this.getLastStep();

        // If there is no previous step, the source class is the root class.
        const sourceClassId: string = lastStep ? lastStep.targetClassId : this.queryRootId;

        // Get the source class name from the last step or root class
        const targetClass: Apollon.UMLClassifier | undefined = this.modelManager.getRelationshipOppositeEndClass(relationshipId, sourceClassId);

        // If the target class is not found, throw an error indicating the issue
        if (!targetClass) {
            throw new Error(`QueryPathBuilder Error: Unable to find target class for relationship ID ${relationshipId}`);
        }

        // Get the relationship end rolename for the class
        const roleName: string | undefined = this.modelManager.getRelationshipEndClassRoleName(relationshipId, targetClass.id);

        // If the role name is not found, throw an error indicating the issue
        if (roleName === undefined) {
            throw new Error(`QueryPathBuilder Error: Unable to find role name for relationship ID ${relationshipId}`);
        }

        // Create a path step object that represents this traversal
        const stepToAdd: PathStep = this.buildPathStep(relationshipId, roleName, targetClass.id, targetClass.name);

        // Verify that this step is valid by checking if the target class is directly reachable 
        // from the source class through the specified relationship
        const isTargetDirectlyReachableFromSource: boolean = this.modelManager.isClassDirectlyReachableFrom(
            stepToAdd.sourceClassId,
            stepToAdd.targetClassId,
            stepToAdd.relationshipId,
        )

        // If the target is not directly reachable, throw an error with details
        if (!isTargetDirectlyReachableFromSource) {
            // Detailed error message helps with debugging why the path couldn't be built
            throw new Error(`QueryPathBuilder Error: Target class ${targetClass.name} is not directly reachable from source class ${stepToAdd.sourceClassName}`);
        }

        // If validation passed, add the new step to the end of the query path
        this.queryPath.push(stepToAdd);
    }

    /**
     * Removes a step and all subsequent steps from the query path
     * Acts like a "trim" operation, removing everything from a specific point onwards
     * 
     * @param relationshipId - ID of the relationship in the step to remove
     * @param roleName - Role name of the step to remove
     * @param targetClassId - Target class ID of the step to remove
     * @param targetClassName - Target class name of the step to remove
     */
    public removeElementsFromStep(relationshipId: string, roleName: string, targetClassId: string, targetClassName: string): void {
        // Build a path step object that matches the step to find and remove
        const stepToRemove: PathStep = this.buildPathStep(relationshipId, roleName, targetClassId, targetClassName);
        // Find the index of the step in the existing path
        const stepIndex = this.queryPath.indexOf(stepToRemove);
        // If the step is not found in the path, exit early without modifying the path
        if (stepIndex === -1) return;

        // Remove the identified step and all subsequent steps from the query path
        // This effectively "trims" the path from this point onwards
        this.queryPath = this.queryPath.slice(stepIndex, this.queryPath.length - stepIndex);
    }

    /**
     * Creates a new PathStep object with the provided information
     * Determines the source class based on the current state of the path
     * 
     * @param relationshipId - ID of the relationship to traverse
     * @param roleName - Role name on the target end of the relationship
     * @param targetClassId - ID of the target class to reach in this step
     * @param targetClassName - Name of the target class
     * @returns A fully populated PathStep object
     * @private
     */
    private buildPathStep(relationshipId: string, roleName: string, targetClassId: string, targetClassName: string): PathStep {
        // Get the most recent step in the query path (will be undefined if path is empty)
        const lastStep = this.getLastStep();

        // Determine the source class based on whether there's a previous step
        // If there's no previous step, use the root class as the source
        // Otherwise, use the target class of the previous step as the source for this step
        const sourceClassId = lastStep ? lastStep.targetClassId : this.queryRootId;
        const sourceClassName = lastStep ? lastStep.targetClassName : this.queryRootClass.name;

        // Create and return a new path step object with all required fields
        const step: PathStep = {
            relationshipId,   // ID of the relationship being traversed
            roleName,         // Role name on the target end of the relationship
            sourceClassId,    // ID of the class at the start of this step
            sourceClassName,  // Name of the class at the start of this step (for readability)
            targetClassId,    // ID of the class at the end of this step
            targetClassName   // Name of the class at the end of this step (for readability)
        };

        return step;
    }

    /**
     * Gets the last (most recent) step in the query path
     * 
     * @returns The last step in the path, or undefined if the path is empty
     * @private
     */
    public getLastStep(): PathStep | undefined {
        // If the path is empty, return undefined since there is no last step
        if (this.queryPath.length === 0) {
            return undefined;
        }
        // Return the last element from the query path array
        return this.queryPath[this.queryPath.length - 1];
    }

    public getValidOutgoingRelationshipsFromLastStep(): Apollon.UMLRelationship[] | undefined {

        // Get the last step in the query path
        const lastStep: PathStep | undefined = this.getLastStep();

        // If there is no last step, use the root class ID as the source class ID
        const lastStepClassIdToUse: string = lastStep ? lastStep.targetClassId : this.queryRootId;

        // Get the valid outgoing relationships from the last step class
        const validOutgoingRelationshipsFromLastStep: Apollon.UMLRelationship[] | undefined = this.modelManager.getClassOutgoingAssociationsById(lastStepClassIdToUse);

        return validOutgoingRelationshipsFromLastStep;
    }

    /**
     * Gets the current query path
     * 
     * @returns The complete query path with all its steps
     */
    public getQueryPath(): QueryPath {
        // Return the current state of the query path
        // This allows external code to access the built path
        return this.queryPath;
    }

    public getQueryRootId(): string {
        // Return the ID of the root class where this query path starts
        return this.queryRootId;
    }
    public getQueryRootClass(): Apollon.UMLClassifier {
        // Return the full UML Classifier object for the root class
        return this.queryRootClass;
    }
}

// Export the QueryPathBuilder class for use in other modules
export default QueryPathBuilder;