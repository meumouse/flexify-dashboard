/**
 * Converts number to icon star rep
 *
 * @param {Number} rating
 */
export const ratingToStars = (rating) => {
  // Convert 0-100 scale to 0-5 scale
  const scaledRating = (rating / 100) * 5;
  // Ensure rating is between 0 and 5
  const normalizedRating = Math.max(0, Math.min(5, scaledRating));

  const result = [];
  const fullStars = Math.floor(normalizedRating);
  const hasHalfStar = normalizedRating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      result.push("star_full");
    } else if (i === fullStars && hasHalfStar) {
      result.push("star_half");
    } else {
      result.push("star_empty");
    }
  }
  return result;
};
