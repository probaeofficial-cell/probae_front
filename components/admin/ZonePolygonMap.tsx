"use client";

import React from "react";
import { MapContainer, TileLayer, Polygon, Polyline, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface ZonePolygonMapProps {
  polygon: [number, number][];
  setPolygon: (polygon: [number, number][]) => void;
  center?: [number, number];
}

function PolygonDrawer({ polygon, setPolygon }: { polygon: [number, number][], setPolygon: (polygon: [number, number][]) => void }) {
  useMapEvents({
    click(e) {
      setPolygon([...polygon, [e.latlng.lat, e.latlng.lng]]);
    }
  });

  return (
    <>
      {polygon.map((pos, idx) => (
        <Marker
          key={idx}
          position={pos}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const newPos = marker.getLatLng();
              const newPolygon = [...polygon];
              newPolygon[idx] = [newPos.lat, newPos.lng];
              setPolygon(newPolygon);
            },
            click: (e) => {
              // Click to remove vertex? Nah, let's keep it simple.
              L.DomEvent.stopPropagation(e.originalEvent);
            }
          }}
        />
      ))}
      
      {polygon.length >= 3 && (
        <Polygon positions={polygon} pathOptions={{ color: '#6A0FAD', fillColor: '#6A0FAD', fillOpacity: 0.3 }} />
      )}
      {polygon.length === 2 && (
        <Polyline positions={polygon} pathOptions={{ color: '#6A0FAD' }} />
      )}
    </>
  );
}

export default function ZonePolygonMap({ polygon, setPolygon, center = [11.2588, 75.7804] }: ZonePolygonMapProps) {
  return (
    <div style={{ height: "400px", width: "100%", borderRadius: "0.75rem", overflow: "hidden", border: "1px solid #e5e5e5", position: "relative" }}>
      <div className="absolute top-2 right-2 z-[400] bg-white px-3 py-2 rounded-lg shadow-md text-xs font-bold text-neutral-600">
        Click on the map to add points.<br/>Drag points to adjust.
      </div>
      
      {polygon.length > 0 && (
        <button 
          onClick={(e) => { e.preventDefault(); setPolygon([]); }}
          className="absolute bottom-6 left-2 z-[400] bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg shadow-md text-xs font-bold"
        >
          Clear Points
        </button>
      )}

      <MapContainer
        key={center.join(',')}
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <PolygonDrawer polygon={polygon} setPolygon={setPolygon} />
      </MapContainer>
    </div>
  );
}
