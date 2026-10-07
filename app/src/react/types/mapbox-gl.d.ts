/**
 * Mapbox ships no types and the map card only touches a handful of its API, so the parts it
 * uses are declared here rather than pulling in another dependency.
 */
declare module 'mapbox-gl' {
	type LngLat = [number, number];

	export class Popup {
		setText(text: string): Popup;
	}

	export class Marker {
		constructor(options?: { color?: string });
		setLngLat(position: LngLat): Marker;
		setPopup(popup: Popup): Marker;
		addTo(map: Map): Marker;
	}

	export class Map {
		constructor(options: { container: HTMLElement; style: string; center: LngLat; zoom: number; attributionControl?: boolean });
		remove(): void;
	}

	const mapboxgl: {
		accessToken: string;
		Map: typeof Map;
		Marker: typeof Marker;
		Popup: typeof Popup;
	};

	export default mapboxgl;
}
