import * as Apollon from '../../src/main';
import { EditorManager } from './EditorManager';
import { APP_CONFIG } from './AppConfig';

/**
 * ExportService handles exporting diagrams in different formats.
 * Provides functionality to export UML diagrams as SVG or JSON.
 */
export class ExportService {
    /**
     * Create a new ExportService
     * @param editorManager - Reference to the editor manager for accessing editors
     */
    constructor(private editorManager: EditorManager) { }

    /**
     * Export diagram as SVG or JSON.
     * Opens a new browser tab with the exported diagram.
     * 
     * @param {string} [mode] - Export mode: 'include' or 'exclude' for filtered SVG, 'json' for JSON export
     */
    /* public async draw(mode?: 'include' | 'exclude' | 'json'): Promise<void> {
         // Get active editor
         const { editor } = this.editorManager.getActiveEditor();
 
         // Exit if no editor is active
         if (!editor) {
             console.error('Cannot export: No active editor');
             return;
         }
 
         // Handle JSON export mode
         if (mode === 'json') {
             await this.exportAsJSON(editor);
             return;
         }
 
         // Handle SVG export
         await this.exportAsSVG(editor, mode);
     }*/

    /**
     * Export the diagram as formatted JSON
     * @param editor - Editor instance to export from
     */
    private async exportAsJSON(editor: Apollon.ApollonEditor): Promise<void> {
        // Export as JSON with nice formatting (2 spaces)
        const jsonString = await editor.exportAsJSON({ space: 2 });

        // Create a blob with the JSON content
        const jsonBlob = new Blob([jsonString], { type: 'application/json' });

        // Create a URL for the blob
        const jsonBlobURL = URL.createObjectURL(jsonBlob);

        // Open the URL in a new tab
        window.open(jsonBlobURL);
    }

    /**
     * Export the diagram as SVG with optional filtering
     * @param editor - Editor instance to export from
     * @param mode - Optional filter mode ('include' or 'exclude')
     */
    /*private async exportAsSVG(editor: Apollon.ApollonEditor, mode?: 'include' | 'exclude'): Promise<void> {
        // Create a filter of selected elements if needed
        const filter: string[] = [
            // Get all selected elements
            ...Object.entries(editor.model.interactive.elements)
                .filter(([, value]) => value) // Filter to only selected elements
                .map(([key]) => key),         // Get just the element IDs

            // Get all selected relationships
            ...Object.entries(editor.model.interactive.relationships)
                .filter(([, value]) => value) // Filter to only selected relationships
                .map(([key]) => key),         // Get just the relationship IDs
        ];

        // Create export parameters based on mode and scale
        const exportParam = mode
            ? { [mode]: filter, scale: editor.getScaleFactor() } // Include/exclude filter with scale
            : { scale: editor.getScaleFactor() };               // Just scale without filtering

        // Export as SVG
        const { svg }: Apollon.SVG = await editor.exportAsSVG(exportParam);

        // Create a blob with the SVG content
        const svgBlob = new Blob([svg], { type: 'image/svg+xml' });

        // Create a URL for the blob
        const svgBlobURL = URL.createObjectURL(svgBlob);

        // Open the URL in a new tab
        window.open(svgBlobURL);
    }*/

    /**
     * Downloads the GDM diagram as a file
     * @param format - Format to download ('svg', 'png', or 'json')
     * @param filename - Optional filename without extension
     */
    public async downloadGDMAs(filename?: string): Promise<void> {
        // Get the GDM editor specifically, regardless of which editor is active
        const editor = this.editorManager.getEditor(APP_CONFIG.EDITOR_IDS.GDM);

        if (!editor) {
            console.error('Cannot download: GDM editor not available');
            return;
        }

        // Generate default name with GDM prefix
        const defaultName = `GDM_${new Date().toISOString().split('T')[0]}`;

        // Use the shared download method
        await this.downloadModelAs(editor, filename || defaultName);
    }

