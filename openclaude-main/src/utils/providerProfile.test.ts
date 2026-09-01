import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  buildCodexProfileEnv,
  buildGeminiProfileEnv,
  buildLaunchEnv,
  buildOllamaProfileEnv,
  buildOpenAIProfileEnv,
  selectAutoProfile,
  type ProfileFile,
} from './providerProfile.ts'

function profile(profile: ProfileFile['profile'], env: ProfileFile['env']): ProfileFile {
  return {
    profile,
    env,
    createdAt: '2026-04-01T00:00:00.000Z',
  }
}

const missingCodexAuthPath = join(tmpdir(), 'openclaude-missing-codex-auth.json')

test('matching persisted ollama env is reused for ollama launch', async () => {
  const env = await buildLaunchEnv({
    profile: 'ollama',
    persisted: profile('ollama', {
      OPENAI_BASE_URL: 'http://127.0.0.1:11435/v1',
      OPENAI_MODEL: 'mistral:7b-instruct',
    }),
    goal: 'balanced',
    processEnv: {},
    getOllamaChatBaseUrl: () => 'http://localhost:11434/v1',
    resolveOllamaDefaultModel: async () => 'llama3.1:8b',
  })

  assert.equal(env.OPENAI_BASE_URL, 'http://127.0.0.1:11435/v1')
  assert.equal(env.OPENAI_MODEL, 'mistral:7b-instruct')
})

test('ollama launch ignores mismatched persisted openai env and shell model fallback', async () => {
  const env = await buildLaunchEnv({
    profile: 'ollama',
    persisted: profile('openai', {
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      OPENAI_MODEL: 'gpt-4o',
      OPENAI_API_KEY: 'sk-persisted',
    }),
    goal: 'coding',
    processEnv: {
      OPENAI_BASE_URL: 'https://api.deepseek.com/v1',
      OPENAI_MODEL: 'gpt-4o-mini',
      OPENAI_API_KEY: 'sk-live',
      CODEX_API_KEY: 'codex-live',
      CHATGPT_ACCOUNT_ID: 'acct_live',
    },
    getOllamaChatBaseUrl: () => 'http://localhost:11434/v1',
    resolveOllamaDefaultModel: async () => 'qwen2.5-coder:7b',
  })

  assert.equal(env.OPENAI_BASE_URL, 'http://localhost:11434/v1')
  assert.equal(env.OPENAI_MODEL, 'qwen2.5-coder:7b')
  assert.equal(env.OPENAI_API_KEY, undefined)
  assert.equal(env.CODEX_API_KEY, undefined)
  assert.equal(env.CHATGPT_ACCOUNT_ID, undefined)
})

test('openai launch ignores mismatched persisted ollama env', async () => {
  const env = await buildLaunchEnv({
    profile: 'openai',
    persisted: profile('ollama', {
      OPENAI_BASE_URL: 'http://localhost:11434/v1',
      OPENAI_MODEL: 'llama3.1:8b',
    }),
    goal: 'latency',
    processEnv: {
      OPENAI_API_KEY: 'sk-live',
      CODEX_API_KEY: 'codex-live',
      CHATGPT_ACCOUNT_ID: 'acct_live',
    },
    getOllamaChatBaseUrl: () => 'http://localhost:11434/v1',
    resolveOllamaDefaultModel: async () => 'llama3.1:8b',
  })

  assert.equal(env.OPENAI_BASE_URL, 'https://api.openai.com/v1')
  assert.equal(env.OPENAI_MODEL, 'gpt-4o-mini')
  assert.equal(env.OPENAI_API_KEY, 'sk-live')
  assert.equal(env.CODEX_API_KEY, undefined)
  assert.equal(env.CHATGPT_ACCOUNT_ID, undefined)
})

test('openai launch ignores codex shell transport hints', async () => {
  const env = await buildLaunchEnv({
    profile: 'openai',
    persisted: null,
    goal: 'balanced',
    processEnv: {
      OPENAI_API_KEY: 'sk-live',
      OPENAI_BASE_URL: 'https://chatgpt.com/backend-api/codex',
      OPENAI_MODEL: 'codexplan',
    },
  })

  assert.equal(env.OPENAI_BASE_URL, 'https://api.openai.com/v1')
  assert.equal(env.OPENAI_MODEL, 'gpt-4o')
  assert.equal(env.OPENAI_API_KEY, 'sk-live')
})

test('openai launch ignores codex persisted transport hints', async () => {
  const env = await buildLaunchEnv({
    profile: 'openai',
    persisted: profile('openai', {
      OPENAI_BASE_URL: 'https://chatgpt.com/backend-api/codex',
      OPENAI_MODEL: 'codexplan',
      OPENAI_API_KEY: 'sk-persisted',
    }),
    goal: 'balanced',
    processEnv: {
      OPENAI_API_KEY: 'sk-live',
    },
  })

  assert.equal(env.OPENAI_BASE_URL, 'https://api.openai.com/v1')
  assert.equal(env.OPENAI_MODEL, 'gpt-4o')
  assert.equal(env.OPENAI_API_KEY, 'sk-live')
})

