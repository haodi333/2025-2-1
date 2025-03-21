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

# def cubic_spline_interpolation(file, target_min, target_max):
#     df = pd.read_csv(file, header=None)
#     m = list(df[0])
#     m = np.array(m)
#     # m1 = 1e7 / m

#     spline = CubicSpline(np.arange(len(m)), m)
#     interpolated_m1 = spline(np.arange(len(m)))
#     normalized_interpolated_m1 = (interpolated_m1 - np.min(interpolated_m1)) / (np.max(interpolated_m1) - np.min(interpolated_m1))
#     rescaled_interpolated_m1 = normalized_interpolated_m1 * (target_max - target_min) + target_min

#     # line1 = ["工作组", "样品编号", "光谱序号", "波长"]
#     # line1 = line1 + list(rescaled_interpolated_m1)
#     # line2 = line2 + list(df[1])
#     # df_new = pd.DataFrame([line1, line2])
#     # return df_new

def cubic_spline_interpolation(file, target_min, target_max):
    # 读取数据
    df = pd.read_csv(file, header=None)
    m = df[0].values  # 获取第一列数据
    df = df.sort_values(by=0).reset_index(drop=True)
    # 对第一列数据进行三次样条插值
    spline = CubicSpline(np.arange(len(m)), m)
    interpolated_m1 = spline(np.arange(len(m)))

    # 归一化并缩放到目标范围
    normalized_interpolated_m1 = (interpolated_m1 - np.min(interpolated_m1)) / (np.max(interpolated_m1) - np.min(interpolated_m1))
    rescaled_interpolated_m1 = normalized_interpolated_m1 * (target_max - target_min) + target_min

    # 将第二列数据与插值后的第一列数据组合成新的 DataFrame
    df_new = pd.DataFrame({
        '波数': list(rescaled_interpolated_m1),  # 将 NumPy 数组转换为列表
        '吸光度': list(df[1].values)  # 将第二列数据转换为列表
    })

    df_new = df_new.sort_values(by='波数').reset_index(drop=True)

    return df_new

def cubic_spline_interpolation1(file):
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
    try:
        target_min = float(request.form.get("target_min"))  # 从表单中获取 target_min
        target_max = float(request.form.get("target_max"))  # 从表单中获取 target_max
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid target_min or target_max value"}), 400
    if not files:
        return jsonify({"error": "No selected files"}), 400

    dfs = []

    # Process each file
    for file in files:
        df = cubic_spline_interpolation(file, target_min, target_max)  # Assuming this function processes the file and returns a DataFrame
        dfs.append((file, df))  # Store both the file object and the resulting DataFrame

    # Create a ZIP file in memory
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file, df in dfs:
            # Use the original filename (without extension) for the CSV name
            filename_without_extension = os.path.splitext(file.filename)[0]
            csv_buffer = BytesIO()
            df.to_csv(csv_buffer, index=False)
            csv_buffer.seek(0)
            zip_file.writestr(f"{filename_without_extension}.csv", csv_buffer.read())

    zip_buffer.seek(0)

    # Send the zip file as a response
    return send_file(zip_buffer, as_attachment=True, download_name="interpolated_files.zip", mimetype="application/zip")

if __name__ == "__main__":
    app.run(host="0.0.0.0")
    # path = r'C:\Users\new\Documents\WeChat Files\wxid_pb2qbwkdckgj22\FileStorage\File\2025-03\12488.csv'
    # df = cubic_spline_interpolation(path, 12488,3600)
