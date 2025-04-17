/* eslint-disable no-console */  // Disables ESLint warnings about console usage to allow logging
import * as Apollon from '../../src/main';  // Imports all exports from the main Apollon package
import { EditorManager } from './EditorManager';  // Imports EditorManager class for editor manipulation
import MultipleModelsManager from './MultipleModelsManager';  // Imports MultipleModelsManager for handling multiple UML models
import { APP_CONFIG } from './AppConfig';  // Imports application configuration constants
import { RelationshipEndInfo } from './ModelManager/ModelQueryService';  // Imports type definition for relationship end information

/**
 * TaggingService handles applying special tags to UML elements.
 * This service centralizes tagging operations used for model-driven development workflows.
 */
export class UpdaterService {  // Defines the UpdaterService class to be exported for use elsewhere
    /**
     * Create a new TaggingService
     * @param editorManager - Reference to the editor manager
     * @param modelsManager - Reference to the models manager
     */
    constructor(
        private editorManager: EditorManager,  // Injects and stores EditorManager as a private property
        private modelsManager: MultipleModelsManager  // Injects and stores MultipleModelsManager as a private property
    ) { }  // Empty constructor body as properties are defined in the parameter list using TypeScript shorthand

    /**
     * Process selected classes and apply a tagging method to them
     * @param tagMethod - Function to apply to each selected element
     */
    private tagSelectedClasses(stringIds: string[], tagMethod: (elementId: string) => void): void {  // Defines a private method for applying tags to multiple classes
        // Get the active editor
        const { editor, editorId } = this.editorManager.getActiveEditor();  // Retrieves the currently active editor and its ID
        if (!editor) return;  // Guards against proceeding if no editor is active

        // Get selection from the active editor
        const selection = this.editorManager.getSelection();  // Gets the current selection from the active editor
        if (!selection) return;  // Guards against proceeding if nothing is selected

        // Track if any updates were made
        let updated = false;  // Initializes a flag to track if changes are made to avoid unnecessary re-rendering

        // Apply tag to each selected element
        for (const stringId of stringIds) {  // Iterates through each provided class ID
            // We need to bind tag method to models manager because otherwise the "this" in the models manager method will be undefined.
            tagMethod = tagMethod.bind(this.modelsManager);  // Binds the tag method to the models manager to ensure proper context
            // Once the object modelsManager has been binded as the this for the method, we can call the method.
            tagMethod(stringId);  // Calls the bound tag method with the current class ID
            updated = true;  // Sets the updated flag to true as we've made a change
        }

        // If changes were made, update the model and re-render
        if (updated) {  // Checks if any updates were made to avoid unnecessary operations
            // Update model in ModelsManager based on which editor is active
            if (editorId === APP_CONFIG.EDITOR_IDS.GDM) {  // Checks if the active editor is the Global Domain Model
                // Update the Global Domain Model (GDM)
                const gdmModel: Apollon.UMLModel = this.modelsManager.getModelGDM() as Apollon.UMLModel  // Retrieves the updated GDM model
                this.editorManager.updateOptions(editorId, { model: gdmModel });  // Updates the editor with the modified model
            } else {  // Handles the case where the active editor is not GDM (must be LDM)
                // Update the Local Domain Model (LDM)
                const ldmModel: Apollon.UMLModel = this.modelsManager.getModelLDM() as Apollon.UMLModel  // Retrieves the updated LDM model
                this.editorManager.updateOptions(editorId, { model: ldmModel });  // Updates the editor with the modified model
            }

            // Re-render the editor to show changes
            this.editorManager.render(editorId);  // Rerenders the editor to display the updated model with new tags
        }
    }

