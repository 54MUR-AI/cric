const MAX_DIMENSION = 2048
const QUALITY = 0.85

export async function resizeImage(file) {
  // Only resize images, not videos
  if (!file.type.startsWith('image/')) return file

  // Don't resize small images
  if (file.size < 500 * 1024) return file

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img

      // Calculate new dimensions
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          const ext = file.name.split('.').pop()?.toLowerCase()
          const type = ext === 'png' ? 'image/png' : 'image/jpeg'
          const resized = new File([blob], file.name, { type, lastModified: Date.now() })
          resolve(resized)
        },
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }

    img.src = url
  })
}
