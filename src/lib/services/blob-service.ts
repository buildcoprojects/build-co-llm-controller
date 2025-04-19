import { getStore } from '@netlify/blobs';
import { createHash } from 'crypto';

const SIGNALS_STORE = 'signals';
const EVENTS_KEY = 'events';  // Ensure we use 'events' key consistently
const ARTIFACTS_FOLDER = 'artifacts';

/**
 * Helper service for Netlify Blobs operations
 */
export const blobService = {
  /**
   * Initialize the Blob store with proper configuration
   */
  getSignalsStore() {
    try {
      // Ensure we're using the site-scoped store with proper authentication
      return getStore({
        name: SIGNALS_STORE,
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_BLOBS_TOKEN
      });
    } catch (error) {
      console.error('Failed to initialize Blob store:', error);
      // Fallback to basic initialization
      return getStore(SIGNALS_STORE);
    }
  },

  /**
   * Get all signals from the Blob store
   */
  async getAllSignals() {
    try {
      // Initialize the store inside the function
      const store = this.getSignalsStore();
      console.log(`Getting signals with key: ${EVENTS_KEY}`);
      const data = await store.getJSON(EVENTS_KEY);

      if (!data || !Array.isArray(data)) {
        console.warn('Invalid or empty data in Blob store, returning empty array');
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error getting signals from blob store:', error);
      console.error('Error stack:', error.stack);

      // Log more detailed diagnostic information
      if (error instanceof Error) {
        console.error('Blob error name:', error.name);
        console.error('Blob error message:', error.message);
      }

      // Try an alternative approach if the main one fails
      try {
        console.log('Attempting alternative retrieval method...');
        // Initialize store inside this function scope
        const store = getStore(SIGNALS_STORE);
        const data = await store.getJSON(EVENTS_KEY);
        return Array.isArray(data) ? data : [];
      } catch (fallbackError) {
        console.error('Alternative retrieval also failed:', fallbackError);
        return [];
      }
    }
  },

  /**
   * Add a new signal to the store
   */
  async addSignal(newSignal) {
    try {
      // Initialize store inside this function
      const store = this.getSignalsStore();

      // Get existing signals with proper error handling
      let signals = [];
      try {
        signals = await this.getAllSignals();
        if (!Array.isArray(signals)) {
          console.warn('getAllSignals did not return an array, initializing empty array');
          signals = [];
        }
      } catch (getError) {
        console.error('Failed to retrieve existing signals:', getError);
        // Continue with empty array
      }

      // Add new signal to the beginning
      signals.unshift(newSignal);

      // Save to blob store with proper error handling
      try {
        console.log(`Saving ${signals.length} signals with key: ${EVENTS_KEY}`);
        await store.setJSON(EVENTS_KEY, signals);
        console.log(`Successfully saved ${signals.length} signals`);
        return true;
      } catch (setError) {
        console.error('Error saving full signal list:', setError);

        // Try saving just the new signal as a fallback
        console.log('Attempting to save only the new signal...');
        await store.setJSON(EVENTS_KEY, [newSignal]);
        console.log('Successfully saved single signal as fallback');
        return true;
      }
    } catch (error) {
      console.error('Error adding signal to blob store:', error);
      console.error('Error stack:', error.stack);

      // More aggressive fallback approach
      try {
        console.log('Attempting emergency recovery save...');
        // Try with minimal configuration
        const emergencyStore = getStore(SIGNALS_STORE);
        await emergencyStore.setJSON(EVENTS_KEY, [newSignal]);
        console.log('Emergency recovery save successful');
        return true;
      } catch (fallbackError) {
        console.error('All save attempts failed:', fallbackError);
        throw new Error(`Failed to save signal after multiple attempts: ${fallbackError.message}`);
      }
    }
  },

  /**
   * Store an artifact binary (PDF, etc.) in Blob storage
   */
  async storeArtifact(artifactName, artifactContent, contentType = 'application/pdf') {
    if (!artifactName || !artifactContent) {
      console.error('Missing artifact name or content');
      return { success: false, error: 'Missing artifact name or content' };
    }

    try {
      const store = this.getSignalsStore();
      const contentHash = createHash('sha256').update(artifactContent).digest('hex').substring(0, 10);
      const artifactKey = `${ARTIFACTS_FOLDER}/${contentHash}_${artifactName}`;

      // Determine if content is base64 string or binary
      let content = artifactContent;
      if (typeof artifactContent === 'string' && artifactContent.startsWith('data:')) {
        // Extract base64 content from data URL
        const base64Content = artifactContent.split(',')[1];
        content = Buffer.from(base64Content, 'base64');
      }

      // Store the artifact with metadata
      const metadata = {
        contentType,
        fileName: artifactName,
        timestamp: new Date().toISOString(),
        hash: contentHash
      };

      await store.set(artifactKey, content, { metadata });

      return {
        success: true,
        artifactKey,
        contentHash,
        metadata
      };
    } catch (error) {
      console.error('Failed to store artifact:', error);

      // Try alternative storage approach
      try {
        console.log('Attempting alternative artifact storage...');
        const store = getStore(SIGNALS_STORE);
        const simpleKey = `${ARTIFACTS_FOLDER}/${Date.now()}_${artifactName}`;

        // Store with simplified approach
        await store.set(simpleKey, artifactContent);

        return {
          success: true,
          artifactKey: simpleKey,
          fallback: true
        };
      } catch (fallbackError) {
        console.error('Alternative artifact storage also failed:', fallbackError);
        return {
          success: false,
          error: fallbackError.message
        };
      }
    }
  },

  /**
   * Retrieve an artifact from Blob storage
   */
  async getArtifact(artifactKey) {
    try {
      const store = this.getSignalsStore();
      const { data, metadata } = await store.get(artifactKey, { type: 'buffer', metadata: true });

      return {
        success: true,
        data,
        metadata
      };
    } catch (error) {
      console.error('Failed to retrieve artifact:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Test blob store connectivity with detailed diagnostics
   */
  async testConnection() {
    try {
      console.log('Testing Blob store connection...');
      const store = this.getSignalsStore();

      // Try to write and read a test value
      const testKey = 'connection-test';
      const testValue = {
        test: true,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown'
      };

      console.log('Writing test value to Blob store...');
      await store.setJSON(testKey, testValue);

      console.log('Reading test value from Blob store...');
      const retrieved = await store.getJSON(testKey);

      if (!retrieved || !retrieved.timestamp) {
        console.warn('Retrieved test value appears invalid:', retrieved);
        return {
          success: false,
          error: 'Retrieved test value is invalid or incomplete',
          retrieved
        };
      }

      return {
        success: true,
        testValue,
        retrieved,
        storeConfig: {
          name: SIGNALS_STORE,
          siteID: process.env.NETLIFY_SITE_ID ? '[configured]' : '[missing]',
          token: process.env.NETLIFY_BLOBS_TOKEN ? '[configured]' : '[missing]'
        }
      };
    } catch (error) {
      console.error('Blob store connection test failed:', error);

      // Try with minimal configuration as fallback
      try {
        console.log('Attempting connection with minimal configuration...');
        const minimalStore = getStore(SIGNALS_STORE);
        await minimalStore.setJSON('minimal-test', { test: true });

        return {
          success: true,
          message: 'Connected with minimal configuration (fallback)',
          warning: 'Using minimal configuration may cause issues in production'
        };
      } catch (fallbackError) {
        console.error('Minimal configuration also failed:', fallbackError);

        return {
          success: false,
          error: error.message,
          stack: error.stack,
          fallbackError: fallbackError.message,
          configDiagnostics: {
            NETLIFY_SITE_ID: process.env.NETLIFY_SITE_ID ? 'configured' : 'missing',
            NETLIFY_BLOBS_TOKEN: process.env.NETLIFY_BLOBS_TOKEN ? 'configured' : 'missing',
            NODE_ENV: process.env.NODE_ENV || 'unknown'
          }
        };
      }
    }
  }
};
