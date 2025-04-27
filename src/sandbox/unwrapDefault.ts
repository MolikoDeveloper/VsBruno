
export const unwrapDefault = (m: any) =>
    m && typeof m === "object" &&
    "default" in m && Object.keys(m).filter(k => k !== "__esModule").length === 1
      ? m.default
      : m;
  