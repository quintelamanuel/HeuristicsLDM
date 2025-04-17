// Import the Apollon UML library to access UML element types and utilities
import * as Apollon from '../../../src/main';

// Define the structure of a single step in a query path
// This represents one traversal from a source class to a target class through a relationship
export type PathStep = {
    relationshipId: string;    // ID of the relationship being traversed
    roleName: string;          // Role name on the target end of the relationship
    sourceClassId: string;     // ID of the class at the start of this step
    sourceClassName: string;   // Name of the class at the start of this step (for readability)
    targetClassId: string;     // ID of the class at the end of this step
    targetClassName: string;   // Name of the class at the end of this step (for readability)
};

// A query path is an ordered sequence of steps that represents a traversal path through the model
// Starting from a root class and following relationships to other classes
export type QueryPath = PathStep[];

// A query shape consists of a root class and multiple query paths that start from that root
// This represents all the ways to traverse the model from a specific starting point
export type QueryShape = {
    rootClass: Apollon.UMLClassifier;  // The UML class that serves as the starting point
    queryPaths: QueryPath[];           // All valid traversal paths from this root
};

/**
 * Manages query shapes for model traversal patterns
 * 
 * A query shape defines how to traverse a UML model starting from a specific root class,
 * following relationships to reach other classes. This is useful for code generation
 * and query building in model-driven development.
 */
class QueryShapeManager {
    /**
     * Dictionary of query shapes indexed by root class ID
     * Stores all defined query shapes in the application
     * @private
     */
    private queryShapes: Record<string, QueryShape> = {};

    /**
     * Creates a new QueryShapeManager
     * Initializes an empty collection of query shapes
     */
    constructor() {
        // Initialize queryShapes as an empty object
        // This will store all the query shapes indexed by their root class ID
        this.queryShapes = {};
    }

    /**
     * Adds a new query shape with the specified class as root
     * If a query shape already exists for this root class, this method does nothing
     * 
     * @param rootClass - The UML class to use as the root of the query shape
     */
    public addNewQueryShape(rootClass: Apollon.UMLClassifier): void {
        // Check if a query shape already exists for this root class
        // This prevents accidentally overwriting an existing query shape
        if (this.queryShapes[rootClass.id]) {
            // If it exists, exit early without making changes
            return;
        }

        // Create a new query shape with the given root class and an empty array of query paths
        // The paths will be added later using the addQueryPath method
        this.queryShapes[rootClass.id] = { rootClass: rootClass, queryPaths: [] };
    }

    /**
     * Gets a query shape by its root class ID
     * 
     * @param rootClassId - ID of the root class to find the query shape for
     * @returns The query shape if found, or undefined if no shape exists for this root
     */
    public getQueryShape(rootClassId: string): QueryShape | undefined {
        // Return the query shape object associated with the provided root class ID
        // If no query shape exists for this ID, this will return undefined
        return this.queryShapes[rootClassId];
    }

    /**
     * Removes a query shape by its root class ID
     * 
     * @param rootClassId - ID of the root class whose query shape should be removed
     */
    public removeQueryShape(rootClassId: string): void {
        // Delete the query shape associated with the provided root class ID
        // This removes both the root class reference and all its query paths
        delete this.queryShapes[rootClassId];
    }

    /**
     * Adds a query path to an existing query shape
     * 
     * @param rootClassId - ID of the root class to add the path to
     * @param queryPath - The query path to add (sequence of steps)
     */
    public addQueryPath(rootClassId: string, queryPath: QueryPath): void {
        // Get the query shape associated with the provided root class ID
        let queryShape = this.queryShapes[rootClassId];

        // Check if the query shape exists before adding the path
        if (!queryShape) {
            throw new Error(`Query shape with root class ID ${rootClassId} does not exist.`);
        }
        // Add the new query path to the array of paths in this query shape
        queryShape.queryPaths.push(queryPath);
    }

    public getQueryPaths(rootClassId: string): QueryPath[] {
        // Get the query shape associated with the provided root class ID
        const queryShape = this.queryShapes[rootClassId];

        // If there is no query shape return an empty array
        if (!queryShape) {
            return [];
        }
        // Return the array of query paths for this root class
        return queryShape.queryPaths;
    }

    /**
     * Generates a string representation of all query shapes
     * The output format is a JSON-like structure with root classes and their paths
     * 
     * @returns Formatted string containing all query shapes
     */
    public toString(): string {
        // Start building the output string with an opening brace
        // This creates a JSON-like object structure
        let result = '{\n';

        // Iterate through all query shapes using their root class IDs as keys
        for (const rootClassId in this.queryShapes) {
            // Get the current query shape object
            const queryShape = this.queryShapes[rootClassId];
            // Get the name of the root class for display purposes
            const rootClassName = queryShape.rootClass.name;

            // Add an entry for this query shape with proper indentation
            // Use the toStringQueryPath method to format the paths
            result += `    "${rootClassId}::${rootClassName}": ${this.toStringQueryPath(rootClassId)},\n`;
        }

        // Close the object structure with a closing brace
        result += '}';

        // Return the complete formatted string
        return result;
    }

    /**
     * Generates a formatted string representation of a query shape
     * The output format is a JSON-like structure with the root class and paths
     * 
     * Example output format:
     * "Root::Student": [
     *     ["subjects::Subject", "teacher::Teacher"],
     *     ["subjects::Subject", "tasks::Task", "questions::Question"]
     * ]
     * 
     * @param rootClassId - ID of the root class for the query shape
     * @returns Formatted string representation of the query shape
     */
    public toStringQueryPath(rootClassId: string): string {
        // Get the query shape for the given root class ID
        const queryShape = this.queryShapes[rootClassId];

        // If no query shape exists for this ID, return empty string
        if (!queryShape) {
            return '';
        }

        // Get the root class name to use in the output
        const rootClassName = queryShape.rootClass.name;

        // Start building the output string with the root class header
        // Format it as "Root::ClassName": [ to start an array
        let result = `"Root::${rootClassName}": [\n`;

        // Process each query path and format it as a string
        const formattedPaths = queryShape.queryPaths.map((path) => {
            // Format each step in the path as "roleName::targetClassName"
            // This creates a readable representation of each traversal step
            const formattedSteps = path.map(step =>
                `"${step.roleName}::${step.targetClassName}"`
            );

            // Join the steps with commas and wrap in square brackets
            // Each path becomes an array within the outer array
            return `    [${formattedSteps.join(', ')}]`;
        });

        // Join all paths with newlines for readability
        // Each path appears on its own line
        result += formattedPaths.join('\n');

        // Close the outer array bracket to complete the JSON-like structure
        result += '\n]';

        // Return the complete formatted string for this query shape
        return result;
    }

    /**
     * Resets all query shapes to an empty state
     * This clears all previously defined query shapes and paths
     */
    public resetQueryShapes(): void {
        // Reset the query shapes to an empty object
        // This clears all previously defined query shapes
        this.queryShapes = {};
    }
}

// Export the QueryShapeManager class as the default export for this module
export default QueryShapeManager;