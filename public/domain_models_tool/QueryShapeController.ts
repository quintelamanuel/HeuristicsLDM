import * as Apollon from '../../src/main';  // Import the Apollon UML modeling framework for working with UML elements
import { PathStep, QueryPath } from './QueryShapeManager/QueryShapeManager';  // Import types representing steps and paths in a query
import QueryPathBuilder from './QueryShapeManager/QueryPathBuilder';  // Import builder class for constructing query paths incrementally
import QueryShapeManager from './QueryShapeManager/QueryShapeManager';  // Import manager that handles creation and storage of query shapes
import { UpdaterService } from './UpdaterService';  // Import service for applying updates to the model (tags, highlights)
import { SidebarUIController } from './SidebarUIController';  // Import controller for sidebar UI interaction and state management
import { EditorManager, LastSelectionUpdateData } from './EditorManager';  // Import editor manager and selection data types
import { APP_CONFIG } from './AppConfig';  // Import application-wide configuration values for constants
import ModelManager from './ModelManager/ModelManager';  // Import model manager for direct model manipulation
import MultipleModelsManager from './MultipleModelsManager';  // Import multiple models manager for GDM/LDM coordination
import HeuristicsService from './HeuristicsService/HeuristicsService';  // Import service for applying business rules to models
import { RelationshipEndInfo } from './ModelManager/ModelQueryService';  // Import type for relationship end information
import { tagSelectedClassesAsQueried } from '..';
import { all } from 'redux-saga/effects';

/**
 * Controls query path creation and management
 * Separates query path logic from the main application entry point
 */
export class QueryShapeController {
    private currentQueryPathBuilder: QueryPathBuilder | null = null;  // Tracks the currently active query path builder (null when no path is being built)

    /**
     * Creates a new QueryShapeController
     * 
     * @param queryShapeManager - Manages query shapes and paths
     * @param updaterService - Updates the model with tags and highlights
     * @param sidebarUIController - Controls the sidebar UI state
     * @param editorManager - Manages editor state and selection
     * @param modelsManager - Manages GDM and LDM models
     * @param heuristicService - Applies business rules to models
     */
    constructor(
        private queryShapeManager: QueryShapeManager,  // Injected to manage query shapes (visual representation of paths)
        private updaterService: UpdaterService,  // Injected to apply model updates when building queries
        private sidebarUIController: SidebarUIController,  // Injected to update UI state based on query operations
        private editorManager: EditorManager,  // Injected to access current selection and editor state
        private modelsManager: MultipleModelsManager,  // Injected to access and modify both GDM and LDM models
        private heuristicService: HeuristicsService  // Injected to apply business rules when creating queries
    ) { }  // Empty constructor body as dependencies are injected through parameter properties

    /**
     * Checks if a query path creation is currently in progress
     * Used to determine UI state and available actions
     * 
     * @returns True if a query path is being constructed, false otherwise
     */
    public isQueryPathInProgress(): boolean {
        return this.currentQueryPathBuilder !== null;  // Return true if a builder exists, false otherwise
    }

    /**
     * Creates a new QueryPathBuilder starting from a root class
     * Sets up the builder and initializes UI state for path building
     * 
     * @param queryRootId - ID of the class selected as query root
     * @param queryRootClass - The class element selected as query root
     * @param modelManager - The model manager to use for queries
     * @returns The newly created QueryPathBuilder instance
     * @private
     */
    private createQueryPathBuilder(queryRootId: string, queryRootClass: Apollon.UMLClassifier, modelManager: ModelManager): QueryPathBuilder {
        const newCurrentQueryPathBuilder = new QueryPathBuilder(queryRootId, queryRootClass, modelManager);  // Create a new builder for the query path
        this.currentQueryPathBuilder = newCurrentQueryPathBuilder;  // Store the builder for subsequent operations
        this.sidebarUIController.setCurrentQueryPathBuilder(newCurrentQueryPathBuilder);  // Update UI to show the current builder
        return newCurrentQueryPathBuilder;  // Return the builder for immediate use
    }

    /**
     * Destroys the current query path builder
     * Cleans up state when query path creation is completed or canceled
     */
    public destroyCurrentQueryPathBuilder(): void {
        this.currentQueryPathBuilder = null;  // Clear the current builder reference
        this.sidebarUIController.setCurrentQueryPathBuilder(null);  // Update UI to show no active builder
    }

    /**
     * Highlights relationships that are valid next steps in the query path
     * Visually indicates which relationships can be selected for the next step
     * 
     * @param relationships - Array of relationship objects to highlight
     * @private
     */
    private highlightRelationshipsByRelationship(relationships: Apollon.UMLRelationship[]): void {
        const relationshipsIds: string[] = relationships.map((relationship) => relationship.id);  // Extract IDs from the relationship objects
        this.highlightRelationshipsById(relationshipsIds);  // Call the method to highlight by ID
    }

