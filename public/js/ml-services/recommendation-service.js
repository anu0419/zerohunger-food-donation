/**
 * Smart Donation Matching Service
 * 
 * This service provides organization recommendations for donors based on:
 * - Location proximity
 * - Previous donation history
 * - Organization needs
 * - Donation type preferences
 */

class RecommendationService {
  constructor() {
    this.donationHistory = [];
    this.organizations = [];
    this.initialized = false;
  }

  /**
   * Initialize the recommendation service with data
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Fetch organizations data
      const response = await fetch('/api/organizations');
      this.organizations = await response.json();
      
      // If user is logged in, fetch their donation history
      if (this.isUserLoggedIn()) {
        const historyResponse = await fetch('/api/donor/history');
        this.donationHistory = await historyResponse.json();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize recommendation service:', error);
    }
  }

  /**
   * Check if user is logged in
   */
  isUserLoggedIn() {
    // Simple check for session - can be enhanced
    return document.cookie.includes('connect.sid');
  }

  /**
   * Get recommended organizations based on donor's location and preferences
   * @param {Object} donorLocation - The donor's location coordinates
   * @param {string} donationType - Type of donation (Food/Grocery)
   * @returns {Array} - Sorted list of recommended organizations
   */
  async getRecommendedOrganizations(donorLocation, donationType) {
    await this.initialize();
    
    if (!this.organizations.length) {
      return [];
    }
    
    // Calculate scores for each organization
    const scoredOrganizations = this.organizations.map(org => {
      let score = 0;
      
      // Factor 1: Location proximity (if we have location data)
      if (donorLocation && org.location) {
        const distance = this.calculateDistance(
          donorLocation.lat, 
          donorLocation.lng, 
          org.location.lat, 
          org.location.lng
        );
        
        // Higher score for closer organizations (inverse relationship)
        score += (100 - Math.min(distance, 100)) * 0.5; // Max 50 points for location
      }
      
      // Factor 2: Previous donation history
      const previousDonations = this.donationHistory.filter(
        donation => donation.Donate_to === org.name
      );
      
      if (previousDonations.length > 0) {
        // Reward previous successful donations
        score += Math.min(previousDonations.length * 10, 30); // Max 30 points for history
      }
      
      // Factor 3: Donation type match (can be expanded with more specific matching)
      if (donationType) {
        // Simple matching for now - can be enhanced with more data
        score += 20; // 20 points for matching donation type
      }
      
      return {
        ...org,
        score
      };
    });
    
    // Sort by score (highest first)
    return scoredOrganizations.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of point 1
   * @param {number} lon1 - Longitude of point 1
   * @param {number} lat2 - Latitude of point 2
   * @param {number} lon2 - Longitude of point 2
   * @returns {number} - Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance;
  }
  
  /**
   * Convert degrees to radians
   * @param {number} deg - Degrees
   * @returns {number} - Radians
   */
  deg2rad(deg) {
    return deg * (Math.PI/180);
  }
}

// Create a singleton instance
const recommendationService = new RecommendationService();
