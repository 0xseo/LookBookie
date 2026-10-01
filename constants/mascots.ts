// Replace these PNG files to customize each screen without changing imports.
export const HEADER_MASCOTS = {
  wardrobe: require("../assets/mascots/wardrobe-header.png"),
  myfit: require("../assets/mascots/myfit-header.png"),
  codibook: require("../assets/mascots/codibook-header.png"),
  friends: require("../assets/mascots/friends-header.png"),
  mypage: require("../assets/mascots/mypage-header.png"),
};

export const EMPTY_MASCOTS = {
  wardrobe: require("../assets/mascots/wardrobe-empty.png"),
  myfit: require("../assets/mascots/myfit-empty.png"),
  codibook: require("../assets/mascots/codibook-empty.png"),
  friends: require("../assets/mascots/friends-empty.png"),
  mypage: require("../assets/mascots/mypage-empty.png"),
};

export type MascotScreen = keyof typeof HEADER_MASCOTS;
export type EmptyMascotScreen = keyof typeof EMPTY_MASCOTS;

export type MascotFrame = {
  imageWidth: number;
  imageHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  displayScale?: number;
};

// Visible artwork bounds in the current PNGs, excluding their transparent margins.
// Current header/empty pairs use the same artwork and therefore share a frame.
export const MASCOT_FRAMES: Record<MascotScreen, MascotFrame> = {
  wardrobe: { imageWidth: 1466, imageHeight: 1073, x: 277, y: 161, width: 924, height: 846, displayScale: 0.95 },
  myfit: { imageWidth: 1254, imageHeight: 1254, x: 191, y: 295, width: 813, height: 825 },
  codibook: { imageWidth: 1374, imageHeight: 1145, x: 199, y: 154, width: 988, height: 791 },
  friends: { imageWidth: 1400, imageHeight: 1024, x: 415, y: 156, width: 629, height: 794, displayScale: 1.05 },
  mypage: { imageWidth: 1472, imageHeight: 1068, x: 207, y: 239, width: 1025, height: 664 },
};