    /**
     * Highlights relationships by their IDs
     * Alternative method to highlight when only IDs are available
     * 
     * @param relationships - Array of relationship IDs to highlight
     * @private
     */
    private highlightRelationshipsById(relationships: string[]): void {

        this.updaterService.highlightRelationships(relationships, APP_CONFIG.HIGHLIGHT_COLOR);  // Clear previous highlighting
    }

    /**
     * Resets highlighting on all relationships
     * Clears visual indicators when switching modes or completing operations
     * @private
     */
    private resetHighlightedRelationships(): void {
        const allRelationships: Apollon.UMLRelationship[] = Object.values(
            this.modelsManager.getGDMManager().getModel().relationships  // Get all relationships from the model
        );
        const allRelationshipsIds: string[] = allRelationships.map((relationship) => relationship.id);  // Extract IDs of all relationships
        this.updaterService.resetHighlightedRelationships(allRelationshipsIds);
    }

    /**
     * Handles selecting a class as the root for a query path
     * Initiates the query path building process
     */
    public selectQueryRoot(): void {
        if (!this.currentQueryPathBuilder) {  // Only proceed if no query builder exists
            const currentSelection: Apollon.Selection | undefined = this.editorManager.getSelection();  // Get current selection from editor
            if (!currentSelection) {  // Validate that something is selected
                console.error('No selection found');  // Log error for debugging
                return;  // Exit early if no selection
            }

            const selectedElements: string[] = Object.keys(currentSelection.elements);  // Extract IDs of selected elements

            // The UI controls ensure that only one single class is selected
            if (selectedElements.length !== 1) {  // Validate that exactly one element is selected
                console.error('Selection is not a single class');  // Log error for debugging
                return;  // Exit early if multiple or no elements selected
            }

            const modelManager: ModelManager = this.modelsManager.getGDMManager();  // Get the GDM model manager
            const queryRootId: string = selectedElements[0];  // Get the ID of the selected class
            const queryRootClass: Apollon.UMLClassifier | undefined = modelManager.getClassElementById(queryRootId);  // Get the class element

            if (!queryRootClass) {  // Validate that the element is a class
                console.error('Query root class not found');  // Log error for debugging
                return;  // Exit early if not a class
            }

            this.queryShapeManager.addNewQueryShape(queryRootClass);  // Register a new query shape with this root
            this.currentQueryPathBuilder = this.createQueryPathBuilder(queryRootId, queryRootClass, modelManager);  // Create a builder for the new path

            // Call the tagging service to handle the business logic
            this.updaterService.startQueryRoot(queryRootId);  // Tag the class as a query root

            const validOutgoingRelationships = this.currentQueryPathBuilder.getValidOutgoingRelationshipsFromLastStep();  // Get valid next steps
            if (!validOutgoingRelationships) {  // Check if there are valid relationships
                console.error('No valid outgoing relationships found');  // Log error for debugging
                return;  // Exit early if no valid next steps
            }

            this.highlightRelationshipsByRelationship(validOutgoingRelationships);
            this.editorManager.setIsRootPathSelectionInProgress(true);  // Highlight valid relationships for next step
            this.heuristicService.addQueryRootId(queryRootId);  // Add class to query root set in heuristics service
        }

        // Update UI button states
        this.sidebarUIController.selectQueryRoot();  // Update UI to show query root selection mode
        this.sidebarUIController.updateAllButtonStates(
            false, false, false, this.isQueryPathInProgress(), false, false  // Set appropriate button states
        );
    }

