import { useToast } from '../components/ui/Toast'

interface ShareData {
  title?: string
  text?: string
  url?: string
}

export function useShare() {
  const toast = useToast()

  const copy = async (text: string, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} to clipboard`)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const share = async (data: ShareData) => {
    if (navigator.share) {
      try { await navigator.share(data) }
      catch {}
    } else {
      await copy(data.text || data.url || data.title || '', 'Shared')
    }
  }

  return { copy, share }
}
