import os
import json
from flask import Flask, request, redirect, url_for, send_from_directory, render_template, flash, jsonify
from werkzeug.utils import secure_filename
import tensorflow as tf
from tensorflow.keras.preprocessing.image import load_img, img_to_array
import numpy as np
from tensorflow.keras.optimizers import Adam
import logging
from PIL import Image
from io import BytesIO
import base64

# Set up logging
logging.basicConfig(level=logging.DEBUG)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Initialize Flask application
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}
app.secret_key = 'supersecretkey'

model = tf.keras.models.load_model('models/modelhama.h5', compile=False)
model.compile(optimizer=Adam(learning_rate=0.001), loss='categorical_crossentropy', metrics=['accuracy'])

# Load class labels and mitigation strategies from file
with open('models/class_labels_and_mitigation.json', 'r') as file:
    class_labels_and_mitigation = json.load(file)
    class_names = list(class_labels_and_mitigation.keys())
    mitigation_strategies = {key: value['mitigation'] for key, value in class_labels_and_mitigation.items()}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def predict_image(filepath):
    try:
        target_size = (64, 64)  # Adjust target size as per your model's requirement
        img = load_img(filepath, target_size=target_size)
        img = img_to_array(img)
        img = np.expand_dims(img, axis=0)
        img = img / 255.0  # Normalize image if required by your model
        logging.debug(f'Image shape: {img.shape}')
        prediction = model.predict(img)
        logging.debug(f'Prediction raw output: {prediction}')
        predicted_class_index = np.argmax(prediction, axis=1)[0]
        predicted_class = class_names[predicted_class_index]
        logging.debug(f'Predicted class: {predicted_class}')
        return predicted_class
    except Exception as e:
        logging.error(f'Error during prediction: {e}')
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/identifikasi', methods=['GET', 'POST'])
def identifikasi():
    if request.method == 'POST':
        if 'file' in request.files and allowed_file(request.files['file'].filename):
            file = request.files['file']
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            predicted_class = predict_image(file_path)
            if predicted_class is not None:
                response = {
                    'result': predicted_class,
                    'image_url': url_for('uploaded_file', filename=filename)
                }
                return jsonify(response)
            else:
                return jsonify({'error': 'Prediction error occurred'}), 500
        elif 'imageData' in request.form and request.form['imageData']:
            image_data = request.form['imageData']
            image_data = image_data.split(",")[1]
            image = Image.open(BytesIO(base64.b64decode(image_data)))
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], 'captured_image.png')
            image.save(image_path)
            predicted_class = predict_image(image_path)
            if predicted_class is not None:
                response = {
                    'result': predicted_class,
                    'image_url': url_for('uploaded_file', filename='captured_image.png')
                }
                return jsonify(response)
            else:
                return jsonify({'error': 'Prediction error occurred'}), 500
        else:
            return jsonify({'error': 'No file or image data provided'}), 400
    return render_template('identifikasi.html')


@app.route('/result')
def result():
    result = request.args.get('result')
    image_url = request.args.get('image_url')
    logging.debug(f'Result page parameters: result={result}, image_url={image_url}')
    mitigation = mitigation_strategies.get(result, ["No mitigation strategy available."])
    logging.debug(f'Mitigation strategies: {mitigation}')
    return render_template('result.html', result=result, image_url=image_url, mitigation=mitigation)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    from werkzeug.middleware.proxy_fix import ProxyFix
    app.wsgi_app = ProxyFix(app.wsgi_app)
    app.run(debug=False)
