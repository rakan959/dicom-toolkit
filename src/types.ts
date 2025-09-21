export type UID = string;

export interface SeriesInstance {
  seriesInstanceUID: UID;
  sopInstances: { sopInstanceUID: UID; frameCount: number }[];
  modality: string;
  description?: string;
}

export interface Study {
  studyInstanceUID: UID;
  series: SeriesInstance[];
  patientId?: string;
  patientName?: string;
}
