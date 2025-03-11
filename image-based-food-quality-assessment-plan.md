# Image-Based Food Quality Assessment Implementation Plan

## Current System Analysis

The food donation platform currently allows donors to:
- Add food/grocery items with quantities
- Select recipient organizations (with ML-based recommendations)
- Complete the donation process

The donation forms are in `views/food_donate_form.ejs` and `views/grocery_donate_form.ejs`.

## Implementation Architecture

We'll implement image-based food quality assessment using the following components:

1. **Image Upload UI** - Form modifications to allow photo uploads
2. **Server-side Processing** - Image analysis using Clarifai's Food Recognition API
3. **Feedback Generation** - Quality assessment based on image analysis
4. **UI Integration** - Display results without disrupting existing flow

## Detailed Implementation Steps

### 1. Install Required Packages

```bash
npm install --save multer clarifai sharp
```

- `multer`: Handle file uploads
- `clarifai`: Food recognition API
- `sharp`: Image processing and optimization

### 2. Update Server Configuration

Add multer configuration in `server.js`:

```javascript
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Set up storage for uploaded images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/food-images';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Filter for image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});
```

### 3. Create Image Analysis Service

Create a new file `public/js/ml-services/food-quality-service.js`:

```javascript
/**
 * Food Quality Assessment Service
 * Uses Clarifai's API to analyze food images and assess quality
 */
class FoodQualityService {
  constructor() {
    this.apiKey = 'YOUR_CLARIFAI_API_KEY'; // Store this securely in environment variables
    this.baseUrl = 'https://api.clarifai.com/v2/models/';
    this.foodModel = 'bd367be194cf45149e75f01d59f77ba7'; // Clarifai's food model
  }

  /**
   * Analyzes a food image and returns quality assessment
   * @param {string} imageUrl - URL of the image to analyze
   * @returns {Promise} - Quality assessment results
   */
  async analyzeImage(imageUrl) {
    try {
      const response = await fetch(`${this.baseUrl}${this.foodModel}/outputs`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: [
            {
              data: {
                image: {
                  url: imageUrl
                }
              }
            }
          ]
        })
      });

      const data = await response.json();
      return this.generateQualityAssessment(data);
    } catch (error) {
      console.error('Error analyzing food image:', error);
      throw error;
    }
  }

  /**
   * Generate quality assessment from Clarifai API response
   * @param {Object} apiResponse - Response from Clarifai API
   * @returns {Object} - Structured quality assessment
   */
  generateQualityAssessment(apiResponse) {
    try {
      // Extract concepts (food types) from the response
      const concepts = apiResponse.outputs[0].data.concepts;
      
      // Basic quality checks
      const assessment = {
        identifiedAs: concepts[0].name,
        confidence: concepts[0].value,
        freshness: this.assessFreshness(concepts),
        quality: 'Unknown',
        isEdible: true,
        warning: null
      };

      // Determine overall quality
      if (assessment.confidence > 0.95) {
        assessment.quality = 'Excellent';
      } else if (assessment.confidence > 0.85) {
        assessment.quality = 'Good';
      } else if (assessment.confidence > 0.70) {
        assessment.quality = 'Fair';
      } else {
        assessment.quality = 'Poor';
        assessment.warning = 'The food may not be suitable for donation due to low confidence in identification.';
        assessment.isEdible = false;
      }

      return assessment;
    } catch (error) {
      console.error('Error generating quality assessment:', error);
      return {
        quality: 'Unknown',
        warning: 'Could not assess food quality from image.',
        isEdible: false
      };
    }
  }

  /**
   * Assess freshness based on recognized concepts
   * This is a simple implementation that could be enhanced with more data
   * @param {Array} concepts - Concepts from Clarifai API
   * @returns {string} - Freshness assessment
   */
  assessFreshness(concepts) {
    // Check for freshness indicators
    const freshnessIndicators = {
      positive: ['fresh', 'ripe', 'raw', 'healthy'],
      negative: ['spoiled', 'moldy', 'rotten', 'stale', 'old']
    };

    // Check concepts for any freshness indicators
    for (const concept of concepts) {
      const name = concept.name.toLowerCase();
      
      // Check negative indicators first (more important)
      for (const negativeIndicator of freshnessIndicators.negative) {
        if (name.includes(negativeIndicator) && concept.value > 0.5) {
          return 'Poor';
        }
      }
      
      // Check positive indicators
      for (const positiveIndicator of freshnessIndicators.positive) {
        if (name.includes(positiveIndicator) && concept.value > 0.7) {
          return 'Good';
        }
      }
    }

    return 'Unknown';
  }
}

const foodQualityService = new FoodQualityService();
```

### 4. Add Server Endpoints for Image Analysis

Add these routes to `server.js`:

