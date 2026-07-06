import { Link } from 'react-router-dom'
import { Share2, Pencil } from 'lucide-react'
import { useConfirm } from '../../components/ui/useConfirm'
import { CRANBERRY_LAKE } from '../../lib/map/constants'
import { PIN_COLORS, PIN_SVG, GUIDE_SECTIONS } from '../../lib/map/constants'
import { haversineKm, bearing } from '../../lib/map/utils'

export default function PinPopupContent({ pin, cabin, nextBooking, admin, onDelete, onEdit, onPhotoUpload }) {
  const { confirm, ConfirmDialog } = useConfirm()
  const dist = haversineKm(CRANBERRY_LAKE[0], CRANBERRY_LAKE[1], pin.latitude, pin.longitude)
  const dir = bearing(CRANBERRY_LAKE[0], CRANBERRY_LAKE[1], pin.latitude, pin.longitude)
  const pinColor = cabin?.color || PIN_COLORS[pin.type] || '#6b7280'
  const svg = PIN_SVG[pin.type] || PIN_SVG.other

  const guideKey = Object.keys(GUIDE_SECTIONS).find(k => pin.label.toLowerCase().includes(k) || pin.type === k)

  const handleShare = () => {
    const text = `${pin.label} — ${(dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`)} ${dir} of landing`
    if (navigator.share) navigator.share({ title: pin.label, text }).catch(() => {})
    else navigator.clipboard.writeText(text)
  }

  return (
    <div className="text-xs space-y-1.5 min-w-[180px]">
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: pinColor }}>
          <svg viewBox="0 0 16 16" fill="white" width="10" height="10">{svg}</svg>
        </span>
        <strong className="text-sm text-stone-800 dark:text-stone-200">{pin.label}</strong>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <span className="capitalize text-stone-400 dark:text-stone-500">{pin.type}</span>
        {cabin && <><span className="text-stone-300 dark:text-stone-600">&middot;</span><span className="inline-flex items-center gap-0.5 text-stone-500 dark:text-stone-400"><span className="inline-block w-2 h-2 rounded-full" style={{ background: cabin.color }} />{cabin.name}</span></>}
      </div>
      {pin.description && <div className="text-stone-500 dark:text-stone-400">{pin.description}</div>}
      <div className="text-stone-400 dark:text-stone-500">{dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`} {dir} of landing</div>

      {cabin && (
        <div className="space-y-1">
          <Link to="/cabins" className="block text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium">View Cabin Details &rarr;</Link>
          <Link to="/schedule" className="block text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium">Book This Cabin &rarr;</Link>
          {nextBooking && <div className="bg-stone-50 dark:bg-stone-950 rounded p-1.5 text-stone-500 dark:text-stone-400">Next: {nextBooking.guests || 'Someone'} &middot; {new Date(nextBooking.start_date).toLocaleDateString()}</div>}
        </div>
      )}

      {guideKey && <a href={GUIDE_SECTIONS[guideKey]} className="block text-amber-600 dark:text-amber-400 hover:text-amber-800 font-medium">View Guide &rarr;</a>}

      <button onClick={handleShare} className="inline-flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 transition-colors mt-1"><Share2 className="h-3 w-3" /> Share</button>

      {pin.image_url && <img src={pin.image_url} alt="" className="w-full h-24 object-cover rounded mt-1" />}

      {admin && (
        <div className="flex gap-2 pt-1 border-t border-stone-200 dark:border-stone-700 mt-2">
          <button onClick={() => onEdit(pin)} className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 text-xs"><Pencil className="h-3 w-3" /> Edit</button>
          <label className="text-blue-600 dark:text-blue-400 hover:text-blue-800 cursor-pointer text-xs">Add Photo<input type="file" accept="image/*" className="hidden" onChange={(e) => onPhotoUpload(pin, e.target.files?.[0])} /></label>
          <button onClick={async () => { if (await confirm({ title: 'Delete Pin', message: 'Are you sure you want to delete this pin?' })) onDelete(pin.id) }} className="text-rose-600 dark:text-rose-400 hover:text-rose-800 text-xs">Delete</button>
        </div>
      )}
      {ConfirmDialog}
    </div>
  )
}
