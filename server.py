from flask import Flask, request, jsonify
from flask_cors import CORS   # 🔹 Thêm dòng này

app = Flask(__name__)
CORS(app)  # 🔹 Cho phép tất cả nguồn truy cập Flask API

current_flood = False

@app.route('/data', methods=['POST'])
def receive_data():
    global current_flood
    if request.is_json:
        data = request.get_json()
        muc_nuoc = float(data.get('muc_nuoc', 0))
        print("-------------------------")
        print("Da nhan du lieu tu ESP32:")
        print(f"  Nhiet Do: {data.get('nhiet_do')} C")
        print(f"  Do Am: {data.get('do_am')} %")
        print(f"  Muc Nuoc: {muc_nuoc} cm")
        print("-------------------------")

        current_flood = muc_nuoc > 1.5
        return jsonify({"status": "success", "flood": current_flood}), 200
    else:
        return jsonify({"status": "error", "message": "Request must be JSON"}), 400

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({"flood": current_flood})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