test('matching persisted gemini env is reused for gemini launch', async () => {
  const env = await buildLaunchEnv({
    profile: 'gemini',
    persisted: profile('gemini', {
      GEMINI_MODEL: 'gemini-2.5-flash',
      GEMINI_API_KEY: 'gem-persisted',
      GEMINI_BASE_URL: 'https://example.test/v1beta/openai',
    }),
    goal: 'balanced',
    processEnv: {},
  })

  assert.equal(env.CLAUDE_CODE_USE_GEMINI, '1')
  assert.equal(env.CLAUDE_CODE_USE_OPENAI, undefined)
  assert.equal(env.GEMINI_MODEL, 'gemini-2.5-flash')
  assert.equal(env.GEMINI_API_KEY, 'gem-persisted')
  assert.equal(env.GEMINI_BASE_URL, 'https://example.test/v1beta/openai')
})

test('gemini launch ignores mismatched persisted openai env and strips other provider secrets', async () => {
  const env = await buildLaunchEnv({
    profile: 'gemini',
    persisted: profile('openai', {
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      OPENAI_MODEL: 'gpt-4o',
      OPENAI_API_KEY: 'sk-persisted',
    }),
    goal: 'balanced',
    processEnv: {
      GEMINI_API_KEY: 'gem-live',
      GOOGLE_API_KEY: 'google-live',
      OPENAI_API_KEY: 'sk-live',
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      OPENAI_MODEL: 'gpt-4o-mini',
      CODEX_API_KEY: 'codex-live',
      CHATGPT_ACCOUNT_ID: 'acct_live',
      CLAUDE_CODE_USE_OPENAI: '1',
    },
  })

  assert.equal(env.CLAUDE_CODE_USE_GEMINI, '1')
  assert.equal(env.CLAUDE_CODE_USE_OPENAI, undefined)
  assert.equal(env.GEMINI_MODEL, 'gemini-2.0-flash')
  assert.equal(env.GEMINI_API_KEY, 'gem-live')
  assert.equal(
    env.GEMINI_BASE_URL,
    'https://generativelanguage.googleapis.com/v1beta/openai',
  )
  assert.equal(env.GOOGLE_API_KEY, undefined)
  assert.equal(env.OPENAI_API_KEY, undefined)
  assert.equal(env.CODEX_API_KEY, undefined)
  assert.equal(env.CHATGPT_ACCOUNT_ID, undefined)
})

test('matching persisted codex env is reused for codex launch', async () => {
  const env = await buildLaunchEnv({
    profile: 'codex',
    persisted: profile('codex', {
      OPENAI_BASE_URL: 'https://chatgpt.com/backend-api/codex',
      OPENAI_MODEL: 'codexspark',
      CODEX_API_KEY: 'codex-persisted',
      CHATGPT_ACCOUNT_ID: 'acct_persisted',
    }),
    goal: 'balanced',
    processEnv: {
      CODEX_AUTH_JSON_PATH: missingCodexAuthPath,
    },
  })

  assert.equal(env.OPENAI_BASE_URL, 'https://chatgpt.com/backend-api/codex')
  assert.equal(env.OPENAI_MODEL, 'codexspark')
  assert.equal(env.CODEX_API_KEY, 'codex-persisted')
  assert.equal(env.CHATGPT_ACCOUNT_ID, 'acct_persisted')
})

test('codex launch normalizes poisoned persisted base urls', async () => {
  const env = await buildLaunchEnv({
    profile: 'codex',
    persisted: profile('codex', {
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      OPENAI_MODEL: 'codexspark',
      CHATGPT_ACCOUNT_ID: 'acct_persisted',
    }),
    goal: 'balanced',
    processEnv: {
      CODEX_AUTH_JSON_PATH: missingCodexAuthPath,
    },
  })

  assert.equal(env.OPENAI_BASE_URL, 'https://chatgpt.com/backend-api/codex')
  assert.equal(env.OPENAI_MODEL, 'codexspark')
})

test('codex launch ignores mismatched persisted openai env', async () => {
  const env = await buildLaunchEnv({
    profile: 'codex',
    persisted: profile('openai', {
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      OPENAI_MODEL: 'gpt-4o',
      OPENAI_API_KEY: 'sk-persisted',
    }),
    goal: 'balanced',
    processEnv: {
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      OPENAI_MODEL: 'gpt-4o-mini',
      OPENAI_API_KEY: 'sk-live',
      CODEX_API_KEY: 'codex-live',
      CHATGPT_ACCOUNT_ID: 'acct_live',
    },
  })

  assert.equal(env.OPENAI_BASE_URL, 'https://chatgpt.com/backend-api/codex')
  assert.equal(env.OPENAI_MODEL, 'codexplan')
  assert.equal(env.OPENAI_API_KEY, undefined)
  assert.equal(env.CODEX_API_KEY, 'codex-live')
  assert.equal(env.CHATGPT_ACCOUNT_ID, 'acct_live')
})