    /**
     * Downloads the LDM diagram as a file
     * @param format - Format to download ('svg', 'png', or 'json')
     * @param filename - Optional filename without extension
     */
    public async downloadLDMAs(filename?: string): Promise<void> {
        // Get the LDM editor specifically, regardless of which editor is active
        const editor = this.editorManager.getEditor(APP_CONFIG.EDITOR_IDS.LDM);

        if (!editor) {
            console.error('Cannot download: LDM editor not available');
            return;
        }

        // Generate default name with LDM prefix
        const defaultName = `LDM_${new Date().toISOString().split('T')[0]}`;

        // Use the shared download method
        await this.downloadModelAs(editor, filename || defaultName);
    }

    /**
     * Shared implementation for downloading a model in various formats
     * @param editor - The editor containing the model to download
     * @param format - Format to download ('svg', 'png', or 'json')
     * @param filename - Filename without extension
     * @private
     */
    private async downloadModelAs(editor: Apollon.ApollonEditor, filename: string): Promise<void> {
        // Create download link
        const downloadLink = document.createElement('a');

        // Get JSON content
        const jsonString = await editor.exportAsJSON({ space: 2 });
        const jsonBlob = new Blob([jsonString], { type: 'application/json' });

        // Set up download
        downloadLink.href = URL.createObjectURL(jsonBlob);
        downloadLink.download = `${filename}.json`;

        // === Download triggering section (for all formats) ===
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    /**
     * Opens a file dialog for the user to select a JSON file to load as the GDM
     * Reads the selected file and loads its contents into the GDM editor
     * 
     * @returns Promise that resolves when the file is loaded or rejected if an error occurs
     */
    public async loadGDM(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Create a file input element to open the file dialog
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'application/json';
            fileInput.style.display = 'none';

            // Add the input to the DOM temporarily
            document.body.appendChild(fileInput);

            // Handle file selection
            fileInput.addEventListener('change', async (event) => {
                try {
                    // Get the selected file
                    const target = event.target as HTMLInputElement;
                    const files = target.files;

                    if (!files || files.length === 0) {
                        throw new Error('No file selected');
                    }

                    const file = files[0];

                    // Read the file content
                    const fileContent = await this.readFileAsText(file);

                    // Parse the JSON content
                    const modelData = JSON.parse(fileContent);

                    // Validate that this is a valid UML model
                    if (!modelData || !modelData.elements) {
                        throw new Error('Invalid model file format');
                    }

                    // Get the GDM editor
                    const gdmEditor = this.editorManager.getEditor(APP_CONFIG.EDITOR_IDS.GDM);
                    if (!gdmEditor) {
                        throw new Error('GDM editor not available');
                    }

                    // Update the model in the editor
                    this.editorManager.updateOptions(APP_CONFIG.EDITOR_IDS.GDM, { model: modelData });

                    // Re-render the editor with the new model
                    this.editorManager.render(APP_CONFIG.EDITOR_IDS.GDM);

                    // Save the loaded model to local storage
                    const modelsManager = this.editorManager.getModelsManager();
                    modelsManager.setModelGDM(modelData);
                    modelsManager.saveGDMToLocalStorage();

                    // eslint-disable-next-line no-console
                    console.log('GDM model loaded successfully');
                    resolve();
                } catch (error) {
                    console.error('Error loading GDM model:', error);
                    reject(error);
                } finally {
                    // Clean up by removing the input element
                    document.body.removeChild(fileInput);
                }
            });

            // Trigger the file dialog
            fileInput.click();
        });
    }

    /**
     * Helper method to read a file as text
     * 
     * @param file - The file to read
     * @returns Promise that resolves with the file content as text
     * @private
     */
    private readFileAsText(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                if (event.target && typeof event.target.result === 'string') {
                    resolve(event.target.result);
                } else {
                    reject(new Error('Failed to read file content'));
                }
            };

            reader.onerror = () => {
                reject(new Error('Error reading file'));
            };

            reader.readAsText(file);
        });
    }
}