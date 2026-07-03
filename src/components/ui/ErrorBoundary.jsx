import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
          <h2 className="text-lg font-bold text-stone-800 mb-1">Something went wrong</h2>
          <p className="text-sm text-stone-400 mb-4 max-w-xs">{this.state.error.message}</p>
          <button onClick={() => { this.setState({ error: null }); this.props.onRetry?.() }} className="inline-flex items-center gap-1.5 rounded-lg bg-stone-800 text-white px-4 py-2 text-sm hover:bg-stone-700 transition-colors">
            <RotateCcw className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