    private removeTagFromClasses(stringIds: string[], removeTagMethod: (elementId: string) => void): void {  // Defines a private method for removing tags from multiple classes
        // Get the active editor
        const { editor, editorId } = this.editorManager.getActiveEditor();  // Retrieves the currently active editor and its ID
        if (!editor) return;  // Guards against proceeding if no editor is active

        // Get selection from the active editor
        const selection = this.editorManager.getSelection();  // Gets the current selection from the active editor
        if (!selection) return;  // Guards against proceeding if nothing is selected

        // Track if any updates were made
        let updated = false;  // Initializes a flag to track if changes are made to avoid unnecessary re-rendering

        // Apply tag to each selected element
        for (const stringId of stringIds) {  // Iterates through each provided class ID
            // We need to bind tag method to models manager because otherwise the "this" in the models manager method will be undefined.
            removeTagMethod = removeTagMethod.bind(this.modelsManager);  // Binds the remove tag method to the models manager to ensure proper context
            // Once the object modelsManager has been binded as the this for the method, we can call the method.
            removeTagMethod(stringId);  // Calls the bound remove tag method with the current class ID
            updated = true;  // Sets the updated flag to true as we've made a change
        }

        // If changes were made, update the model and re-render
        if (updated) {
            // Update model in ModelsManager based on which editor is active
            if (editorId === APP_CONFIG.EDITOR_IDS.GDM) {  // Checks if the active editor is the Global Domain Model
                // Update the Global Domain Model (GDM)
                const gdmModel: Apollon.UMLModel = this.modelsManager.getModelGDM() as Apollon.UMLModel  // Retrieves the updated GDM model
                this.editorManager.updateOptions(editorId, { model: gdmModel });  // Updates the editor with the modified model
            } else {  // Handles the case where the active editor is not GDM (must be LDM)
                // Update the Local Domain Model (LDM)
                const ldmModel: Apollon.UMLModel = this.modelsManager.getModelLDM() as Apollon.UMLModel  // Retrieves the updated LDM model
                this.editorManager.updateOptions(editorId, { model: ldmModel });  // Updates the editor with the modified model
            }

            // Re-render the editor to show changes
            this.editorManager.render(editorId);  // Rerenders the editor to display the updated model with new tags
        }

    }

    public removeTagClassPending(stringIds: string[]): void {
        this.removeTagFromClasses(stringIds, this.modelsManager.removeClassTagPending);
    }

    /**
     * Tag selected elements as instantiable
     */
    public tagClassAsInstantiable(stringIds: string[]): void {
        this.tagSelectedClasses(stringIds, this.modelsManager.tagClassAsInstantiable);
    }

    /**
     * Tag selected elements as modifiable
     */
    public tagClassAsModifiable(stringIds: string[]): void {
        this.tagSelectedClasses(stringIds, this.modelsManager.tagClassAsModifiable);
    }

    /**
     * Tag selected elements as required
     */
    public tagClassAsRequired(stringIds: string[]): void {
        this.tagSelectedClasses(stringIds, this.modelsManager.tagClassAsRequired);
    }

    /**
     * Tag selected elements as queried
     */
    public tagClassAsQueried(stringIds: string[]): void {
        this.tagSelectedClasses(stringIds, this.modelsManager.tagClassAsQueried);
    }

    public tagClassAsQueryRoot(stringIds: string[]): void {
        this.tagSelectedClasses(stringIds, this.modelsManager.tagClassAsQueryRoot);
    }

    public tagClassAsPending(stringIds: string[]): void {
        this.tagSelectedClasses(stringIds, this.modelsManager.tagClassAsPending);
    }


    /**
     * Tag selected relationship ends as modifiable
     * This method is used to apply the modifiable tag to the ends of selected relationships
     * @param tagMethod - Function to apply to each selected element
     */
    private tagRelationshipEndAs(relationshipId: string, end: 'source' | 'target', tagMethod: (relationshipId: string, end: 'source' | 'target') => void): void {
        // Get the active editor
        const { editor, editorId } = this.editorManager.getActiveEditor();
        if (!editor) return;

        // Get selection from the active editor
        const selection: Apollon.Selection | undefined = this.editorManager.getSelection();
        if (!selection) return;

        //If there is more than one selected relationship, return
        const selectedRelationships: string[] = Object.keys(selection.relationships);
        if (selectedRelationships.length > 1) {
            console.error('Cannot tag multiple relationships at once');
            return;
        }

        // If its not an association, aggregation or composition, return
        const validTypes: Apollon.UMLRelationshipType[] = ['ClassUnidirectional', 'ClassBidirectional', 'ClassAggregation', 'ClassComposition'];
        const selectedRelationship: Apollon.UMLRelationship | undefined = this.modelsManager.getGDMManager().getRelationshipById(relationshipId) as Apollon.UMLRelationship;
        if (!selectedRelationship || !validTypes.includes(selectedRelationship.type)) {
            console.error('Please select an association, aggregation, or composition');
            return;
        }

        // We need to bind tag method to models manager because otherwise the "this" in the models manager method will be undefined.
        tagMethod = tagMethod.bind(this.modelsManager);
        // Once the object modelsManager has been binded as the this for the method, we can call the method.
        tagMethod(relationshipId, end);

        // Update the model in ModelsManager based on which editor is active
        if (editorId === APP_CONFIG.EDITOR_IDS.GDM) {
            // Update the Global Domain Model (GDM)
            const gdmModel: Apollon.UMLModel = this.modelsManager.getModelGDM() as Apollon.UMLModel
            this.editorManager.updateOptions(editorId, { model: gdmModel });
        }
        else {
            // Update the Local Domain Model (LDM)
            const ldmModel: Apollon.UMLModel = this.modelsManager.getModelLDM() as Apollon.UMLModel
            this.editorManager.updateOptions(editorId, { model: ldmModel });
        }
        // Re-render the editor to show changes
        this.editorManager.render(editorId);
    }

