
export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface MeansEndChain {
  id: string;
  label: string;
  boundingBox: BoundingBox;
  attributes: string[];
  consequences: string[];
  values: string[];
  description: string;
}

export interface AnalysisResult {
  chains: MeansEndChain[];
}
