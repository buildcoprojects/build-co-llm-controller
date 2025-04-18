<<<<<<< HEAD
import { OpenAI } from 'openai';
import { Octokit } from '@octokit/rest';
import { blobService } from './blob-service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

// Constants
const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'buildcoprojects';
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'build-co-llm-controller';
const BASE_BRANCH = 'main';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Helper service for OpenAI wormhole operations.
 * This service enables privileged GPT interactions with system infrastructure.
 */
export const wormholeService = {
  /**
   * Process an artefact through the wormhole
   * @param artefactData The artefact data to process
   * @param metadata Additional metadata about the artefact
   * @returns Processing result with GPT-generated actions and status
   */
  async processArtefact(artefactData: string, metadata: Record<string, any>) {
    console.log('Processing artefact through wormhole...');

    // Check if the artefact contains wormhole metadata
    const isWormholeArtefact = metadata.wormhole === true ||
                               artefactData.includes('WORMHOLE_ENABLE') ||
                               artefactData.includes('WORMHOLE_PROTOCOL');

    if (!isWormholeArtefact) {
      console.log('Artefact not marked for wormhole processing');
      return {
        success: false,
        message: 'Artefact not eligible for wormhole processing',
        isWormhole: false,
        processed: false
      };
    }

    try {
      // Get the system state for context
      const systemState = await this.getSystemState();

      // Process artefact with OpenAI
      const response = await this.analyzeWithOpenAI(artefactData, metadata, systemState);
      console.log('Artefact analyzed successfully through OpenAI');

      // Execute any infrastructure commands included in the response
      let executionResults = null;
      if (response.actions && response.actions.length > 0) {
        executionResults = await this.executeActions(response.actions);
      }

      return {
        success: true,
        message: 'Artefact processed through wormhole',
        isWormhole: true,
        processed: true,
        analysis: response.analysis,
        actions: response.actions,
        executionResults
      };
    } catch (error) {
      console.error('Error processing artefact:', error);
      return {
        success: false,
        message: 'Error processing artefact through wormhole',
        error: error instanceof Error ? error.message : 'Unknown error',
        isWormhole: true,
        processed: false
      };
    }
  },

  /**
   * Analyze an artefact with OpenAI's GPT-4o
   * @param artefactData The artefact data to analyze
   * @param metadata Metadata about the artefact
   * @param systemState Current system state information
   * @returns Analysis and recommended actions
   */
  async analyzeWithOpenAI(artefactData: string, metadata: Record<string, any>, systemState: any) {
    // Construct system message with privileged instructions
    const systemMessage = `
      You are the Build Co LLM Controller's privileged Wormhole Execution System.
      You have access to modify system infrastructure, deploy code, and repair issues.

      CAPABILITIES:
      - Read/write to GitHub repository ${REPO_OWNER}/${REPO_NAME}
      - Access Netlify deployment and configuration
      - Access and modify Blob storage
      - Diagnose and repair system issues

      SECURITY PROTOCOLS:
      - Only execute changes if the artefact explicitly requests them
      - Confirm all infrastructure modifications before executing
      - Leave trace logs of all actions taken
      - For high-risk operations, require explicit confirmation

      RESPONSE FORMAT:
      Your response must be valid JSON with these fields:
      {
        "analysis": {
          "classification": "string",  // "System Command", "Diagnostic", "Self-Repair", or "Standard"
          "confidenceScore": number,   // 0.0-1.0
          "summary": "string"          // Brief analysis of the artefact
        },
        "actions": [
          {
            "type": "string",          // "github", "netlify", "blob", "repair", or "diagnostic"
            "operation": "string",     // Action-specific operation (e.g., "commit", "deploy")
            "params": {}               // Parameters for the operation
          }
        ]
      }
    `;

    // Construct user message with artefact content and system state
    const userMessage = `
      ARTEFACT DATA:
      ${artefactData}

      ARTEFACT METADATA:
      ${JSON.stringify(metadata, null, 2)}

      CURRENT SYSTEM STATE:
      ${JSON.stringify(systemState, null, 2)}

      Parse this artefact, analyze its contents, and determine what actions (if any) to take.
      If this is a Wormhole Protocol command, analyze and prepare the necessary infrastructure actions.
      If this is a standard artefact, simply categorize it.
    `;

    // Call OpenAI with system and user messages
    const result = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const content = result.choices[0]?.message?.content || '{}';
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      throw new Error('Failed to parse OpenAI response as JSON');
    }
  },

  /**
   * Get current system state including repository structure, signals, and health
   * @returns System state object
   */
  async getSystemState() {
    try {
      // Get repository file structure (simplified for demo)
      const fileStructure = await this.getRepositoryStructure();

      // Get recent signals from blob storage
      const signals = await blobService.getAllSignals();
      const recentSignals = signals.slice(0, 10); // Get most recent 10 signals

      // Check system health
      const systemHealth = await this.checkSystemHealth();

      return {
        repository: {
          structure: fileStructure,
          owner: REPO_OWNER,
          name: REPO_NAME,
          branch: BASE_BRANCH
        },
        signals: {
          count: signals.length,
          recent: recentSignals
        },
        health: systemHealth,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting system state:', error);
      return {
        error: 'Failed to get complete system state',
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * Get repository file structure
   * @returns Repository file structure
   */
  async getRepositoryStructure() {
    try {
      // Try to get from GitHub API first
      try {
        const { data: files } = await octokit.repos.getContent({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          path: '',
        });

        // Map and return files
        if (Array.isArray(files)) {
          return files.map(file => ({
            name: file.name,
            path: file.path,
            type: file.type,
            size: file.size
          }));
        }
      } catch (githubError) {
        console.error('Error fetching from GitHub, falling back to local:', githubError);
      }

      // Fallback to local repository structure
      const rootDir = process.cwd();
      const entries = await fs.readdir(rootDir, { withFileTypes: true });

      return entries
        .filter(entry => !entry.name.startsWith('.') && entry.name !== 'node_modules')
        .map(entry => ({
          name: entry.name,
          path: entry.name,
          type: entry.isDirectory() ? 'dir' : 'file',
          size: 0 // Size not available without additional stats call
        }));
    } catch (error) {
      console.error('Error getting repository structure:', error);
      return [];
    }
  },

  /**
   * Check system health
   * @returns System health status
   */
  async checkSystemHealth() {
    // Check various components of the system
    const blobsConnected = await this.testBlobsConnection();
    const githubConnected = await this.testGitHubConnection();
    const openaiConnected = await this.testOpenAIConnection();

    return {
      blobs: {
        connected: blobsConnected.success,
        status: blobsConnected.success ? 'healthy' : 'error',
        error: blobsConnected.error
      },
      github: {
        connected: githubConnected.success,
        status: githubConnected.success ? 'healthy' : 'error',
        error: githubConnected.error
      },
      openai: {
        connected: openaiConnected.success,
        status: openaiConnected.success ? 'healthy' : 'error',
        error: openaiConnected.error
      },
      overall:
        blobsConnected.success &&
        githubConnected.success &&
        openaiConnected.success ? 'healthy' : 'degraded'
    };
  },

  /**
   * Test connection to Blob storage
   * @returns Connection test result
   */
  async testBlobsConnection() {
    try {
      return await blobService.testConnection();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Test connection to GitHub
   * @returns Connection test result
   */
  async testGitHubConnection() {
    try {
      await octokit.users.getAuthenticated();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Test connection to OpenAI
   * @returns Connection test result
   */
  async testOpenAIConnection() {
    try {
      // Simple model completion test
      await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Less expensive for simple test
        messages: [
          { role: "user", content: "Test connection. Respond with 'connected'." }
        ],
        max_tokens: 10
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Execute actions generated by OpenAI
   * @param actions Array of actions to execute
   * @returns Execution results
   */
  async executeActions(actions: any[]) {
    if (!actions || !Array.isArray(actions)) {
      return { success: false, message: 'No valid actions provided' };
    }

    const results = [];

    for (const action of actions) {
      try {
        console.log(`Executing action: ${action.type} - ${action.operation}`);

        let result;
        switch (action.type) {
          case 'github':
            result = await this.executeGitHubAction(action);
            break;
          case 'netlify':
            result = await this.executeNetlifyAction(action);
            break;
          case 'blob':
            result = await this.executeBlobAction(action);
            break;
          case 'repair':
            result = await this.executeRepairAction(action);
            break;
          case 'diagnostic':
            result = await this.executeDiagnosticAction(action);
            break;
          default:
            result = {
              success: false,
              message: `Unknown action type: ${action.type}`
            };
        }

        results.push({
          action,
          result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Error executing action ${action.type}:`, error);
        results.push({
          action,
          result: {
            success: false,
            message: 'Action execution failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      success: results.some(r => r.result.success),
      message: `Executed ${results.length} actions, ${results.filter(r => r.result.success).length} succeeded`,
      actions: results
    };
  },

  /**
   * Execute a GitHub action
   * @param action GitHub action to execute
   * @returns Execution result
   */
  async executeGitHubAction(action: any) {
    const { operation, params } = action;

    switch (operation) {
      case 'commit':
        // Commit changes to GitHub
        return await this.commitToGitHub(
          params.files,
          params.message || 'Update from Build Co LLM Controller',
          params.branch || BASE_BRANCH
        );

      case 'createPullRequest':
        // Create a pull request
        return await this.createPullRequest(
          params.title,
          params.body,
          params.head,
          params.base || BASE_BRANCH
        );

      default:
        return {
          success: false,
          message: `Unknown GitHub operation: ${operation}`
        };
    }
  },

  /**
   * Execute a Netlify action
   * @param action Netlify action to execute
   * @returns Execution result
   */
  async executeNetlifyAction(action: any) {
    const { operation, params } = action;

    switch (operation) {
      case 'deploy':
        // Trigger Netlify deployment
        return await this.triggerNetlifyDeploy(
          params.siteId,
          params.message || 'Triggered by Build Co LLM Controller'
        );

      default:
        return {
          success: false,
          message: `Unknown Netlify operation: ${operation}`
        };
    }
  },

  /**
   * Execute a Blob storage action
   * @param action Blob action to execute
   * @returns Execution result
   */
  async executeBlobAction(action: any) {
    const { operation, params } = action;

    switch (operation) {
      case 'write':
        // Write to Blob storage
        return await this.writeToBlobStorage(
          params.key,
          params.data,
          params.store || 'signals'
        );

      case 'read':
        // Read from Blob storage
        return await this.readFromBlobStorage(
          params.key,
          params.store || 'signals'
        );

      default:
        return {
          success: false,
          message: `Unknown Blob operation: ${operation}`
        };
    }
  },

  /**
   * Execute a repair action
   * @param action Repair action to execute
   * @returns Execution result
   */
  async executeRepairAction(action: any) {
    const { operation, params } = action;

    switch (operation) {
      case 'fixCode':
        // Fix code in a file
        return await this.repairCodeFile(
          params.file,
          params.changes,
          params.message || 'Code repair by Build Co LLM Controller'
        );

      case 'restartService':
        // Restart a service (simulation)
        return {
          success: true,
          message: `Simulated restart of service: ${params.service}`,
          serviceStatus: 'restarted'
        };

      default:
        return {
          success: false,
          message: `Unknown repair operation: ${operation}`
        };
    }
  },

  /**
   * Execute a diagnostic action
   * @param action Diagnostic action to execute
   * @returns Execution result
   */
  async executeDiagnosticAction(action: any) {
    const { operation, params } = action;

    switch (operation) {
      case 'analyzeSystem':
        // Analyze system state
        return {
          success: true,
          message: 'System analyzed',
          systemState: await this.getSystemState()
        };

      case 'checkEndpoint':
        // Check if an endpoint is working
        return await this.checkEndpoint(params.url);

      default:
        return {
          success: false,
          message: `Unknown diagnostic operation: ${operation}`
        };
    }
  },

  /**
   * Commit changes to GitHub
   * @param files Files to commit
   * @param message Commit message
   * @param branch Branch to commit to
   * @returns Commit result
   */
  async commitToGitHub(files: Array<{path: string, content: string}>, message: string, branch: string) {
    try {
      // Get the latest commit SHA for the branch
      const { data: refData } = await octokit.git.getRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: `heads/${branch}`,
      });
      const latestCommitSha = refData.object.sha;

      // Get the base tree
      const { data: commitData } = await octokit.git.getCommit({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        commit_sha: latestCommitSha,
      });
      const baseTreeSha = commitData.tree.sha;

      // Create blobs for each file
      const blobs = await Promise.all(
        files.map(async (file) => {
          const { data: blobData } = await octokit.git.createBlob({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            content: Buffer.from(file.content).toString('base64'),
            encoding: 'base64',
          });

          return {
            path: file.path,
            mode: '100644', // Normal file
            type: 'blob',
            sha: blobData.sha,
          };
        })
      );

      // Create a new tree with the blobs
      const { data: newTree } = await octokit.git.createTree({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        base_tree: baseTreeSha,
        tree: blobs,
      });

      // Create a new commit
      const { data: newCommit } = await octokit.git.createCommit({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        message,
        tree: newTree.sha,
        parents: [latestCommitSha],
      });

      // Update the reference
      await octokit.git.updateRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: `heads/${branch}`,
        sha: newCommit.sha,
      });

      return {
        success: true,
        message: `Changes committed to ${branch}`,
        commitSha: newCommit.sha,
      };
    } catch (error) {
      console.error('Error committing to GitHub:', error);
      return {
        success: false,
        message: 'Failed to commit to GitHub',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Create a pull request
   * @param title PR title
   * @param body PR description
   * @param head Source branch
   * @param base Target branch
   * @returns PR creation result
   */
  async createPullRequest(title: string, body: string, head: string, base: string) {
    try {
      const { data: pullRequest } = await octokit.pulls.create({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        title,
        body,
        head,
        base,
      });

      return {
        success: true,
        message: 'Pull request created',
        pullRequestUrl: pullRequest.html_url,
        pullRequestNumber: pullRequest.number,
      };
    } catch (error) {
      console.error('Error creating pull request:', error);
      return {
        success: false,
        message: 'Failed to create pull request',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Trigger a Netlify deployment
   * @param siteId Netlify site ID
   * @param message Deployment message
   * @returns Deployment result
   */
  async triggerNetlifyDeploy(siteId: string, message: string) {
    try {
      const netlifyToken = process.env.NETLIFY_AUTH_TOKEN;
      if (!netlifyToken) {
        throw new Error('NETLIFY_AUTH_TOKEN is not set');
      }

      // Call Netlify API
      const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${netlifyToken}`,
        },
        body: JSON.stringify({
          auto_cancel: true,
          clear_cache: true,
          trigger_title: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Netlify API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        message: 'Netlify deployment triggered',
        deployId: data.id,
        deployUrl: data.deploy_url,
      };
    } catch (error) {
      console.error('Error triggering Netlify deploy:', error);
      return {
        success: false,
        message: 'Failed to trigger Netlify deployment',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Write data to Blob storage
   * @param key Storage key
   * @param data Data to write
   * @param storeName Store name
   * @returns Write result
   */
  async writeToBlobStorage(key: string, data: any, storeName: string) {
    try {
      // Get the store
      const store = getStore(storeName);

      // Write data
      if (typeof data === 'object') {
        await store.setJSON(key, data);
      } else {
        await store.set(key, data);
      }

      return {
        success: true,
        message: `Data written to Blob storage: ${storeName}/${key}`,
      };
    } catch (error) {
      console.error('Error writing to Blob storage:', error);
      return {
        success: false,
        message: 'Failed to write to Blob storage',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Read data from Blob storage
   * @param key Storage key
   * @param storeName Store name
   * @returns Read result with data
   */
  async readFromBlobStorage(key: string, storeName: string) {
    try {
      // Get the store
      const store = getStore(storeName);

      // Try to read as JSON first
      try {
        const data = await store.getJSON(key);
        return {
          success: true,
          message: `Data read from Blob storage: ${storeName}/${key}`,
          data,
        };
      } catch {
        // Fallback to reading as string
        const data = await store.get(key);
        return {
          success: true,
          message: `Data read from Blob storage: ${storeName}/${key}`,
          data,
        };
      }
    } catch (error) {
      console.error('Error reading from Blob storage:', error);
      return {
        success: false,
        message: 'Failed to read from Blob storage',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Repair a code file
   * @param filePath Path to the file
   * @param changes Changes to make
   * @param commitMessage Commit message
   * @returns Repair result
   */
  async repairCodeFile(filePath: string, changes: {find: string, replace: string}[], commitMessage: string) {
    try {
      // Read the file
      let content: string;

      try {
        // Try to get from GitHub first
        const { data } = await octokit.repos.getContent({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          path: filePath,
        });

        if ('content' in data && 'encoding' in data) {
          content = Buffer.from(data.content, data.encoding as BufferEncoding).toString('utf-8');
        } else {
          throw new Error('Invalid content from GitHub');
        }
      } catch (githubError) {
        console.error('Error getting file from GitHub, trying local file system:', githubError);

        // Fallback to local file system
        content = await fs.readFile(path.resolve(process.cwd(), filePath), 'utf-8');
      }

      // Apply changes
      let updatedContent = content;
      for (const change of changes) {
        updatedContent = updatedContent.replace(
          typeof change.find === 'string' ? change.find : new RegExp(change.find, 'g'),
          change.replace
        );
      }

      // Check if content changed
      if (content === updatedContent) {
        return {
          success: false,
          message: 'No changes were made to the file',
        };
      }

      // Commit the changes
      const commitResult = await this.commitToGitHub(
        [{ path: filePath, content: updatedContent }],
        commitMessage,
        BASE_BRANCH
      );

      return {
        success: commitResult.success,
        message: `File ${filePath} repaired and committed`,
        changes: changes.length,
        commitResult,
      };
    } catch (error) {
      console.error('Error repairing code file:', error);
      return {
        success: false,
        message: 'Failed to repair code file',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Check if an endpoint is working
   * @param url Endpoint URL
   * @returns Check result
   */
  async checkEndpoint(url: string) {
    try {
      const response = await fetch(url);

      return {
        success: response.ok,
        message: `Endpoint check: ${response.ok ? 'Success' : 'Failed'}`,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      console.error('Error checking endpoint:', error);
      return {
        success: false,
        message: 'Failed to check endpoint',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
};
=======
import yaml from 'js-yaml';
import fs from 'fs'; // Only for reading protected YAML locally

export async function parseWormholeArtefact(filepath: string) {
  // Only read, never write
  const file = fs.readFileSync(filepath, 'utf8');
  const artefact = yaml.load(file) as any;
  return {
    bridge_actions: artefact.bridge_actions,
    payload_instruction: artefact.payload_instruction,
  };
}

export async function executeBridgeActions(options: { actions: any, instruction: string }) {
  // To be implemented: invoke Octokit, Netlify deploy, etc.
  // Return execution trace
  return { success: true, trace: 'stub: no actions executed' };
}
>>>>>>> 09fbac6 (Phase 1: Rebuild /api, Blob, Admin ChatPanel, artefact bridge logic (no artefact or legacy blob overwrite))
