from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import cv2
from PIL import Image
import io

app = Flask(__name__)
# Enable CORS for all domains with all methods
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"]}})

# Load the pre-trained MobileNetV2 model
model = tf.keras.applications.MobileNetV2(
    weights='imagenet',
    input_shape=(224, 224, 3)
)

def preprocess_image(image_data):
    # Convert bytes to image
    img = Image.open(io.BytesIO(image_data))
    
    # Convert to RGB mode to ensure 3 channels
    img = img.convert('RGB')
    
    # Resize image to 224x224
    img = img.resize((224, 224))
    
    # Convert to numpy array
    img_array = tf.keras.preprocessing.image.img_to_array(img)
    
    # Expand dimensions
    img_array = np.expand_dims(img_array, axis=0)
    
    # Preprocess input
    img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)
    
    return img_array

def analyze_freshness(img_array):
    # Convert to 0-255 range and remove batch dimension
    img = (img_array[0] + 1) * 127.5
    img = img.astype(np.uint8)
    
    # Calculate HSV color space values
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    
    # Extract HSV channels
    hue = hsv[:,:,0]
    saturation = hsv[:,:,1]
    value = hsv[:,:,2]
    
    # Calculate advanced metrics
    avg_saturation = np.mean(saturation)
    avg_value = np.mean(value)
    color_variance = np.std(hue)
    
    # Convert to grayscale for texture analysis
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    
    # Calculate texture features using gradient magnitude
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    gradient_magnitude = np.sqrt(sobelx**2 + sobely**2)
    texture_score = np.mean(gradient_magnitude)
    
    # Check for brown/dark spots (potential spoilage indicators)
    brown_mask = cv2.inRange(hsv, np.array([10, 50, 20]), np.array([30, 255, 200]))
    brown_percentage = np.sum(brown_mask > 0) / brown_mask.size
    
    # Enhanced freshness logic with adjusted thresholds
    if (avg_value > 120 and  # Lowered brightness threshold
        avg_saturation > 40 and  # Lowered saturation requirement
        color_variance < 50 and  # Increased allowed color variance
        texture_score < 35 and   # Adjusted texture threshold
        brown_percentage < 0.2):  # Increased tolerance for brown spots
        return "Good", 0.9
    elif (avg_value > 80 and    # Lowered minimum brightness
          avg_saturation > 25 and  # Lowered minimum saturation
          brown_percentage < 0.35 and  # Increased brown tolerance
          texture_score < 50):    # Increased texture tolerance
        return "Fair", 0.6
    else:
        return "Poor", 0.3

@app.route('/')
def home():
    return jsonify({
        "message": "ML Server is running",
        "endpoints": {
            "/analyze": "POST - Analyze food image"
        }
    })

@app.route('/analyze', methods=['POST', 'OPTIONS'])
def analyze_food():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        image_data = None
        print("Received request")  # Debug log
        
        # Handle FormData upload
        if 'image' in request.files:
            print("Handling FormData upload")  # Debug log
            image_file = request.files['image']
            if not image_file.filename:
                return jsonify({'error': 'No selected file'}), 400
            image_data = image_file.read()
        else:
            print("No image found in request")  # Debug log
            return jsonify({'error': 'No image provided'}), 400
            
        try:
            # Preprocess image
            print("Starting image preprocessing")  # Debug log
            img_array = preprocess_image(image_data)
            print("Image preprocessing successful")  # Debug log
            
            # Get model predictions
            print("Running model prediction")  # Debug log
            predictions = model.predict(img_array)
            decoded_predictions = tf.keras.applications.mobilenet_v2.decode_predictions(predictions)
            print("Model prediction successful")  # Debug log
            
            # Get top prediction
            top_prediction = decoded_predictions[0][0]
            
            # Analyze freshness
            freshness, confidence = analyze_freshness(img_array)
            
            # Determine if food is edible based on freshness
            is_edible = freshness != "Poor"
            
            # Create warning message if needed
            warning = None
            if freshness == "Poor":
                warning = "The food appears to be spoiled and is not suitable for donation."
            elif freshness == "Fair":
                warning = "The food shows signs of aging. Please verify freshness before donation."
            
            return jsonify({
                'foodType': top_prediction[1].replace('_', ' ').title(),
                'confidence': float(top_prediction[2]),
                'freshness': freshness,
                'quality': freshness,
                'isEdible': is_edible,
                'warning': warning
            })
            
        except Exception as e:
            print(f"Error during image processing: {str(e)}")  # Debug log
            raise e
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")  # Add logging
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)