    /**
     * Tag selected relationship ends as modifiable
     * This method is used to apply the modifiable tag to the ends of selected relationships
     * @param tagMethod - Function to apply to each selected element
     */
    public tagRelationshipEndAsModifiable(relationshipId: string, end: 'source' | 'target'): void {
        this.tagRelationshipEndAs(relationshipId, end, this.modelsManager.tagRelationshipEndAsModifiable);
    }

    public tagRelationshipEndAsQueried(relationshipId: string, end: 'source' | 'target'): void {
        this.tagRelationshipEndAs(relationshipId, end, this.modelsManager.tagRelationshipEndAsQueried);
    }

    /**
     * Copy selected elements from Global Domain Model to Local Domain Model
     */
    public copySelectedElementsToLDM(): void {
        // Only proceed if both editors are available
        const gdmEditor = this.editorManager.getEditor(APP_CONFIG.EDITOR_IDS.GDM);
        const ldmEditor = this.editorManager.getEditor(APP_CONFIG.EDITOR_IDS.LDM);

        if (!gdmEditor || !ldmEditor) {
            console.error('Cannot copy: One or both editors are not available');
            return;
        }

        // Get the selected elements from GDM
        const selection: Apollon.Selection = gdmEditor.selection;
        const selectedElementIds: string[] = Object.keys(selection.elements);
        // Then, copy relationships (unidirectional, bidirectional, aggregation and composition) between selected elements.
        const selectedRelationshipsIds: string[] = Object.keys(selection.relationships);

        this.copyElementsToLDM(selectedElementIds, selectedRelationshipsIds);

    }

    public updateLDMAfterHeuristics(classesIds: string[], relationshipsEndInfo: string[]): void {
        this.editorManager.clearInactiveModel();
        this.copyElementsToLDM(classesIds, relationshipsEndInfo);
    }

    /**
    * Copy selected elements from Global Domain Model to Local Domain Model
    */
    public copyElementsToLDM(classesIds: string[], relationshipsEndInfo: string[]): void {
        // Only proceed if both editors are available
        const gdmEditor = this.editorManager.getEditor(APP_CONFIG.EDITOR_IDS.GDM);
        const ldmEditor = this.editorManager.getEditor(APP_CONFIG.EDITOR_IDS.LDM);

        if (!gdmEditor || !ldmEditor) {
            console.error('Cannot copy: One or both editors are not available');
            return;
        }

        let updated = false;

        // First, copy all selected classifiers
        for (const classId of classesIds) {
            // Copy the element from GDM to LDM
            this.modelsManager.copyClassifierFromGDMToLDMById(classId);
            updated = true;
        }

        for (const relationshipId of relationshipsEndInfo) {
            //Get the source and target of the relationship
            const relationship: Apollon.UMLAssociation = this.modelsManager.getGDMManager().getRelationshipById(relationshipId) as Apollon.UMLAssociation;
            // Check if the relationship is valid
            const sourceClassId: string = relationship.source.element;
            const targetClassId: string = relationship.target.element;

            // Check if both classes are selected or in LDM
            const bothClassesSelected: boolean = classesIds.includes(sourceClassId) && classesIds.includes(targetClassId);

            // Check if both classes are in LDM
            const sourceClassInLDM: boolean = this.modelsManager.getLDMManager().getClassElementById(sourceClassId) !== undefined;
            const targetClassInLDM: boolean = this.modelsManager.getLDMManager().getClassElementById(targetClassId) !== undefined;
            const bothClassesINLDM: boolean = sourceClassInLDM && targetClassInLDM;

            // Copy the relationship from GDM to LDM if both classes are selected or in LDM
            if (bothClassesSelected || bothClassesINLDM) {
                this.modelsManager.copyRelationshipFromGDMToLDMById(relationship.id);
                updated = true;
            }
        }

        // If elements were copied, update models and re-render
        if (updated) {
            // Update editor models
            const gdmModel: Apollon.UMLModel = this.modelsManager.getModelGDM() as Apollon.UMLModel;
            this.editorManager.updateOptions(APP_CONFIG.EDITOR_IDS.GDM, { model: gdmModel });

            const ldmModel: Apollon.UMLModel = this.modelsManager.getModelLDM() as Apollon.UMLModel;
            this.editorManager.updateOptions(APP_CONFIG.EDITOR_IDS.LDM, { model: ldmModel });

            // Re-render both editors
            this.editorManager.renderAll();
        }
    }

