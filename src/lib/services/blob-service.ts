import { getStore } from '@netlify/blobs';

const SIGNALS_STORE = 'signals';
const EVENTS_KEY = 'events';

/**
 * Helper service for Netlify Blobs operations
 */
export const blobService = {
  /**
   * Initialize the Blob store
   */
  getSignalsStore() {
    return getStore(SIGNALS_STORE);
  },

  /**
   * Get all signals from the Blob store
   */
  async getAllSignals() {
    try {
      const store = this.getSignalsStore();
      return await store.getJSON(EVENTS_KEY) || [];
    } catch (error) {
      console.error('Error getting signals from blob store:', error);
      console.error('Error stack:', error.stack);
      return [];
    }
  },

  /**
   * Add a new signal to the store
   */
  async addSignal(newSignal: any) {
    try {
      const store = this.getSignalsStore();
      const signals = await this.getAllSignals();

      // Add new signal to the beginning
      signals.unshift(newSignal);

      // Save to blob store
      await store.setJSON(EVENTS_KEY, signals);
      return true;
    } catch (error) {
      console.error('Error adding signal to blob store:', error);
      console.error('Error stack:', error.stack);

      // Try saving just the new signal as a fallback
      try {
        const store = this.getSignalsStore();
        await store.setJSON(EVENTS_KEY, [newSignal]);
        return true;
      } catch (fallbackError) {
        console.error('Fallback save also failed:', fallbackError);
        throw fallbackError;
      }
    }
  },

  /**
   * Test blob store connectivity
   */
  async testConnection() {
    try {
      const store = this.getSignalsStore();

      // Try to write and read a test value
      const testKey = 'connection-test';
      const testValue = { test: true, timestamp: new Date().toISOString() };

      await store.setJSON(testKey, testValue);
      const retrieved = await store.getJSON(testKey);

      return {
        success: true,
        testValue,
        retrieved
      };
    } catch (error) {
      console.error('Blob store connection test failed:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }
};
