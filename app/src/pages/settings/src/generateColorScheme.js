export const generateColorScheme = (hexColor) => {
  // Helper function to convert hex to RGB
  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  // Helper function to calculate luminance
  const luminance = (r, g, b) => {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  // Helper function to interpolate between two colors
  const interpolateColor = (color1, color2, factor) => {
    return color1.map((c, i) => Math.round(c + (color2[i] - c) * factor));
  };

  // Convert hex to RGB
  const [r, g, b] = hexToRgb(hexColor);
  const inputColor = [r, g, b];

  // Calculate the luminance of the input color
  const inputLuminance = luminance(r, g, b);

  // Generate colors for the entire scale
  const scale = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const colors = [];

  // Define the lightest and darkest colors
  const lightestColor = [245, 245, 245]; // Light gray
  const darkestColor = [8, 8, 8]; // Very dark gray

  // Calculate the range of luminance to work with
  const luminanceRange = luminance(...lightestColor) - luminance(...darkestColor);
  const adjustedInputLuminance = (inputLuminance - luminance(...darkestColor)) / luminanceRange;

  scale.forEach((step) => {
    // Reverse the target luminance calculation
    const targetLuminance = luminance(...lightestColor) - (step / 1000) * luminanceRange;
    let resultColor;

    if (targetLuminance > inputLuminance) {
      // Interpolate between input color and lightest color
      const factor = (targetLuminance - inputLuminance) / (luminance(...lightestColor) - inputLuminance);
      resultColor = interpolateColor(inputColor, lightestColor, factor);
    } else {
      // Interpolate between darkest color and input color
      const factor = (inputLuminance - targetLuminance) / (inputLuminance - luminance(...darkestColor));
      resultColor = interpolateColor(inputColor, darkestColor, factor);
    }

    // Convert back to hex
    const toHex = (c) => {
      const hex = c.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    const finalHex = `#${toHex(resultColor[0])}${toHex(resultColor[1])}${toHex(resultColor[2])}`;
    colors.push({ step, color: finalHex });
  });

  return [{ step: "0", color: "#ffffff" }, ...colors];
};
