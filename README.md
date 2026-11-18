# Newton School MCP Server (`newton-submit-mcp`)

Model Context Protocol (MCP) server for interacting with Newton School platform APIs, repository synchronization, and evaluation test runners.

## Features

### 🔑 Authentication & Profile
- `set_auth_token`: Set and automatically persist Newton School authentication token (`access_token_ns_student_web` / `Bearer` token).
- `get_user_info`: Fetch current user details, profile, enrolled university, and email.

### 🧭 Course & Assignment Navigation
- `list_courses`: List all active and enrolled courses.
- `list_assignments`: Discover assignments by course with optional title/topic search.
- `list_questions`: List all questions, deadlines, marks, and mapping hashes in an assignment.
- `list_assessments`: List quizzes and assessments.
- `get_assessment_questions`: Retrieve questions and options for assessments.

### 💻 Code & Repository Management
- `get_project`: Retrieve playground project configurations, test boilerplate, and GitLab credentials.
- `get_file`: Read source files directly from GitLab repositories at any commit ref or branch.
- `update_file`: Commit updates to GitLab files (with automatic fallback to file creation if the file does not yet exist).

### 🚀 Submission & Runner Evaluation
- `submit_solution`: Directly trigger evaluation builds on the Newton School runner for both project (`Newton Box`) and coding playgrounds without requiring manual browser interaction.
- `wait_for_submission`: Automatically poll evaluation status until completion with test case pass/fail breakdowns.
- `get_submission_status`: Query latest submission results and individual test cases.
- `list_all_submissions`: Review complete submission history.

## Installation

```bash
git clone https://github.com/utksh1/newton-submit-mcp.git
cd newton-submit-mcp
npm install
npm run build
```

## Configuration

Add to your MCP configuration (e.g. `~/.gemini/config/mcp_config.json` or `~/.zcode/mcp.json`):

```json
{
  "mcpServers": {
    "newton-submit": {
      "command": "node",
      "args": [
        "/path/to/newton-submit-mcp/build/index.js"
      ],
      "env": {
        "NEWTON_SCHOOL_TOKEN": "your_token_here"
      }
    }
  }
}
```

## License

MIT
