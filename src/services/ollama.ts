// ====== Ollama API 服务 ======

export interface ChatOptions {
  ollamaUrl: string
  model: string
  systemPrompt: string
  messages: { role: string; content: string }[]
  onToken?: (token: string) => void   // 流式回调
}

/** 非流式对话 */
export async function chatOnce(opts: ChatOptions): Promise<string> {
  const res = await fetch(`${opts.ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        ...opts.messages,
      ],
      stream: false,
      options: { num_ctx: 32768 },
    }),
  })

  if (!res.ok) throw new Error(`Ollama 请求失败 (${res.status})`)
  const data = await res.json()
  return data.message?.content || data.response || ''
}

/** 流式对话 */
export async function chatStream(opts: ChatOptions): Promise<string> {
  const res = await fetch(`${opts.ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        ...opts.messages,
      ],
      stream: true,
      options: { num_ctx: 32768 },
    }),
  })

  if (!res.ok) throw new Error(`Ollama 请求失败 (${res.status})`)
  if (!res.body) throw new Error('不支持流式')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const data = JSON.parse(line)
        const token = data.message?.content || ''
        if (token) {
          full += token
          opts.onToken?.(token)
        }
      } catch { /* 跳过非 JSON 行 */ }
    }
  }

  return full
}

/** 翻译（中文 → Danbooru 标签） */
export async function translateToTags(ollamaUrl: string, chineseText: string): Promise<string> {
  const prompt = `Translate the following Chinese character/scene description into Danbooru tags (comma-separated, lowercase, use underscores for multi-word tags). Only output the tags, no explanation.\n\nInput: ${chineseText}`
  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5:7b-ctx32k',
      prompt,
      stream: false,
    }),
  })
  if (!res.ok) throw new Error(`翻译失败 (${res.status})`)
  const data = await res.json()
  return data.response || ''
}
