/**
 * Main entry point for the Apollon UML editor application.
 * This file bootstraps the application by initializing services and exposing methods
 * that are bound to UI elements in the HTML interface.
 */
import * as Apollon from '../src/main';
// Import services and configuration
import { SidebarUIController } from './domain_models_tool/SidebarUIController';
import { UpdaterService } from './domain_models_tool/UpdaterService';
import { ExportService } from './domain_models_tool/ExportService';
import { EditorManager, EditorOperationResult } from './domain_models_tool/EditorManager';
import { APP_CONFIG } from './domain_models_tool/AppConfig';
import MultipleModelsManager from './domain_models_tool/MultipleModelsManager';
import QueryShapeManager from './domain_models_tool/QueryShapeManager/QueryShapeManager';
import { QueryShapeController } from './domain_models_tool/QueryShapeController';
import HeuristicsService from './domain_models_tool/HeuristicsService/HeuristicsService';
import ModelManager from './domain_models_tool/ModelManager/ModelManager';
import { RelationshipEndInfo, RelationshipMultiplcity } from './domain_models_tool/ModelManager/ModelQueryService';
import InteractionLabHeuristics from './interaction_lab_heuristics';

// Import CSS styles
// @ts-ignore - Css import handled by webpack
import('./styles.css');

// Service instance declarations - these will be initialized in initializeServices()
let modelsManager: MultipleModelsManager;
let editorManager: EditorManager;
let sidebarUIController: SidebarUIController;
let updaterService: UpdaterService;
let exportService: ExportService;
let queryShapeManager: QueryShapeManager;
let queryShapeController: QueryShapeController;
let heuristicsService: HeuristicsService;

let interactionLabId: string;
let experimentRunning: boolean = false;

/**
 * Initializes all application services in the correct dependency order.
 * This function creates the service instances needed by the application
 * while ensuring proper dependency injection between components.
 */
function initializeServices(): void {
  // Create the models manager first, which manages both Global and Local Domain Models
  // We pass the storage keys from config to determine where models are stored in localStorage
  modelsManager = new MultipleModelsManager(
    APP_CONFIG.STORAGE_KEYS.GDM,  // Key for storing Global Domain Model
    APP_CONFIG.STORAGE_KEYS.LDM   // Key for storing Local Domain Model
  );

  // Create editor manager with a reference to the models manager
  // The editor manager needs access to models to render them in the editors
  editorManager = new EditorManager(modelsManager);

  // Create the UI controller with a reference to the editor manager
  // UI controller needs to interact with editors to update their state
  sidebarUIController = new SidebarUIController(editorManager);

  // Create the updater service for modifying models
  // It needs both editor and models managers to update models and refresh editors
  updaterService = new UpdaterService(editorManager, modelsManager);

  // Create the export service for saving diagrams
  // It only needs the editor manager to access the current editor state
  exportService = new ExportService(editorManager);

  // Create the query shape manager for handling query shapes
  // This is a standalone service for now with no dependencies
  queryShapeManager = new QueryShapeManager();

  heuristicsService = new HeuristicsService(
    modelsManager,      // For accessing model data and structure 
    updaterService,     // For applying heuristic changes to models
    queryShapeManager,  // For handling query shapes during heuristics
  );

  // Create the query shape controller which coordinates query path operations
  // It needs access to many services to coordinate the complex query path workflow
  queryShapeController = new QueryShapeController(
    queryShapeManager,  // For creating and storing query shapes
    updaterService,     // For applying tags to elements in query paths
    sidebarUIController, // For updating UI state during query path creation
    editorManager,      // For accessing and updating editors
    modelsManager,       // For accessing model data
    heuristicsService   // For applying heuristics during query path creation
  );


}

/**
 * Main application initialization function.
 * Called when the DOM is ready to bootstrap the application.
 */
