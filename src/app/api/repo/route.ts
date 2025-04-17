import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mark this route as dynamic to allow API calls
export const dynamic = "force-dynamic";

// Constants
const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'buildcoprojects';
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'build-co-llm-controller';

// Initialize GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * GET handler for repository information
 * Query parameters:
 * - path: Path to file or directory (default: '')
 * - type: Type of information to retrieve ('structure', 'content', 'info')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path') || '';
    const infoType = searchParams.get('type') || 'structure';

    // Validate the path (prevent directory traversal)
    if (filePath.includes('..')) {
      return NextResponse.json({
        status: 'error',
        message: 'Invalid path parameter'
      }, { status: 400 });
    }

    switch (infoType) {
      case 'structure':
        return await getRepositoryStructure(filePath);
      case 'content':
        return await getFileContent(filePath);
      case 'info':
        return await getRepositoryInfo();
      default:
        return NextResponse.json({
          status: 'error',
          message: 'Invalid type parameter'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Repository API error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to retrieve repository information',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get repository structure
 * @param dirPath Directory path
 * @returns Repository structure
 */
async function getRepositoryStructure(dirPath: string) {
  try {
    // Try to get from GitHub API first
    try {
      const { data: contents } = await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: dirPath,
      });

      if (Array.isArray(contents)) {
        // It's a directory
        const items = contents.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size,
          url: item.html_url,
          download_url: item.download_url
        }));

        return NextResponse.json({
          status: 'success',
          path: dirPath,
          isDirectory: true,
          items
        });
      } else {
        // It's a file
        return NextResponse.json({
          status: 'success',
          path: dirPath,
          isDirectory: false,
          file: {
            name: contents.name,
            path: contents.path,
            type: contents.type,
            size: contents.size,
            url: contents.html_url,
            download_url: contents.download_url
          }
        });
      }
    } catch (githubError) {
      console.error('Error fetching from GitHub, falling back to local:', githubError);
    }

    // Fallback to local file system
    const fullPath = path.join(process.cwd(), dirPath);
    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      // Read directory
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      const items = entries
        .filter(entry => !entry.name.startsWith('.') && entry.name !== 'node_modules')
        .map(entry => ({
          name: entry.name,
          path: path.join(dirPath, entry.name),
          type: entry.isDirectory() ? 'dir' : 'file',
          size: 0 // Size not available without additional stats call
        }));

      return NextResponse.json({
        status: 'success',
        path: dirPath,
        isDirectory: true,
        items
      });
    } else {
      // Get file info
      return NextResponse.json({
        status: 'success',
        path: dirPath,
        isDirectory: false,
        file: {
          name: path.basename(fullPath),
          path: dirPath,
          type: 'file',
          size: stats.size
        }
      });
    }
  } catch (error) {
    console.error('Error getting repository structure:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to retrieve repository structure',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get file content
 * @param filePath File path
 * @returns File content
 */
async function getFileContent(filePath: string) {
  try {
    if (!filePath) {
      return NextResponse.json({
        status: 'error',
        message: 'File path is required'
      }, { status: 400 });
    }

    // Try to get from GitHub API first
    try {
      const { data } = await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: filePath,
      });

      if ('content' in data && 'encoding' in data) {
        const content = Buffer.from(data.content, data.encoding as BufferEncoding).toString('utf-8');

        return NextResponse.json({
          status: 'success',
          path: filePath,
          content,
          encoding: 'utf-8',
          size: Buffer.byteLength(content, 'utf-8')
        });
      } else {
        return NextResponse.json({
          status: 'error',
          message: 'Not a file or unable to retrieve content'
        }, { status: 400 });
      }
    } catch (githubError) {
      console.error('Error fetching from GitHub, falling back to local:', githubError);
    }

    // Fallback to local file system
    const fullPath = path.join(process.cwd(), filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    return NextResponse.json({
      status: 'success',
      path: filePath,
      content,
      encoding: 'utf-8',
      size: Buffer.byteLength(content, 'utf-8')
    });
  } catch (error) {
    console.error('Error getting file content:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to retrieve file content',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get repository information
 * @returns Repository information
 */
async function getRepositoryInfo() {
  try {
    // Try to get from GitHub API
    try {
      const { data: repo } = await octokit.repos.get({
        owner: REPO_OWNER,
        repo: REPO_NAME,
      });

      const { data: branches } = await octokit.repos.listBranches({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        per_page: 100,
      });

      const { data: commits } = await octokit.repos.listCommits({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        per_page: 10,
      });

      return NextResponse.json({
        status: 'success',
        repository: {
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          default_branch: repo.default_branch,
          branches: branches.map(branch => ({
            name: branch.name,
            commit: branch.commit.sha
          })),
          recent_commits: commits.map(commit => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.commit.author?.name,
            date: commit.commit.author?.date
          }))
        }
      });
    } catch (githubError) {
      console.error('Error fetching from GitHub:', githubError);
    }

    // Fallback to basic information
    return NextResponse.json({
      status: 'success',
      repository: {
        name: REPO_NAME,
        full_name: `${REPO_OWNER}/${REPO_NAME}`,
        description: 'Build Co LLM Controller',
        url: `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
        default_branch: 'main'
      }
    });
  } catch (error) {
    console.error('Error getting repository info:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to retrieve repository information',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
