/**
 * Food Quality Assessment Service
 * Provides image analysis for food quality assessment
 */
class FoodQualityService {
  constructor() {
    // Initialize with default settings
    this.initialized = false;
    this.mlServerUrl = 'http://localhost:5000'; // ML server URL
  }

  /**
   * Analyzes a food image and returns quality assessment
   * @param {File} imageFile - The image file to analyze
   * @returns {Promise} - Quality assessment results
   */
  async analyzeImage(imageFile) {
    try {
      if (!imageFile) {
        throw new Error('No image file provided');
      }
      
      // Validate file type
      if (!imageFile.type.startsWith('image/')) {
        throw new Error('File is not an image');
      }
      
      // Create FormData to send the image
      const formData = new FormData();
      formData.append('image', imageFile);
      
      // Send to ML server directly
      const response = await fetch(`${this.mlServerUrl}/analyze`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze image');
      }
      
      const mlResults = await response.json();
      return mlResults;
      
    } catch (error) {
      console.error('Error analyzing food image:', error);
      throw error;
    }
  }
  
  /**
   * Get quality badge class based on quality rating
   * @param {string} quality - Quality rating (Excellent, Good, Fair, Poor)
   * @returns {string} - CSS class for the badge
   */
  getQualityBadgeClass(quality) {
    switch (quality) {
      case 'Excellent':
      case 'Good':
        return 'bg-success';
      case 'Fair':
        return 'bg-warning';
      case 'Poor':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }
}

// Create a singleton instance
const foodQualityService = new FoodQualityService();
