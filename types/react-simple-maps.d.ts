declare module "react-simple-maps" {
  import * as React from "react";

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    [key: string]: unknown;
  }

  export interface SphereProps {
    id: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }

  export interface GraticuleProps {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }

  export interface GeographiesProps {
    geography: string | object;
    children: (props: { geographies: GeoFeature[] }) => React.ReactNode;
  }

  export interface GeoFeature {
    rsmKey: string;
    id: string | number;
    properties: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface GeographyStyleEntry {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    outline?: string;
    cursor?: string;
    [key: string]: unknown;
  }

  export interface GeographyProps {
    geography: GeoFeature;
    style?: {
      default?: GeographyStyleEntry;
      hover?: GeographyStyleEntry;
      pressed?: GeographyStyleEntry;
    };
    onClick?: (geo: GeoFeature, evt: React.MouseEvent) => void;
    onMouseEnter?: (geo: GeoFeature, evt: React.MouseEvent) => void;
    onMouseLeave?: (geo: GeoFeature, evt: React.MouseEvent) => void;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    [key: string]: unknown;
  }

  export const ComposableMap: React.FC<ComposableMapProps>;
  export const Sphere: React.FC<SphereProps>;
  export const Graticule: React.FC<GraticuleProps>;
  export const Geographies: React.FC<GeographiesProps>;
  export const Geography: React.FC<GeographyProps>;
  export const Marker: React.FC<Record<string, unknown>>;
  export const Line: React.FC<Record<string, unknown>>;
  export const ZoomableGroup: React.FC<Record<string, unknown>>;
}