function main(): void {
  // Initialize all services first
  // This must happen before any UI interactions
  initializeServices();

  // Initialize the editor manager which sets up the diagram editors
  // This creates editor instances and renders them in the DOM
  editorManager.initialize();

  // Initialize the UI controller which sets up event listeners and styles
  // This prepares the UI for user interaction
  sidebarUIController.initialize();

  // Initialize the tagging service if it has an initialize method
  // This is a safety check since the service may not always have this method
  if (typeof updaterService.initialize === 'function') {
    updaterService.initialize();
  }
}

// Initialize the application when the DOM content is fully loaded
// This ensures all HTML elements are available before we start working with them
document.addEventListener('DOMContentLoaded', main);

// ===== Export methods for HTML bindings =====
// These functions are exported and bound to UI events in the HTML
// Each function delegates to the appropriate service

/**
 * Handles clicks on editor containers to activate the specific editor.
 * This is called when a user clicks on one of the editor containers.
 * 
 * @param editorId - ID of the editor that was clicked
 */
export const onEditorClick = (editorId: string): void => {
  // Delegate to the UI controller to handle editor selection
  // This will update visual state and set the active editor
  sidebarUIController.onEditorClick(editorId);
};

/**
 * Handles change events from select elements in the UI.
 * This is called when dropdowns like the scale selector change.
 * 
 * @param event - Mouse event from the select element
 */
export const onChange = (event: MouseEvent): void => {
  // Delegate to the UI controller to handle option changes
  // This will extract the changed value and update editor options
  sidebarUIController.onChange(event);
};

/**
 * Handles switch events from checkbox elements in the UI.
 * This is called when toggle switches like color enable/disable change.
 * 
 * @param event - Mouse event from the checkbox element
 */
export const onSwitch = (event: MouseEvent): void => {
  // Delegate to the UI controller to handle switch changes
  // This will extract the checked state and update editor options
  sidebarUIController.onSwitch(event);
};

/**
 * Sets the application theme (light/dark).
 * This is called when the user clicks a theme button.
 * 
 * @param theming - Theme to apply ('light' or 'dark')
 */
export const setTheming = (theming: string): void => {
  // Delegate to the UI controller to update CSS variables for theming
  // This will apply the selected theme across the application
  sidebarUIController.setTheming(theming);
};

/**
 * Generates a diagram image for the current model.
 * This is called when the user wants to preview or export the diagram.
 * 
 * @param mode - Optional mode for export ('include', 'exclude', or 'json')
 * @returns Promise that resolves when the drawing is complete
 */
/*export const draw = (mode?: 'include' | 'exclude' | 'json'): Promise<void> => {
  // Delegate to the export service to generate diagram output
  // This will render the diagram in the requested format
  return exportService.draw(mode);
};

/**
 * Clears the current model and resets to an empty diagram.
 * This is called when the user clicks the clear button.
 * 
 * @returns The editor manager instance for method chaining
 */
export const clear = (): void => {
  // Delegate to the editor manager to clear the active model
  // This will reset the model to an empty state and rerender
  editorManager.clearActiveModel();
  editorManager.clearInactiveModel();
  heuristicsService.clearHeuristicsData();
  queryShapeManager.resetQueryShapes();
};

/**
 * Selects the current class as a query root.
 * This is called when the user clicks the "Select Query Root" button.
 * It begins the query path creation workflow.
 */
export const selectQueryRoot = (): void => {
  // Delegate to the query shape controller to handle query root selection
  // This will tag the selected class as a query root and start path creation
  queryShapeController.selectQueryRoot();
};

/**
 * Adds the currently selected relationship to the query path.
 * This is called when the user clicks the "Add to Path" button during
 * query path creation.
 */
export const addToQueryPath = (): void => {
  // Delegate to the query shape controller to add a step to the path
  // This will extend the query path with the selected relationship
  queryShapeController.addToQueryPath();
};

/**
 * Finalizes the current query path creation.
 * This is called when the user clicks the "Finish Path" button
 * to complete a query path.
 */
export const finishQueryPath = (): void => {
  // Delegate to the query shape controller to finalize the query path
  // This will store the path and reset the path creation state
  queryShapeController.finishQueryPath();
};

