from flask import Flask, request, jsonify, send_file
import os
import pandas as pd
import numpy as np
from scipy.interpolate import CubicSpline
from io import BytesIO
import zipfile
from flask_cors import CORS

app = Flask(__name__)
CORS(app, supports_credentials=True)


def cubic_spline_interpolation(file):
    df = pd.read_csv(file, header=None)
    m = list(df[0])
    m = np.array(m)
    m1 = 1e7 / m

    target_min, target_max = 900, 1700

    spline = CubicSpline(np.arange(len(m1)), m1)
    interpolated_m1 = spline(np.arange(len(m1)))
    normalized_interpolated_m1 = (interpolated_m1 - np.min(interpolated_m1)) / (np.max(interpolated_m1) - np.min(interpolated_m1))
    rescaled_interpolated_m1 = normalized_interpolated_m1 * (target_max - target_min) + target_min

    line1 = ["工作组", "样品编号", "光谱序号", "波长"]
    line2 = ["玉米", "34_03-001", "2190", "吸光度"]
    line1 = line1 + list(rescaled_interpolated_m1)
    line2 = line2 + list(df[1])
    df_new = pd.DataFrame([line1, line2])
    return df_new


@app.route("/upload", methods=["POST"])
def upload_files():
    if "files" not in request.files:
        return jsonify({"error": "No file part"}), 400

    files = request.files.getlist("files")  # Allows multiple file uploads

    if not files:
        return jsonify({"error": "No selected files"}), 400

    dfs = []

    for file in files:
        df = cubic_spline_interpolation(file)
        dfs.append(df)

    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, df in enumerate(dfs):
            csv_buffer = BytesIO()
            df.to_csv(csv_buffer, index=False)
            csv_buffer.seek(0)
            zip_file.writestr(f"file_{idx+1}.csv", csv_buffer.read())

    zip_buffer.seek(0)

    return send_file(zip_buffer, as_attachment=True, download_name="interpolated_files.zip", mimetype="application/zip")


if __name__ == "__main__":
    app.run(host="0.0.0.0")
