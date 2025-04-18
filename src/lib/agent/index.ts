import { OpenAI } from 'openai';
import { Octokit } from '@octokit/rest';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function runAgentCommand({ sessionId, message }: { sessionId: string; message: any }) {
  const systemPrompt = \`You are an infrastructure agent for Build Co. Execute file edits, generate commits, or suggest mutations based on artefacts.\`;

  const chatResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(message) }
    ]
  });

  const reply = chatResponse.choices[0].message?.content || 'No output.';

  let parsed: any = null;
  try {
    parsed = JSON.parse(reply);
    if (parsed.action === 'update_file') {
      await octokit.repos.createOrUpdateFileContents({
        owner: 'buildcoprojects',
        repo: 'build-co-llm-controller',
        path: parsed.path,
        message: parsed.commitMessage || \`Update \${parsed.path}\`,
        content: Buffer.from(parsed.content).toString('base64'),
        sha: parsed.sha || undefined,
        branch: 'main'
      });
    }
  } catch (_) {
    // Fallback
  }

  return { sessionId, response: reply, parsed };
}