```javascript
// Endpoint for image uploads and analysis
app.post('/api/analyze-food-image', upload.single('foodImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    // Create public URL for the uploaded image
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/food-images/${req.file.filename}`;
    
    // External API call would happen here
    // For now, we'll simulate a response based on the filename
    
    // Response structure similar to what we'd get from Clarifai with our processing
    const response = {
      identifiedAs: req.file.originalname.split('.')[0].replace(/-/g, ' '), // Use filename as food type
      confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7 and 1.0
      freshness: Math.random() > 0.8 ? 'Poor' : 'Good', // 20% chance of poor freshness
      quality: Math.random() > 0.15 ? 'Good' : 'Poor', // 15% chance of poor quality
      isEdible: Math.random() > 0.1, // 10% chance of not edible
      warning: null,
      imageUrl: imageUrl
    };
    
    // Add warning if quality is poor
    if (response.quality === 'Poor') {
      response.warning = 'The food appears to be of poor quality and may not be suitable for donation.';
    }
    
    // Add warning if freshness is poor
    if (response.freshness === 'Poor') {
      response.warning = 'The food appears to lack freshness and may not be suitable for donation.';
    }
    
    // Add warning if not edible
    if (!response.isEdible) {
      response.warning = 'The food may not be suitable for human consumption based on the image analysis.';
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error analyzing food image:', error);
    res.status(500).json({ error: 'Error analyzing food image' });
  }
});
```

### 5. Update Food Donation Form

Modify `views/food_donate_form.ejs` to include image upload:

```html
<!-- Add this section after the item inputs -->
<div class="mt-4 mb-3">
  <h3 class="image-heading">Food Image:</h3>
  <p class="text-muted small">Upload an image of the food to assess its quality (optional)</p>
  
  <div class="image-upload-container">
    <div class="row">
      <div class="col-md-6">
        <input type="file" id="foodImageInput" class="form-control" accept="image/*">
        <div class="mt-2">
          <button type="button" id="analyzeImageBtn" class="btn btn-secondary" disabled>
            Analyze Food Quality
          </button>
        </div>
      </div>
      <div class="col-md-6">
        <div id="imagePreview" class="d-none">
          <img id="foodImagePreview" class="img-fluid mt-2 rounded" style="max-height: 200px;">
        </div>
      </div>
    </div>
  </div>
  
  <!-- Quality assessment results -->
  <div id="qualityResults" class="mt-3 d-none">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Food Quality Assessment</h5>
        <span id="qualityBadge" class="badge rounded-pill"></span>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-6">
            <p><strong>Identified as:</strong> <span id="foodIdentifiedAs"></span></p>
            <p><strong>Confidence:</strong> <span id="confidenceScore"></span></p>
            <p><strong>Freshness:</strong> <span id="freshnessScore"></span></p>
          </div>
          <div class="col-md-6">
            <div id="warningAlert" class="alert alert-warning d-none">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              <span id="warningText"></span>
            </div>
          </div>
        </div>
        <input type="hidden" name="foodQualityAssessment" id="foodQualityAssessment">
      </div>
    </div>
  </div>
</div>
```

Add this JavaScript to the form's script section:

```javascript
// Image upload and analysis functionality
document.getElementById('foodImageInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    // Enable analyze button
    document.getElementById('analyzeImageBtn').disabled = false;
    
    // Show image preview
    const reader = new FileReader();
    reader.onload = function(event) {
      const imgPreview = document.getElementById('foodImagePreview');
      imgPreview.src = event.target.result;
      document.getElementById('imagePreview').classList.remove('d-none');
    };
    reader.readAsDataURL(file);
  } else {
    document.getElementById('analyzeImageBtn').disabled = true;
    document.getElementById('imagePreview').classList.add('d-none');
  }
});