/**
 * Helper function to get IDs of currently selected class elements.
 * This is used by multiple tagging operations to determine target elements.
 * 
 * @returns Array of selected element IDs
 * @private
 */
const getLastSelectedClassIds = (): string[] => {
  // Get the most recent selection state from the UI controller
  // This contains information about what's currently selected
  const lastSelection = sidebarUIController.getLastSelectionUpdateData();

  // If no selection exists, log an error and return an empty array
  // This prevents operations on non-existent selections
  if (!lastSelection) {
    console.error('No selection found');
    return [];
  }

  // Return the array of element IDs from the selection
  // These are the IDs of all selected UML elements (usually classes)
  return lastSelection.selectedElementIds;
};

/**
 * Tags selected classes as "instantiable".
 * This is called when the user clicks the "Mark as Instantiable" button.
 */
export const tagSelectedClassesAsInstantiable = (): void => {
  // Get the IDs of currently selected classes using our helper
  // This determines which elements will be tagged
  const selectedClassIds = getLastSelectedClassIds();

  // Delegate to the updater service to apply the tag
  // This will modify the model to mark these classes as instantiable
  updaterService.tagClassAsInstantiable(selectedClassIds);

  // Update all button states to reflect the current selection
  // This ensures UI state stays in sync after the operation
  sidebarUIController.updateAllButtonStates(
    false, false, false, queryShapeController.isQueryPathInProgress(), false, false
  );

  heuristicsService.addInstantiableClassId(selectedClassIds[0]);
};

/**
 * Tags selected classes as "modifiable".
 * This is called when the user clicks the "Mark as Modifiable" button.
 */
export const tagSelectedClassesAsModifiable = (): void => {
  // Get the IDs of currently selected classes using our helper
  // This determines which elements will be tagged
  const selectedClassIds = getLastSelectedClassIds();

  // Delegate to the updater service to apply the tag
  // This will modify the model to mark these classes as modifiable
  updaterService.tagClassAsModifiable(selectedClassIds);

  // Update all button states to reflect the current selection
  // This ensures UI state stays in sync after the operation
  sidebarUIController.updateAllButtonStates(
    false, false, false, queryShapeController.isQueryPathInProgress(), false, false
  );

  heuristicsService.addModifiableClassId(selectedClassIds[0]);
};

/**
 * Tags selected classes as "required".
 * This is called when the user clicks the "Mark as Required" button.
 */
export const tagSelectedClassesAsRequired = (): void => {
  // Get the IDs of currently selected classes using our helper
  // This determines which elements will be tagged
  const selectedClassIds = getLastSelectedClassIds();

  // Delegate to the updater service to apply the tag
  // This will modify the model to mark these classes as required
  updaterService.tagClassAsRequired(selectedClassIds);

  // Update all button states to reflect the current selection
  // This ensures UI state stays in sync after the operation
  sidebarUIController.updateAllButtonStates(
    false, false, false, queryShapeController.isQueryPathInProgress(), false, false
  );

  heuristicsService.addRequiredClassId(selectedClassIds[0]);
};

/**
 * Tags selected classes as "queried".
 * This is called when the user clicks the "Mark as Queried" button.
 */
export const tagSelectedClassesAsQueried = (): void => {
  // Get the IDs of currently selected classes using our helper
  // This determines which elements will be tagged
  const selectedClassIds = getLastSelectedClassIds();

  // Delegate to the updater service to apply the tag
  // This will modify the model to mark these classes as queried
  updaterService.tagClassAsQueried(selectedClassIds);

  heuristicsService.addQueriedClassId(selectedClassIds[0]);
};

/**
 * Copies selected elements from the GDM to the LDM.
 * This is called when the user clicks the "Copy to LDM" button.
 */
export const copySelectedElementsToLDM = (): void => {
  // Delegate to the updater service to handle the copy operation
  // This will duplicate selected elements from Global to Local Domain Model
  updaterService.copySelectedElementsToLDM();
};

