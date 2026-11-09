export const PROFILE_VERSION = "F350-PROTOCOL-0.1";

export const CRITERIA = [
  {
    parameter: "MTF10",
    operator: ">=",
    threshold: 1.0,
    units: "lp/mm",
    source: "Published dental CBCT QA methodology",
    sourceVersion: "edge-MTF-0.1",
    profileVersion: PROFILE_VERSION,
  },
  {
    parameter: "CNRI",
    operator: "<",
    threshold: 20,
    units: "dimensionless",
    source: "Published DIN-style dental CBCT QA methodology",
    sourceVersion: "cnri-edge-0.1",
    profileVersion: PROFILE_VERSION,
  },
  {
    parameter: "UNIFORMITY_H",
    operator: ">",
    threshold: 5,
    units: "dimensionless",
    source: "Published dental CBCT QA methodology",
    sourceVersion: "five-roi-uniformity-0.1",
    profileVersion: PROFILE_VERSION,
  },
  {
    parameter: "GEOMETRY_ERROR_PERCENT",
    operator: "<=",
    threshold: 5,
    units: "%",
    source: "Phantom marker distance measurement",
    sourceVersion: "geometry-two-point-0.1",
    profileVersion: PROFILE_VERSION,
  },
];

export const PHANTOM_PROFILES = {
  QUART_DVT_AP: {
    id: "QUART_DVT_AP",
    manufacturer: "QUART",
    model: "DVT_AP",
    serialRequired: true,
    materialDefinitions: {
      PMMA: "Homogeneous PMMA reference material",
      PVC: "High-contrast PVC insert",
      AIR: "Air-equivalent low-density region",
    },
    roiTemplates: [
      { id: "mtf_xy_edge", type: "MTF_XY_EDGE", plane: "axial", label: "MTF XY edge" },
      { id: "mtf_z_edge", type: "MTF_Z_EDGE", plane: "sagittal", label: "MTF Z edge" },
      { id: "cnri_edge", type: "CNRI_EDGE", plane: "axial", label: "PVC / PMMA edge" },
      { id: "uniformity_center", type: "UNIFORMITY_CENTER", plane: "axial", label: "Uniformity Center" },
      { id: "uniformity_top", type: "UNIFORMITY_TOP", plane: "axial", label: "Uniformity Top" },
      { id: "uniformity_bottom", type: "UNIFORMITY_BOTTOM", plane: "axial", label: "Uniformity Bottom" },
      { id: "uniformity_left", type: "UNIFORMITY_LEFT", plane: "axial", label: "Uniformity Left" },
      { id: "uniformity_right", type: "UNIFORMITY_RIGHT", plane: "axial", label: "Uniformity Right" },
      { id: "geometry_a", type: "GEOMETRY_MARKER", plane: "axial", label: "Geometry marker A" },
      { id: "geometry_b", type: "GEOMETRY_MARKER", plane: "axial", label: "Geometry marker B" },
    ],
    geometryReferences: [
      { id: "quart-marker-distance", label: "Known phantom marker distance", distanceMm: 50 },
    ],
    supportedTests: ["MTF_XY", "MTF_Z", "CNRI", "UNIFORMITY", "NOISE", "GEOMETRY", "ARTEFACTS"],
    criteria: CRITERIA,
  },
};

export function getPhantomProfile(id = "QUART_DVT_AP") {
  return PHANTOM_PROFILES[id] || PHANTOM_PROFILES.QUART_DVT_AP;
}