    public updateLDMRelationships(requiredRelationshipsEndInfo: RelationshipEndInfo[]) {
        // Only proceed if both editors are available
        const gdmEditor = this.editorManager.getEditor(APP_CONFIG.EDITOR_IDS.GDM);
        const ldmEditor = this.editorManager.getEditor(APP_CONFIG.EDITOR_IDS.LDM);

        if (!gdmEditor || !ldmEditor) {
            console.error('Cannot copy: One or both editors are not available');
            return;
        }

        let updated: boolean = false;

        // Update the relationships in LDM
        for (const relationshipEndInfo of requiredRelationshipsEndInfo) {
            const relationshipType: Apollon.UMLRelationshipType = relationshipEndInfo.relationshipType;
            const revisableTypes: Apollon.UMLRelationshipType[] = ['ClassBidirectional', 'ClassAggregation', 'ClassComposition'];
            if (revisableTypes.includes(relationshipType)) {
                this.modelsManager.updateLDMRelationship(relationshipEndInfo, requiredRelationshipsEndInfo);
                updated = true;
            }
        }

        // If elements were copied, update models and re-render
        if (updated) {
            // Update editor models
            const gdmModel: Apollon.UMLModel = this.modelsManager.getModelGDM() as Apollon.UMLModel;
            this.editorManager.updateOptions(APP_CONFIG.EDITOR_IDS.GDM, { model: gdmModel });

            const ldmModel: Apollon.UMLModel = this.modelsManager.getModelLDM() as Apollon.UMLModel;
            this.editorManager.updateOptions(APP_CONFIG.EDITOR_IDS.LDM, { model: ldmModel });

            // Re-render both editors
            this.editorManager.renderAll();
        }
    }

    /**
     * Get information about a selected relationship for modifiable tagging
     * @returns Object containing relationship information or undefined if invalid selection
     */
    public getSelectedRelationshipInfo(): {
        relationshipId: string,
        sourceRole: string,
        targetRole: string
    } | undefined {
        // Get selection from the active editor
        const selection = this.editorManager.getSelection();
        if (!selection) return undefined;

        // Check if exactly one relationship is selected
        const selectedRelationships = Object.keys(selection.relationships || {});
        if (selectedRelationships.length !== 1) {
            console.log('Please select exactly one relationship');
            return undefined;
        }

        const relationshipId = selectedRelationships[0];
        const model = this.editorManager.getActiveEditor().editorId === APP_CONFIG.EDITOR_IDS.GDM
            ? this.modelsManager.getModelGDM()
            : this.modelsManager.getModelLDM();

        if (!model || !model.relationships[relationshipId]) return undefined;

        const relationship: Apollon.UMLAssociation = model.relationships[relationshipId];

        // Check if the selected element is a valid relationship type
        const validTypes = ['ClassUnidirectional', 'ClassBidirectional', 'ClassAggregation', 'ClassComposition'];
        if (!validTypes.includes(relationship.type)) {
            console.log('Please select an association, aggregation, or composition');
            return undefined;
        }

        // Get source and target role names
        const sourceRole = relationship.source.role || 'Source';
        const targetRole = relationship.target.role || 'Target';

        return { relationshipId, sourceRole, targetRole };
    }

