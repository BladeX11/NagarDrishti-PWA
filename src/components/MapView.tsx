import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Issue } from '../App'

type Props = { issues: Issue[]; selectedIssue: Issue | null; onSelectIssue: (issue: Issue) => void }

export function MapView({ issues, selectedIssue, onSelectIssue }: Props) {
  const mapElement = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef<L.CircleMarker[]>([])

  useEffect(() => {
    if (!mapElement.current || map.current) return
    map.current = L.map(mapElement.current, { zoomControl: false, attributionControl: false }).setView([18.5204, 73.8567], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map.current)
    return () => { map.current?.remove(); map.current = null }
  }, [])

  useEffect(() => {
    if (!map.current) return
    markers.current.forEach((marker) => marker.remove())
    const located = issues.filter((issue) => issue.position !== null)
    markers.current = located.map((issue) => {
      const colour = issue.status === 'Open' ? '#e38b37' : issue.status === 'In Progress' || issue.status === 'Assigned' || issue.status === 'Triaged' ? '#27766b' : '#4873a8'
      const marker = L.circleMarker(issue.position!, { radius: issue.id === selectedIssue?.id ? 11 : 8, fillColor: colour, color: '#fffaf0', weight: 3, fillOpacity: 1 }).addTo(map.current!)
      marker.bindTooltip(issue.category, { direction: 'top', offset: [0, -8] })
      marker.on('click', () => onSelectIssue(issue))
      return marker
    })
    if (located.length > 0) {
      const points = located.map((issue) => issue.position!)
      map.current.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 15 })
    }
  }, [issues, onSelectIssue, selectedIssue])

  return <div className="map-view" ref={mapElement} />
}