/**
 * Shows options for tagging relationship ends as modifiable.
 * This is called when the user clicks the "Tag Relationship" button
 * with a relationship selected.
 */
export const toggleRelationshipModifiableOptions = (): void => {
  // Get information about the selected relationship from the updater service
  // This includes the relationship ID and role names for both ends
  const relationshipInfo = updaterService.getSelectedRelationshipInfo();

  // If no valid relationship is selected, exit early
  // This prevents errors when trying to tag invalid selections
  if (!relationshipInfo) return;

  // Delegate to the UI controller to show options for tagging
  // This will display buttons for selecting which end to tag
  sidebarUIController.showRelationshipModifiableOptions(relationshipInfo);
};

/**
 * Applies the modifiable tag to a specific end of the selected relationship.
 * This is called when the user selects one of the relationship end options.
 * 
 * @param optionNumber - Which end to tag (1 for source, 2 for target)
 */
export const selectRelationshipModifiableOption = (optionNumber: number): void => {
  // Reset the relationship options UI and get the relationship ID
  // This hides the options buttons and returns the ID of the relationship
  const relationshipId: string = sidebarUIController.resetRelationshipModifiableOptions()!;

  // Determine which end of the relationship to tag based on the option selected
  // Option 1 is the source end, option 2 is the target end
  const targetTaggedEndType: 'source' | 'target' = optionNumber === 1 ? 'source' : 'target';

  // Delegate to the updater service to apply the tag to the relationship end
  // This modifies the model to mark the relationship end as modifiable
  updaterService.tagRelationshipEndAsModifiable(relationshipId, targetTaggedEndType);

  // Update all button states to reflect the current selection
  // This ensures UI state stays in sync after the operation
  sidebarUIController.updateAllButtonStates(
    false, false, false, queryShapeController.isQueryPathInProgress(), false, false
  );

  // Add the tagged relationship end to the heuristics service for tracking
  // This allows the heuristics service to manage the tagged relationship ends
  const taggedAssociationEndInfo: RelationshipEndInfo = modelsManager.getGDMManager().getAssociationEndInfo(relationshipId, targetTaggedEndType)!;
  heuristicsService.addModifiableRelationshipId(taggedAssociationEndInfo);
};


export const showQueryShape = (): void => {
  // Delegate to the query shape controller to show the query shape
  // This will render the current query shape in the editor
  const queryRootId: string = getLastSelectedClassIds()[0];
  queryShapeController.highlightQueryShape(queryRootId);
}

export const stopShowingQueryShape = (): void => {
  queryShapeController.stopShowingQueryShape();
}

export const downloadGDM = (): void => {
  // Delegate to the export service to download the Global Domain Model
  // This will create a file with the GDM in the requested format
  exportService.downloadGDMAs('json');
}

export const downloadLDM = (): void => {
  // Delegate to the export service to download the Local Domain Model
  // This will create a file with the LDM in the requested format
  exportService.downloadLDMAs('json');
};

export const loadGDM = (): void => {
  // Delegate to the models manager to load the Global Domain Model
  // This will read the GDM from localStorage and update the editor
  exportService.loadGDM();
}

export const toggleExperiment = (): void => {

  const experimentButton: HTMLButtonElement = document.getElementById('experimentBtn') as HTMLButtonElement;

  if (!experimentRunning) {
    interactionLabId = prompt("Please introduce an identifier for the experiment: ")!;
    InteractionLabHeuristics.startExperiment();
    InteractionLabHeuristics.initTracking(interactionLabId);
    InteractionLabHeuristics.registeridentificador(interactionLabId);
    experimentRunning = true;
    experimentButton.textContent = 'Finish Experiment';
  } else {
    experimentRunning = false;
    InteractionLabHeuristics.finishTracking();
    InteractionLabHeuristics.finishExperiment();
    experimentRunning = false;
    experimentButton.textContent = 'Start Experiment';
  }
}


/*
Fix copy button
*/