    /**
     * Initialize tagging service and set up event listeners
     */
    public initialize(): void {
        // Set up event listeners for selection changes
        document.addEventListener('apollon:selection-changed', (event: Event) => {
            const customEvent: CustomEvent = event as CustomEvent;
            const {
                selectedElementIds,
                selectedRelationshipIds,
                activeEditorId
            } = customEvent.detail;

            // If configured, perform automatic tagging on selection
            if (APP_CONFIG.AUTO_TAG_ON_SELECTION) {
                this.handleAutoTagging(selectedElementIds, selectedRelationshipIds, activeEditorId);
            }
        });
    }

    /**
     * Handle automatic tagging when elements are selected
     */
    private handleAutoTagging(
        selectedElementIds: string[],
        selectedRelationshipIds: string[],
        activeEditorId: string
    ): void {
        // Example: Auto-tag selected classes as "required" when in LDM editor
        if (activeEditorId === APP_CONFIG.EDITOR_IDS.LDM) {
            for (const elementId of selectedElementIds) {
                const element = this.modelsManager.getLDMManager().getClassElementById(elementId);
                if (element && element.type === Apollon.UMLElementType.Class) {
                    this.modelsManager.tagClassAsRequired(elementId);
                }
            }

            // Re-render the active editor to show new tags
            this.editorManager.render(activeEditorId);
        }
    }

    public startQueryRoot(stringId: string): void {
        console.log(`startQueryShapeRoot(${stringId}) from TaggingService`);
        // Passed as an array because the generic tagging method expects an array
        this.tagClassAsQueryRoot([stringId]);
    }

    public addToQueryPath(rootId: string, lastTaggedClassId: string, relationshipId: string): void {

        const targetClass: Apollon.UMLClassifier | undefined = this.modelsManager.getGDMManager().getRelationshipOppositeEndClass(lastTaggedClassId, relationshipId);

        if (!targetClass) {
            throw new Error(`Target class not found for relationship ID: ${relationshipId}`);
        }

        this.tagRelationshipEndAsQueried(relationshipId, 'source');
        this.tagClassAsQueried([targetClass.id]);

        console.log('addToQueryPath() from TaggingService');
    }
    public finishQueryPath(): void {
        console.log('finishQueryPath() from TaggingService');
    }

    public highlightRelationships(relationshipsIds: string[], colorRGB: string): void {
        // Get the active editor
        const { editor, editorId } = this.editorManager.getActiveEditor();
        if (!editor) return;

        // Highlight the relationships in the active editor
        for (const relationshipId of relationshipsIds) {
            this.modelsManager.changeRelationshipStrokeColor(relationshipId, colorRGB);
        }
        this.editorManager.updateOptions(editorId, { model: this.modelsManager.getModelGDM() as Apollon.UMLModel });
        this.editorManager.render(editorId);
    }

    public highlightRelationship(relationshipId: string, colorRGB: string): void {
        // Get the active editor
        const { editor, editorId } = this.editorManager.getActiveEditor();
        if (!editor) return;

        // Highlight the relationships in the active editor
        this.modelsManager.changeRelationshipStrokeColor(relationshipId, colorRGB);
        this.editorManager.updateOptions(editorId, { model: this.modelsManager.getModelGDM() as Apollon.UMLModel });
        this.editorManager.render(editorId);
    }

    public resetHighlightedRelationships(relationshipsIds: string[]): void {
        // Get the active editor
        const { editor, editorId } = this.editorManager.getActiveEditor();
        if (!editor) return;

        for (const relationshipId of relationshipsIds) {
            // Highlight the relationships in the active editor
            this.modelsManager.resetRelationshipStrokeColor(relationshipId);
        }
        this.editorManager.updateOptions(editorId, { model: this.modelsManager.getModelGDM() as Apollon.UMLModel });
        this.editorManager.render(editorId);
    }

    public resetHighlightedRelationship(relationshipId: string): void {
        // Get the active editor
        const { editor, editorId } = this.editorManager.getActiveEditor();
        if (!editor) return;

        // Highlight the relationships in the active editor
        this.modelsManager.resetRelationshipStrokeColor(relationshipId);
        this.editorManager.updateOptions(editorId, { model: this.modelsManager.getModelGDM() as Apollon.UMLModel });
        this.editorManager.render(editorId);
    }
}