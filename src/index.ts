#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

function loadPersistedToken(): string {
  try {
    const authPath = path.join(os.homedir(), '.newton-submit-mcp', 'auth.json');
    if (fs.existsSync(authPath)) {
      const data = JSON.parse(fs.readFileSync(authPath, 'utf8'));
      if (data?.token || data?.auth_token || data?.access_token) {
        return data.token || data.auth_token || data.access_token;
      }
    }
  } catch {}
  return process.env.NEWTON_SCHOOL_TOKEN || process.env.NEWTON_TOKEN || '';
}

function savePersistedToken(token: string) {
  try {
    const dir = path.join(os.homedir(), '.newton-submit-mcp');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'auth.json'), JSON.stringify({ token }, null, 2));
  } catch {}
}

let authToken = loadPersistedToken();

const server = new Server(
  {
    name: 'newton-submit-mcp',
    version: '1.2.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'set_auth_token',
      description: 'Set the Newton School authentication token for subsequent requests (also persists locally)',
      inputSchema: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'Bearer token from access_token_ns_student_web cookie' },
        },
        required: ['token'],
      },
    },
    {
      name: 'get_project',
      description: 'Get Newton School playground project details including GitLab credentials and file structure',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Project hash (e.g., mypp7avifiqo)' },
          access_token: { type: 'string', description: 'Optional: Bearer token (uses stored token if not provided)' },
        },
        required: ['project_id'],
      },
    },
    {
      name: 'get_file',
      description: 'Get file content from GitLab repository',
      inputSchema: {
        type: 'object',
        properties: {
          gitlab_token: { type: 'string', description: 'GitLab access token from project data' },
          project_id: { type: 'number', description: 'GitLab project ID' },
          file_path: { type: 'string', description: 'File path in repository' },
          ref: { type: 'string', description: 'Optional: Git branch or commit hash (default: main)' },
        },
        required: ['gitlab_token', 'project_id', 'file_path'],
      },
    },
    {
      name: 'update_file',
      description: 'Update or create file content in GitLab repository (auto-creates file if missing)',
      inputSchema: {
        type: 'object',
        properties: {
          gitlab_token: { type: 'string', description: 'GitLab access token from project data' },
          project_id: { type: 'number', description: 'GitLab project ID' },
          file_path: { type: 'string', description: 'File path in repository' },
          content: { type: 'string', description: 'New file content' },
          commit_message: { type: 'string', description: 'Optional commit message' },
        },
        required: ['gitlab_token', 'project_id', 'file_path', 'content'],
      },
    },
    {
      name: 'submit_solution',
      description: 'Trigger solution evaluation build directly on Newton School runner (supports project and coding playgrounds)',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Project or coding playground hash' },
          access_token: { type: 'string', description: 'Optional: uses stored token if not provided' },
          source_code: { type: 'string', description: 'Optional: source code for coding/database playgrounds' },
          language_id: { type: 'number', description: 'Optional: language ID for coding/database playgrounds' },
        },
        required: ['project_id'],
      },
    },
    {
      name: 'wait_for_submission',
      description: 'Poll submission status until complete or timeout. Returns final test results.',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Playground hash' },
          username: { type: 'string', description: 'Username of the student' },
          timeout_seconds: { type: 'number', description: 'Max wait time (default 60)' },
          access_token: { type: 'string', description: 'Optional: uses stored token if not provided' },
        },
        required: ['project_id', 'username'],
      },
    },
    {
      name: 'list_courses',
      description: 'List all enrolled courses for the authenticated user',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: { type: 'string', description: 'Optional: uses stored token if not provided' },
        },
      },
    },
    {
      name: 'list_assignments',
      description: 'List assignments for a course, optionally filtered by search term',
      inputSchema: {
        type: 'object',
        properties: {
          course_hash: { type: 'string', description: 'Course hash' },
          search: { type: 'string', description: 'Optional search filter' },
          access_token: { type: 'string', description: 'Optional: uses stored token if not provided' },
        },
        required: ['course_hash'],
      },
    },
    {
      name: 'list_questions',
      description: 'List all questions in an assignment',
      inputSchema: {
        type: 'object',
        properties: {
          assignment_hash: { type: 'string', description: 'Assignment hash' },
          access_token: { type: 'string', description: 'Optional: uses stored token if not provided' },
        },
        required: ['assignment_hash'],
      },
    },
    {
      name: 'get_user_info',
      description: 'Get current user profile information',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: { type: 'string', description: 'Optional: uses stored token if not provided' },
        },
      },
    },
    {
      name: 'list_all_submissions',
      description: 'Get all submission history for a playground project',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Playground hash' },
          access_token: { type: 'string', description: 'Optional: uses stored token if not provided' },
        },
        required: ['project_id'],
      },
    },
    {
      name: 'get_submission_status',
      description: 'Get latest submission status and test case results for a project',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Playground hash' },
          username: { type: 'string', description: 'Student username' },
          access_token: { type: 'string', description: 'Optional: uses stored token if not provided' },
        },
        required: ['project_id', 'username'],
      },
    },
    {
      name: 'list_assessments',
      description: 'List all assessments/quizzes for a course',
      inputSchema: {
        type: 'object',
        properties: {
          course_hash: { type: 'string', description: 'Course hash' },
          access_token: { type: 'string', description: 'Optional: uses stored token if not provided' },
        },
        required: ['course_hash'],
      },
    },
    {
      name: 'get_assessment_questions',
      description: 'Get all questions for an assessment/quiz',
      inputSchema: {
        type: 'object',
        properties: {
          course_hash: { type: 'string', description: 'Course hash' },
          assessment_hash: { type: 'string', description: 'Assessment hash' },
          access_token: { type: 'string', description: 'Optional: uses stored token if not provided' },
        },
        required: ['course_hash', 'assessment_hash'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (!args) throw new Error('Missing arguments');

  try {
    switch (name) {
      case 'set_auth_token': {
        authToken = String(args.token);
        savePersistedToken(authToken);
        return { content: [{ type: 'text', text: 'Auth token set and persisted successfully' }] };
      }

      case 'get_project': {
        const token = args.access_token ? String(args.access_token) : authToken;
        if (!token) throw new Error('No auth token available. Use set_auth_token first.');

        const resp = await fetch(
          `https://my.newtonschool.co/api/v1/playground/project/h/${args.project_id}/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await resp.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'get_file': {
        const ref = args.ref ? String(args.ref) : 'main';
        const resp = await fetch(
          `https://gitlab.newtonschool.co/api/v4/projects/${args.project_id}/repository/files/${encodeURIComponent(String(args.file_path))}?ref=${encodeURIComponent(ref)}`,
          { headers: { 'PRIVATE-TOKEN': String(args.gitlab_token) } }
        );
        const data = await resp.json();
        const content = data.content ? Buffer.from(data.content, 'base64').toString('utf-8') : null;
        return { content: [{ type: 'text', text: content || JSON.stringify(data, null, 2) }] };
      }

      case 'update_file': {
        const url = `https://gitlab.newtonschool.co/api/v4/projects/${args.project_id}/repository/files/${encodeURIComponent(String(args.file_path))}`;
        const commitMsg = args.commit_message ? String(args.commit_message) : `Update ${args.file_path}`;
        const body = JSON.stringify({
          branch: 'main',
          content: args.content,
          commit_message: commitMsg,
        });

        let resp = await fetch(url, {
          method: 'PUT',
          headers: {
            'PRIVATE-TOKEN': String(args.gitlab_token),
            'Content-Type': 'application/json',
          },
          body,
        });

        let data = await resp.json();
        // If file doesn't exist, GitLab PUT returns 400 with "A file with this name doesn't exist". Fallback to POST (create).
        if (resp.status === 400 && String(data?.message).includes("doesn't exist")) {
          resp = await fetch(url, {
            method: 'POST',
            headers: {
              'PRIVATE-TOKEN': String(args.gitlab_token),
              'Content-Type': 'application/json',
            },
            body,
          });
          data = await resp.json();
        }

        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'submit_solution': {
        const token = args.access_token ? String(args.access_token) : authToken;
        if (!token) throw new Error('No auth token available. Use set_auth_token first.');

        const projectId = String(args.project_id);

        // 1. Try project build trigger
        const projectResp = await fetch(
          `https://my.newtonschool.co/api/v1/playground/project/h/${projectId}/?create_and_run_build=true`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (projectResp.ok) {
          const data = await projectResp.json();
          return {
            content: [{
              type: 'text',
              text: `Project runner build triggered successfully (status: ${projectResp.status}).\n${JSON.stringify(data, null, 2)}`,
            }],
          };
        }

        // 2. Try coding/database playground trigger
        if (args.source_code !== undefined) {
          const codingResp = await fetch(
            `https://my.newtonschool.co/api/v1/playground/coding/h/${projectId}/?run_hidden_test_cases=true`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                source_code: args.source_code,
                language_id: args.language_id || 2003,
              }),
            }
          );

          if (codingResp.ok) {
            const data = await codingResp.json();
            return {
              content: [{
                type: 'text',
                text: `Coding solution submitted and evaluated (status: ${codingResp.status}).\n${JSON.stringify(data, null, 2)}`,
              }],
            };
          }
        }

        return {
          content: [{
            type: 'text',
            text: `Submission trigger completed (status ${projectResp.status}). Use wait_for_submission to poll for build and test results.`,
          }],
        };
      }

      case 'wait_for_submission': {
        const token = args.access_token ? String(args.access_token) : authToken;
        if (!token) throw new Error('No auth token available. Use set_auth_token first.');

        const timeoutSeconds = args.timeout_seconds ? Number(args.timeout_seconds) : 60;
        const maxAttempts = Math.floor(timeoutSeconds / 3);

        for (let i = 0; i < maxAttempts; i++) {
          const resp = await fetch(
            `https://my.newtonschool.co/api/v1/playground/project/h/${args.project_id}/latest_submission/?username=${args.username}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const data = await resp.json();

          if (data.build_status && data.build_status !== 1) {
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
          }

          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        return {
          content: [{
            type: 'text',
            text: `Timeout after ${timeoutSeconds} seconds. Submission still in progress.`,
          }],
        };
      }

      case 'list_courses': {
        const token = args.access_token ? String(args.access_token) : authToken;
        if (!token) throw new Error('No auth token available. Use set_auth_token first.');

        const resp = await fetch(
          'https://my.newtonschool.co/api/v2/course/all/applied/?pagination=false&completed=false',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await resp.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'list_assignments': {
        const token = args.access_token ? String(args.access_token) : authToken;
        if (!token) throw new Error('No auth token available. Use set_auth_token first.');

        const resp = await fetch(
          `https://my.newtonschool.co/api/v2/course/h/${args.course_hash}/assignment/all/?pagination=false&completed=false`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await resp.json();

        let assignments = Array.isArray(data) ? data : data.assignment_course_user_mappings || [];
        if (args.search) {
          const searchLower = String(args.search).toLowerCase();
          assignments = assignments.filter((a: any) =>
            (a.title || a.name || a.assignment?.title || '')?.toLowerCase().includes(searchLower)
          );
        }

        return { content: [{ type: 'text', text: JSON.stringify(assignments, null, 2) }] };
      }

      case 'list_questions': {
        const token = args.access_token ? String(args.access_token) : authToken;
        if (!token) throw new Error('No auth token available. Use set_auth_token first.');

        const resp = await fetch(
          `https://my.newtonschool.co/api/v1/assignment/h/${args.assignment_hash}/questions/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await resp.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'get_user_info': {
        const token = args.access_token ? String(args.access_token) : authToken;
        if (!token) throw new Error('No auth token available. Use set_auth_token first.');

        const resp = await fetch(
          'https://my.newtonschool.co/api/v1/user/me/',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await resp.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'list_all_submissions': {
        const token = args.access_token ? String(args.access_token) : authToken;
        if (!token) throw new Error('No auth token available. Use set_auth_token first.');

        const resp = await fetch(
          `https://my.newtonschool.co/api/v1/playground/project/h/${args.project_id}/all_submission/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await resp.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'get_submission_status': {
        const token = args.access_token ? String(args.access_token) : authToken;
        if (!token) throw new Error('No auth token available. Use set_auth_token first.');

        const resp = await fetch(
          `https://my.newtonschool.co/api/v1/playground/project/h/${args.project_id}/latest_submission/?username=${args.username}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await resp.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'list_assessments': {
        const token = args.access_token ? String(args.access_token) : authToken;
        if (!token) throw new Error('No auth token available. Use set_auth_token first.');

        const resp = await fetch(
          `https://my.newtonschool.co/api/v2/course/h/${args.course_hash}/assessment/all/?pagination=false&completed=false`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await resp.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'get_assessment_questions': {
        const token = args.access_token ? String(args.access_token) : authToken;
        if (!token) throw new Error('No auth token available. Use set_auth_token first.');

        const resp = await fetch(
          `https://my.newtonschool.co/api/v1/course/h/${args.course_hash}/assessment/h/${args.assessment_hash}/questions/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await resp.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