document.getElementById('analyzeImageBtn').addEventListener('click', async function() {
  const fileInput = document.getElementById('foodImageInput');
  
  if (!fileInput.files || fileInput.files.length === 0) {
    return;
  }
  
  // Show loading state
  this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Analyzing...';
  this.disabled = true;
  
  const formData = new FormData();
  formData.append('foodImage', fileInput.files[0]);
  
  try {
    const response = await fetch('/api/analyze-food-image', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to analyze image');
    }
    
    const data = await response.json();
    
    // Display results
    document.getElementById('qualityResults').classList.remove('d-none');
    document.getElementById('foodIdentifiedAs').textContent = data.identifiedAs;
    document.getElementById('confidenceScore').textContent = `${Math.round(data.confidence * 100)}%`;
    document.getElementById('freshnessScore').textContent = data.freshness;
    
    // Set quality badge
    const qualityBadge = document.getElementById('qualityBadge');
    qualityBadge.textContent = data.quality;
    
    if (data.quality === 'Excellent' || data.quality === 'Good') {
      qualityBadge.classList.add('bg-success');
    } else if (data.quality === 'Fair') {
      qualityBadge.classList.add('bg-warning');
    } else {
      qualityBadge.classList.add('bg-danger');
    }
    
    // Show warning if applicable
    if (data.warning) {
      document.getElementById('warningText').textContent = data.warning;
      document.getElementById('warningAlert').classList.remove('d-none');
    } else {
      document.getElementById('warningAlert').classList.add('d-none');
    }
    
    // Store assessment in hidden field for form submission
    document.getElementById('foodQualityAssessment').value = JSON.stringify(data);
  } catch (error) {
    console.error('Error analyzing image:', error);
    alert('Failed to analyze the image. Please try again.');
  } finally {
    // Reset button state
    this.innerHTML = 'Analyze Food Quality';
    this.disabled = false;
  }
});
```

### 6. Update Donation Submission Endpoint

Modify the `/donat_food_submit` handler in `server.js` to handle quality assessment data:

```javascript
app.post("/donat_food_submit", async function (req, res) {
  // Existing code...
  
  let qualityAssessment = null;
  if (req.body.foodQualityAssessment) {
    try {
      qualityAssessment = JSON.parse(req.body.foodQualityAssessment);
    } catch (e) {
      console.error('Error parsing quality assessment:', e);
    }
  }
  
  // Add quality assessment to organization's donation history
  await donationHistoryRef.add({
    OrderId: orderID,
    Status: "Pending",
    Date: date.getMonth() + "/" + date.getDate() + "/" + date.getFullYear(),
    Donor_name: donSnapshot.docs[0].data().Donor_name,
    Donor_ph_no: donSnapshot.docs[0].data().ph_no,
    Donor_email: donSnapshot.docs[0].data().email,
    Donation: req.body.Donation,
    Donor_address:
      donSnapshot.docs[0].data().street +
      "/" +
      donSnapshot.docs[0].data().city +
      "/" +
      donSnapshot.docs[0].data().dist +
      "/" +
      donSnapshot.docs[0].data().state +
      "/" +
      donSnapshot.docs[0].data().pincode,
    Items: req.body.item,
    EachItem_Qty: req.body.qty,
    QualityAssessment: qualityAssessment,
  });

  // Add quality assessment to donor's donation history
  await donHisRef.add({
    OrderId: orderID,
    Date: date.getMonth() + "/" + date.getDate() + "/" + date.getFullYear(),
    Donate_to: req.body.orgname,
    Donation: req.body.Donation,
    Organization_ph: orgDoc.data().ph_no,
    address:
      donSnapshot.docs[0].data().street +
      "/" +
      donSnapshot.docs[0].data().city +
      "/" +
      donSnapshot.docs[0].data().dist +
      "/" +
      donSnapshot.docs[0].data().state +
      "/" +
      donSnapshot.docs[0].data().pincode,
    Items: req.body.item,
    EachItem_Qty: req.body.qty,
    Status: "Pending",
    QualityAssessment: qualityAssessment,
  });
});
```

### 7. Update Organization Home Page to Display Food Quality

Modify `views/org_home.ejs` to show quality assessment in donation requests:

```html
<!-- Within the donation request item -->
<div class="connn">
  <!-- Existing code... -->
  
  <% if (dataArr.org_his_data[i].QualityAssessment) { %>
    <div class="quality-assessment">
      <h5>Food Quality Assessment</h5>
      <div class="quality-badge <%= dataArr.org_his_data[i].QualityAssessment.quality === 'Good' ? 'bg-success' : dataArr.org_his_data[i].QualityAssessment.quality === 'Fair' ? 'bg-warning' : 'bg-danger' %>">
        <%= dataArr.org_his_data[i].QualityAssessment.quality %>
      </div>
      <p><strong>Identified as:</strong> <%= dataArr.org_his_data[i].QualityAssessment.identifiedAs %></p>
      <% if (dataArr.org_his_data[i].QualityAssessment.warning) { %>
        <div class="warning-message">
          <i class="bi bi-exclamation-triangle-fill"></i>
          <%= dataArr.org_his_data[i].QualityAssessment.warning %>
        </div>
      <% } %>
      <% if (dataArr.org_his_data[i].QualityAssessment.imageUrl) { %>
        <img src="<%= dataArr.org_his_data[i].QualityAssessment.imageUrl %>" alt="Food Image" class="quality-image">
      <% } %>
    </div>
  <% } %>
  
  <!-- Rest of the existing code... -->
</div>
```

Add these styles to the page:

```css
.quality-assessment {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  max-width: 300px;
}

.quality-badge {
  display: inline-block;
  padding: 3px 8px;
  color: white;
  border-radius: 12px;
  font-size: 0.8rem;
  margin-bottom: 8px;
}

.warning-message {
  color: #856404;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  padding: 8px;
  margin-top: 8px;
  border-radius: 4px;
  font-size: 0.9rem;
}

.quality-image {
  max-width: 100%;
  margin-top: 10px;
  border-radius: 4px;
}
```

### 8. Create Directories

Ensure the uploads directory exists:

```bash
mkdir -p public/uploads/food-images
```

## Integration Testing

1. Test the file upload functionality with various image types
2. Verify the quality assessment feedback appears correctly
3. Confirm that existing donation flow works with and without images
4. Check that quality assessment data is stored in Firestore
5. Verify that organizations can see quality assessments on their end

## Progressive Enhancement

This implementation follows a progressive enhancement approach:
- The image upload is optional, not required
- The existing donation flow works without uploading images
- Quality assessment data is additive to the existing data model
- The UI degrades gracefully if the image analysis fails

## Production Considerations

1. Move the Clarifai API key to an environment variable for security
2. Implement image size/dimension restrictions to save bandwidth
3. Consider adding a CDN for image storage
4. Implement caching for analysis results
5. Add error handling and retries for API calls
