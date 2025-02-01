from flask import Flask, request, jsonify
import os
import pandas as pd
import numpy as np
from scipy.interpolate import CubicSpline
from glob import glob
from io import StringIO
from flask_cors import CORS

app = Flask(__name__)
CORS(app, supports_credentials=True)

# Helper function for cubic spline interpolation
def cubic_spline_interpolation(file_path):
    # Read the file (CSV or TXT)
    if file_path.endswith('.csv'):
        df = pd.read_csv(file_path, header=None)
    else:
        # For TXT file, adjust accordingly depending on the format
        df = pd.read_csv(file_path, delimiter=",", header=None)

    m = list(df[0])
    m = np.array(m)
    m1 = 1e7 / m

    target_min, target_max = 900, 1700

    # Apply cubic spline interpolation
    spline = CubicSpline(np.arange(len(m1)), m1)
    interpolated_m1 = spline(np.arange(len(m1)))
    normalized_interpolated_m1 = (interpolated_m1 - np.min(interpolated_m1)) / (np.max(interpolated_m1) - np.min(interpolated_m1))
    rescaled_interpolated_m1 = normalized_interpolated_m1 * (target_max - target_min) + target_min
    
    line1 = ['工作组','样品编号', '光谱序号', '波长']
    line2 = ['玉米','34_03-001', '2190', '吸光度']
    line1 = line1 + list(rescaled_interpolated_m1)
    line2 = line2 + list(df[1])
    df_new = pd.DataFrame([line1,line2])    
    csv = df_new.to_csv()
    return csv

@app.route('/upload', methods=['POST'])
def upload_files():
    if 'files' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    files = request.files.getlist('files')  # Allows multiple file uploads
    
    if not files:
        return jsonify({"error": "No selected files"}), 400

    dfs = []  # List to hold DataFrames for all files
    for file in files:
        # Save the file to a temporary location
        temp_path = os.path.join('uploads', file.filename)
        file.save(temp_path)
        
        # Perform cubic spline interpolation and rescaling
        df = cubic_spline_interpolation(temp_path)
        
        # Append DataFrame to list
        dfs.append(df)

        # Optionally, clean up the temporary file
        os.remove(temp_path)

    # Combine all DataFrames into one, if needed
    combined_df = pd.concat(dfs, ignore_index=True)
    
    # Convert the DataFrame to a JSON-friendly format
    result = combined_df.to_dict(orient='records')
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=2333)
    # path = r'C:\Users\new\Downloads\布鲁克等2个文件\布鲁克\YM02玉米_1-36_1_1_1_1__20240924_135540.txt'
    # csv = cubic_spline_interpolation(path)
    
