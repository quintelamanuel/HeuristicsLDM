import { RelationshipEndInfo } from "../ModelManager/ModelQueryService";  // Import the type definition for relationship end information

/**
 * Custom Set implementation for RelationshipEndInfo objects based on value equality
 * Standard JavaScript Sets use reference equality, which doesn't work for complex objects with same values
 * This implementation generates string keys from object values to detect duplicates
 */
class RelationshipEndInfoSet {
    private map = new Map<string, RelationshipEndInfo>();  // Use a Map with string keys for storing unique relationship ends

    /**
     * Creates a new empty RelationshipEndInfoSet
     */
    constructor() { }  // No initialization needed as map is declared with default value

    /**
     * Adds a relationship end to the set if not already present
     * Uses value-based equality rather than reference-based equality
     * 
     * @param item - The relationship end information to add
     * @returns This set instance for method chaining
     */
    add(item: RelationshipEndInfo): this {
        const key = this.getRelationshipKey(item);  // Generate a unique string key based on the item's values
        if (!this.map.has(key)) {  // Only add if an item with the same values doesn't already exist
            this.map.set(key, item);  // Store the relationship end with its value-based key
        }
        return this;  // Return this instance for method chaining (following Set interface pattern)
    }

    /**
     * Checks if a relationship end with the same values exists in the set
     * Uses value-based equality rather than reference-based equality
     * 
     * @param item - The relationship end information to check for
     * @returns True if an item with the same values exists, false otherwise
     */
    has(item: RelationshipEndInfo): boolean {
        return this.map.has(this.getRelationshipKey(item));  // Check if the map contains an entry with this item's key
    }

    /**
     * Removes a relationship end with the same values from the set
     * Uses value-based equality rather than reference-based equality
     * 
     * @param item - The relationship end information to remove
     * @returns True if an item was removed, false if no matching item was found
     */
    delete(item: RelationshipEndInfo): boolean {
        return this.map.delete(this.getRelationshipKey(item));  // Remove the entry with this item's key if it exists
    }

    /**
     * Gets the number of unique relationship ends in the set
     * @returns The number of items in the set
     */
    get size(): number {
        return this.map.size;  // Return the number of entries in the underlying map
    }

    /**
     * Converts the set to an array of relationship end information objects
     * Useful for iteration and when passing to other functions
     * 
     * @returns Array containing all relationship ends in the set
     */
    toArray(): RelationshipEndInfo[] {
        return Array.from(this.map.values());  // Extract all values from the map into an array
    }

    /**
     * Removes all relationship ends from the set
     * Resets the set to its initial empty state
     */
    clear(): void {
        this.map.clear();  // Clear all entries from the underlying map
    }

    /**
     * Generates a unique string key for a relationship end based on its values
     * This is the core function that enables value equality checking
     * 
     * @param rel - The relationship end information to generate a key for
     * @returns A string key that uniquely identifies the relationship end's values
     * @private
     */
    private getRelationshipKey(rel: RelationshipEndInfo): string {
        return [
            rel.relationshipType,  // Include the type (inheritance, association, etc.)
            rel.relationshipId,    // Include the unique identifier
            rel.sourceClassId,     // Include the source class identifier
            rel.targetClassId,     // Include the target class identifier
            rel.endType,           // Include which end of the relationship this is
            rel.roleName,          // Include the role name at this end
            rel.multiplicity       // Include the multiplicity constraint
        ].join('|');  // Join all parts with pipe character to create a unique composite key
    }
}

export default RelationshipEndInfoSet;  // Export the class for use in other modules