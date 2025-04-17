/* eslint-disable no-console */
import { UMLModel } from '../../src/main/typings';
import { UMLModelCompat } from '../../src/main/compat';

/**
 * Adds a model to localStorage with the specified key
 * @param key - The key to use for storing the model
 * @param model - The model object to store
 */
function addModelToLocalStorage(key: string, model: UMLModelCompat | null): void {
    try {
        // Convert model to JSON string, handle null case
        const valueToStore = model === null || model === undefined ? "null" : JSON.stringify(model);
        window.localStorage.setItem(key, valueToStore);
        console.log(`Added model to localStorage with key: ${key}`);
    } catch (error) {
        console.error(`Failed to store model in localStorage: ${error}`);
    }
}

/**
 * Retrieves a model from localStorage by key
 * @param key - The key of the model to retrieve
 * @returns The retrieved model or null if not found or invalid
 */
function getModelFromLocalStorage(key: string): UMLModelCompat | null {
    try {
        const value = window.localStorage.getItem(key);

        // Handle null, undefined or "null" string cases
        if (value === null || value === 'undefined' || value === 'null') {
            console.log(`No valid model found in localStorage for key: ${key}`);
            return null;
        }

        // Parse the JSON string to get the model object
        const model = JSON.parse(value) as UMLModelCompat;
        console.log(`Retrieved model from localStorage with key: ${key}`);
        return model;
    } catch (error) {
        console.error(`Failed to retrieve model from localStorage: ${error}`);
        return null;
    }
}

/**
 * Removes a model from localStorage
 * @param key - The key of the model to remove
 */
function removeModelFromLocalStorage(key: string): void {
    if (!window.localStorage.getItem(key)) {
        console.log(`Key ${key} not found in localStorage`);
        return;
    }
    // Set to null to maintain compatibility with the rest of the system
    window.localStorage.setItem(key, "null");
    console.log(`Removed model from localStorage with key: ${key}`);
}


export {

    addModelToLocalStorage,
    getModelFromLocalStorage,
    removeModelFromLocalStorage
};