test('codex launch ignores placeholder codex env keys', async () => {
  const env = await buildLaunchEnv({
    profile: 'codex',
    persisted: profile('codex', {
      OPENAI_BASE_URL: 'https://chatgpt.com/backend-api/codex',
      OPENAI_MODEL: 'codexspark',
      CODEX_API_KEY: 'codex-persisted',
      CHATGPT_ACCOUNT_ID: 'acct_persisted',
    }),
    goal: 'balanced',
    processEnv: {
      CODEX_API_KEY: 'SUA_CHAVE',
      CODEX_AUTH_JSON_PATH: missingCodexAuthPath,
    },
  })

  assert.equal(env.CODEX_API_KEY, 'codex-persisted')
  assert.equal(env.CHATGPT_ACCOUNT_ID, 'acct_persisted')
})

test('codex launch prefers auth account id over stale persisted value', async () => {
  const codexHome = mkdtempSync(join(tmpdir(), 'openclaude-codex-'))
  try {
    writeFileSync(
      join(codexHome, 'auth.json'),
      JSON.stringify({
        access_token: 'codex-live',
        account_id: 'acct_auth',
      }),
      'utf8',
    )

    const env = await buildLaunchEnv({
      profile: 'codex',
      persisted: profile('codex', {
        OPENAI_BASE_URL: 'https://chatgpt.com/backend-api/codex',
        OPENAI_MODEL: 'codexspark',
        CHATGPT_ACCOUNT_ID: 'acct_persisted',
      }),
      goal: 'balanced',
      processEnv: {
        CODEX_HOME: codexHome,
      },
    })

    assert.equal(env.CHATGPT_ACCOUNT_ID, 'acct_auth')
  } finally {
    rmSync(codexHome, { recursive: true, force: true })
  }
})

test('ollama profiles never persist openai api keys', () => {
  const env = buildOllamaProfileEnv('llama3.1:8b', {
    getOllamaChatBaseUrl: () => 'http://localhost:11434/v1',
  })

  assert.deepEqual(env, {
    OPENAI_BASE_URL: 'http://localhost:11434/v1',
    OPENAI_MODEL: 'llama3.1:8b',
  })
  assert.equal('OPENAI_API_KEY' in env, false)
})

test('codex profiles accept explicit codex credentials', () => {
  const env = buildCodexProfileEnv({
    model: 'codexspark',
    apiKey: 'codex-live',
    processEnv: {
      CHATGPT_ACCOUNT_ID: 'acct_123',
    },
  })

  assert.deepEqual(env, {
    OPENAI_BASE_URL: 'https://chatgpt.com/backend-api/codex',
    OPENAI_MODEL: 'codexspark',
    CODEX_API_KEY: 'codex-live',
    CHATGPT_ACCOUNT_ID: 'acct_123',
  })
})

test('codex profiles require a chatgpt account id', () => {
  const env = buildCodexProfileEnv({
    model: 'codexspark',
    apiKey: 'codex-live',
    processEnv: {
      CODEX_AUTH_JSON_PATH: missingCodexAuthPath,
    },
  })

  assert.equal(env, null)
})

test('gemini profiles accept google api key fallback', () => {
  const env = buildGeminiProfileEnv({
    processEnv: {
      GOOGLE_API_KEY: 'gem-live',
    },
  })

  assert.deepEqual(env, {
    GEMINI_MODEL: 'gemini-2.0-flash',
    GEMINI_API_KEY: 'gem-live',
  })
})

test('gemini profiles require a key', () => {
  const env = buildGeminiProfileEnv({
    processEnv: {},
  })

  assert.equal(env, null)
})

test('openai profiles ignore codex shell transport hints', () => {
  const env = buildOpenAIProfileEnv({
    goal: 'balanced',
    apiKey: 'sk-live',
    processEnv: {
      OPENAI_BASE_URL: 'https://chatgpt.com/backend-api/codex',
      OPENAI_MODEL: 'codexplan',
      OPENAI_API_KEY: 'sk-live',
    },
  })

  assert.deepEqual(env, {
    OPENAI_BASE_URL: 'https://api.openai.com/v1',
    OPENAI_MODEL: 'gpt-4o',
    OPENAI_API_KEY: 'sk-live',
  })
})

test('auto profile falls back to openai when no viable ollama model exists', () => {
  assert.equal(selectAutoProfile(null), 'openai')
  assert.equal(selectAutoProfile('qwen2.5-coder:7b'), 'ollama')
})
