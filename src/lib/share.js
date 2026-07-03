import { useToast } from '../components/ui/Toast'

export function useShare() {
  const toast = useToast()

  const copy = async (text, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} to clipboard`)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const share = async (data) => {
    if (navigator.share) {
      try { await navigator.share(data) }
      catch {}
    } else {
      await copy(data.text || data.url || data.title, 'Shared')
    }
  }

  return { copy, share }
}
