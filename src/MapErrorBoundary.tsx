import { Component, type ReactNode } from 'react'

interface MapErrorBoundaryProps {
  children: ReactNode
}

interface MapErrorBoundaryState {
  hasError: boolean
}

// The one class component this function-component codebase needs — React
// error boundaries only work as classes. A belt-and-suspenders guard against
// the map SDK throwing during initialization (flaky connection, a
// misconfigured/quota-exceeded key) even while nominally online, so a map
// failure can never blank the rest of the app.
export class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <p className="map-card-placeholder">Map unavailable.</p>
    }
    return this.props.children
  }
}