    /**
     * Handles adding a step to an existing query path
     * Processes selection of a relationship for the next path step
     */
    public addToQueryPath(): void {

        if (!this.currentQueryPathBuilder) {  // Validate that a query builder exists
            throw new Error('No current query path builder found');  // Throw error if no builder
        }

        const currentSelection = this.sidebarUIController.getLastSelectionUpdateData();  // Get current selection from UI
        if (!currentSelection) {  // Validate that there is a selection
            console.error('No selection found');  // Log error for debugging
            return;  // Exit early if no selection
        }

        const validOutgoingRelationships = this.currentQueryPathBuilder.getValidOutgoingRelationshipsFromLastStep();  // Get valid next steps
        if (!validOutgoingRelationships) {  // Check if there are valid relationships
            console.error('No valid outgoing relationships found');  // Log error for debugging
            return;  // Exit early if no valid next steps
        }
        // Remove the last added relationship from the valid relationships.
        const filteredValidOutgoingRelationships = validOutgoingRelationships.filter(r => r.id !== this.currentQueryPathBuilder?.getLastStep()?.relationshipId);  // Filter out the last added relationship

        const selectedRelationshipIds = currentSelection.selectedRelationshipIds;  // Get IDs of selected relationships
        if (selectedRelationshipIds.length !== 1) {  // Validate that exactly one relationship is selected
            console.error('Selection is not a single relationship');  // Log error for debugging
            return;  // Exit early if multiple or no relationships selected
        }

        const selectedRelationshipId = selectedRelationshipIds[0];  // Get the ID of the selected relationship
        const validRelationshipIds = filteredValidOutgoingRelationships.map(r => r.id);  // Extract IDs of valid relationships

        if (!validRelationshipIds.includes(selectedRelationshipId)) {  // Validate that selected relationship is valid
            console.error('Selected relationship is not valid');  // Log error for debugging
            return;  // Exit early if relationship is not valid
        }

        // Add the step to the query path
        this.currentQueryPathBuilder.addStep(selectedRelationshipId);  // Add the selected relationship as a step
        this.resetHighlightedRelationships();  // Clear previous highlighting

        // Highlight the new valid outgoing relationships
        const newValidRelationships = this.currentQueryPathBuilder.getValidOutgoingRelationshipsFromLastStep();  // Get new valid next steps
        if (!newValidRelationships) {  // Check if there are valid relationships
            throw new Error('No valid outgoing relationships found after adding step');  // Throw error if no valid next steps
        }

        //Remove the currently added relationship from the valid relationships.
        const filteredNewValidRelationshipIds = newValidRelationships.filter(r => r.id !== selectedRelationshipId);  // Filter out the added relationship

        this.highlightRelationshipsByRelationship(filteredNewValidRelationshipIds);  // Highlight new valid relationships

        // Tag the classes and relationships
        const lastStep = this.currentQueryPathBuilder.getLastStep();  // Get the last step that was just added
        if (!lastStep) {  // Validate that a step exists
            throw new Error('No last step found');  // Throw error if no step
        }

        const targetClassId = lastStep.targetClassId;  // Get the target class of the step
        const modelManager = this.modelsManager.getGDMManager();  // Get the GDM model manager
        const endType = modelManager.getRelationsipIsSourceOrTarget(selectedRelationshipId, targetClassId);  // Determine relationship end type

        if (!endType) {  // Validate that end type was determined
            throw new Error('No type of end found');  // Throw error if end type unknown
        }

        this.updaterService.tagRelationshipEndAsQueried(selectedRelationshipId, endType);  // Tag the relationship end as queried
        this.updaterService.tagClassAsQueried([targetClassId]);  // Tag the target class as queried

        const taggedAssociationEndInfo: RelationshipEndInfo = this.modelsManager.getGDMManager().getAssociationEndInfo(selectedRelationshipId, endType)!;  // Get relationship end info
        this.heuristicService.addQueriedRelationshipEndInfo(taggedAssociationEndInfo);  // Add relationship end to queried set in heuristics service
        this.heuristicService.addQueriedClassId(targetClassId);  // Add target class to queried set in heuristics service
    }

    /**
     * Handles finishing a query path
     * Completes the current path and updates the query shape
     */
    public finishQueryPath(): void {
        if (!this.currentQueryPathBuilder) {  // Validate that a query builder exists
            throw new Error('No current query path builder found');  // Throw error if no builder
        }

        const queryRootId = this.currentQueryPathBuilder.getQueryRootId();  // Get the root class ID
        const queryPath = this.currentQueryPathBuilder.getQueryPath();  // Get the complete query path

        this.queryShapeManager.addQueryPath(queryRootId, queryPath);  // Add the completed path to the query shape
        this.destroyCurrentQueryPathBuilder();  // Clean up the builder

        // Call the tagging service
        this.updaterService.finishQueryPath();  // Trigger finalization of tag changes

        this.editorManager.setIsRootPathSelectionInProgress(false);  // Reset editor state
        // Reset UI state
        this.sidebarUIController.finishQueryPath();  // Update UI to show query path is completed
        this.resetHighlightedRelationships();  // Clear relationship highlighting
        this.sidebarUIController.updateAllButtonStates(
            false, false, false, this.isQueryPathInProgress(), false, false  // Reset button states
        );
    }

    /**
     * Highlights all relationships in a specific query shape
     * Used when viewing an existing query shape
     * 
     * @param queryRootId - ID of the root class of the query shape to highlight
     */
    public highlightQueryShape(queryRootId: string): void {
        this.resetHighlightedRelationships();  // Clear previous highlighting
        const queryShape = this.queryShapeManager.getQueryShape(queryRootId);  // Get the query shape for the root
        if (!queryShape) {  // Validate that query shape exists
            return;  // Exit early if no query shape
        }

        const allRelationshipsInQueryShape: Set<string> = new Set();  // Create a set to track unique relationship IDs

        for (const path of queryShape.queryPaths) {  // Iterate through each path in the shape
            for (const step of path) {  // Iterate through each step in the path
                allRelationshipsInQueryShape.add(step.relationshipId);  // Add relationship ID to the set
            }
        }

        this.highlightRelationshipsById(Array.from(allRelationshipsInQueryShape));  // Highlight all relationships in the query shape
    }

    /**
     * Stops displaying a query shape
     * Clears highlighting and resets UI state
     */
    public stopShowingQueryShape(): void {
        this.resetHighlightedRelationships();  // Clear relationship highlighting
        this.sidebarUIController.stopShowingQueryShape();  // Update UI to indicate no query shape is being shown
    }
}