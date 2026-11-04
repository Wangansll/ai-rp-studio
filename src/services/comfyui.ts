// ====== ComfyUI 生图服务 ======

export interface ImageGenProps {
  comfyUrl: string
  model: string
  positive: string        // Danbooru 标签
  negative?: string
  width?: number
  height?: number
}

const DEFAULT_NEGATIVE = 'lowres, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark'

/** 提交 ComfyUI 工作流并轮询结果 */
export async function generateImage(opts: ImageGenProps): Promise<string> {
  const { comfyUrl } = opts
  const promptId = await submitWorkflow(opts)
  return await pollResult(comfyUrl, promptId)
}

/** 注入标记后提交 SDXL 工作流 */
async function submitWorkflow(opts: ImageGenProps): Promise<string> {
  const { comfyUrl, model, positive, negative, width = 512, height = 768 } = opts
  const fullPositive = `masterpiece, best quality, ${positive}`
  const fullNegative = negative || DEFAULT_NEGATIVE

  const workflow = {
    '3': { class_type: 'KSampler', inputs: { seed: Math.floor(Math.random() * 1e10), steps: 25, cfg: 6.5, sampler_name: 'euler_ancestral', scheduler: 'normal', denoise: 1, model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0] } },
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: model } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: fullPositive, clip: ['4', 1] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: fullNegative, clip: ['4', 1] } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'ai_rp', images: ['8', 0] } },
  }

  const res = await fetch(`${comfyUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  })
  if (!res.ok) throw new Error(`ComfyUI 提交失败 (${res.status})`)
  const data = await res.json()
  return data.prompt_id
}

/** 轮询直到生成完成，返回图片文件名 */
async function pollResult(comfyUrl: string, promptId: string, timeoutMs = 120000): Promise<string> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${comfyUrl}/history/${promptId}`)
    if (!res.ok) { await sleep(1000); continue }
    const data = await res.json()
    console.log('pollResult:', JSON.stringify(data).substring(0, 300))
    if (data[promptId]?.outputs) {
      const outputs = data[promptId].outputs
      for (const nodeId of Object.keys(outputs)) {
        const images = outputs[nodeId]?.images
        if (images?.length) {
          return images[0].filename
        }
      }
    }
    await sleep(2000)
  }
  throw new Error('ComfyUI 生成超时')
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

/** 获取 ComfyUI 输出图片的 URL */
export function getImageUrl(comfyUrl: string, filename: string, type = 'output'): string {
  return `${comfyUrl}/view?filename=${encodeURIComponent(filename)}&type=${type}`
}
