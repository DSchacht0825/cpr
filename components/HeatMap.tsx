"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface VisitLocation {
  id: string;
  latitude: number;
  longitude: number;
  visit_outcome?: string;
  location_address: string;
  visit_date: string;
}

interface HeatMapProps {
  visits: VisitLocation[];
  height?: string;
}

export default function HeatMap({ visits, height = "400px" }: HeatMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      console.error("Mapbox token not found. Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local");
      return;
    }

    mapboxgl.accessToken = token;

    // Center on San Diego area by default
    const defaultCenter: [number, number] = [-117.1611, 32.7157];

    // Calculate center from visits if available
    let center = defaultCenter;
    if (visits.length > 0) {
      const validVisits = visits.filter(v => v.latitude && v.longitude);
      if (validVisits.length > 0) {
        const avgLat = validVisits.reduce((sum, v) => sum + v.latitude, 0) / validVisits.length;
        const avgLng = validVisits.reduce((sum, v) => sum + v.longitude, 0) / validVisits.length;
        center = [avgLng, avgLat];
      }
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: center,
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const validVisits = visits.filter(v => v.latitude && v.longitude);

    // Remove existing layers and source if they exist
    if (map.current.getLayer("visits-heat")) {
      map.current.removeLayer("visits-heat");
    }
    if (map.current.getLayer("visits-point")) {
      map.current.removeLayer("visits-point");
    }
    if (map.current.getSource("visits")) {
      map.current.removeSource("visits");
    }

    if (validVisits.length === 0) return;

    // Create GeoJSON from visits
    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: validVisits.map((visit) => ({
        type: "Feature",
        properties: {
          id: visit.id,
          outcome: visit.visit_outcome,
          address: visit.location_address,
          date: visit.visit_date,
        },
        geometry: {
          type: "Point",
          coordinates: [visit.longitude, visit.latitude],
        },
      })),
    };

    map.current.addSource("visits", {
      type: "geojson",
      data: geojson,
    });

    // Add heat map layer
    map.current.addLayer({
      id: "visits-heat",
      type: "heatmap",
      source: "visits",
      maxzoom: 15,
      paint: {
        // Increase weight based on frequency
        "heatmap-weight": 1,
        // Increase intensity as zoom level increases
        "heatmap-intensity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0, 1,
          15, 3,
        ],
        // Color ramp for heatmap
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(0, 0, 255, 0)",
          0.1, "rgba(65, 182, 196, 0.5)",
          0.3, "rgba(127, 205, 187, 0.6)",
          0.5, "rgba(199, 233, 180, 0.7)",
          0.7, "rgba(255, 237, 160, 0.8)",
          0.9, "rgba(254, 178, 76, 0.9)",
          1, "rgba(240, 59, 32, 1)",
        ],
        // Adjust the heatmap radius by zoom level
        "heatmap-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0, 15,
          15, 30,
        ],
        // Decrease opacity as zoom increases
        "heatmap-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12, 1,
          15, 0.5,
        ],
      },
    });

    // Add point layer for zoomed in view
    map.current.addLayer({
      id: "visits-point",
      type: "circle",
      source: "visits",
      minzoom: 12,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12, 4,
          16, 10,
        ],
        "circle-color": [
          "case",
          ["==", ["get", "outcome"], "engagement"],
          "#22c55e", // green for engagements
          "#f59e0b", // amber for attempts
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12, 0,
          13, 1,
        ],
      },
    });

    // Add popup on click
    map.current.on("click", "visits-point", (e) => {
      if (!e.features || e.features.length === 0) return;

      const feature = e.features[0];
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
      const props = feature.properties;

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div style="color: #333; padding: 4px;">
            <strong>${props?.address || "Unknown"}</strong><br/>
            <span style="color: ${props?.outcome === 'engagement' ? '#22c55e' : '#f59e0b'};">
              ${props?.outcome === 'engagement' ? 'Engagement' : 'Attempt'}
            </span><br/>
            <small>${new Date(props?.date).toLocaleDateString()}</small>
          </div>
        `)
        .addTo(map.current!);
    });

    // Change cursor on hover
    map.current.on("mouseenter", "visits-point", () => {
      if (map.current) map.current.getCanvas().style.cursor = "pointer";
    });
    map.current.on("mouseleave", "visits-point", () => {
      if (map.current) map.current.getCanvas().style.cursor = "";
    });

    // Fit bounds to show all visits
    if (validVisits.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      validVisits.forEach((visit) => {
        bounds.extend([visit.longitude, visit.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }

  }, [visits, mapLoaded]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200">
      <div ref={mapContainer} style={{ height }} />
      {visits.filter(v => v.latitude && v.longitude).length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <p className="text-gray-500">No visit locations to display</p>
        </div>
      )}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow px-3 py-2 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-gray-700">Engagement</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-gray-700">Attempt</span>
          </div>
        </div>
      </div>
    </div>
  );
}
