from flask import Flask, request, jsonify, make_response
from py3dbp import Packer, Bin, Item
import sys
app = Flask(__name__)

ALLOWED_ORIGINS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://boxlogic-backend.coolify.trikonatech.com"
}

def choose_origin():
    origin = request.headers.get("Origin")
    if origin and origin in ALLOWED_ORIGINS:
        return origin
    return "http://localhost:5173"  # debug/dev fallback (change for production)

@app.after_request
def add_cors(response):
    origin_to_set = choose_origin()
    response.headers["Access-Control-Allow-Origin"] = origin_to_set
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Credentials"] = "false"
    return response

@app.route('/plan', methods=['OPTIONS'])
def plan_options():
    resp = make_response("", 204)
    return add_cors(resp)

@app.route('/')
def home():
    resp = make_response("Hello from boxlogic", 200)
    return add_cors(resp)

@app.route('/plan', methods=['POST'])
def plan():
    # Add CORS headers to response at the end
    if not request.is_json:
        resp = make_response(jsonify({"error": "Request must be JSON"}), 400)
        return add_cors(resp)

    data = request.get_json()
    try:
        container_length = float(data.get('container_length', 0))
        container_width = float(data.get('container_width', 0))
        container_height = float(data.get('container_height', 0))
    except Exception as e:
        resp = make_response(jsonify({"error": f"Invalid container dims: {e}"}), 400)
        return add_cors(resp)

    bigger_first = bool(data.get('bigger_first', False))
    distribute_items = bool(data.get('distribute_items', False))
    rotation = bool(data.get('rotation', False))
    packing_strategy = data.get('packing_strategy')
    verbose = bool(data.get('verbose', False))

    box_names = data.get('box_name', [])
    box_lengths = data.get('box_length', [])
    box_widths = data.get('box_width', [])
    box_heights = data.get('box_height', [])
    box_weights = data.get('box_weight', [])
    box_quantities = data.get('box_quantity', [])

    # basic validation
    if not box_names or len(box_names) == 0:
        resp = make_response(jsonify({"error": "No boxes provided"}), 400)
        return add_cors(resp)

    input_summary = []
    for i in range(len(box_names)):
        # protect from index errors
        try:
            l = float(box_lengths[i])
            w = float(box_widths[i])
            h = float(box_heights[i])
            q = int(box_quantities[i])
        except Exception:
            resp = make_response(jsonify({"error": f"Invalid dimensions/quantity for box index {i}"}), 400)
            return add_cors(resp)

        if l > container_length or w > container_width or h > container_height:
            error_message = f"Error: Box '{box_names[i]}' is larger than the container."
            resp = make_response(jsonify({"error": error_message}), 400)
            return add_cors(resp)

        input_summary.append({
            'name': box_names[i],
            'length': box_lengths[i],
            'width': box_widths[i],
            'height': box_heights[i],
            'quantity': box_quantities[i]
        })

    # build items list
    items_to_pack = []
    for i in range(len(box_names)):
        qty = int(box_quantities[i])
        for _ in range(qty):
            items_to_pack.append(Item(
                name=box_names[i],
                width=float(box_widths[i]),
                height=float(box_heights[i]),
                depth=float(box_lengths[i]),
                weight=float(box_weights[i]) if box_weights and len(box_weights) > i else 0.0
            ))

    if packing_strategy == "best_fit":
        items_to_pack.sort(key=lambda item: item.width * item.height * item.depth, reverse=True)

    packed_bins = []
    unpacked_items = items_to_pack

    while unpacked_items:
        packer = Packer()
        bin = Bin(
            name=f"Container-{len(packed_bins) + 1}",
            width=container_width,
            height=container_height,
            depth=container_length,
            max_weight=100000
        )
        packer.add_bin(bin)
        for item in unpacked_items:
            packer.add_item(item)

        packer.pack(bigger_first=bigger_first, distribute_items=distribute_items, number_of_decimals=2)

        packed_bins.append(bin)
        unpacked_items = getattr(bin, "unfitted_items", [])

        if verbose:
            print(f"[DEBUG] {bin.name}: Packed {len(bin.items)} items, {len(unpacked_items)} left.")
            
        if len(packed_bins) > 50:
            break

    results = []
    for i, bin in enumerate(packed_bins):
        total_volume = bin.width * bin.height * bin.depth
        packed_volume = sum(item.width * item.height * item.depth for item in bin.items)
        utilization = (packed_volume / total_volume) * 100 if total_volume > 0 else 0

        packed_items_data = []
        for item in bin.items:
            item_dims = item.get_dimension()
            packed_items_data.append({
                'name': item.name,
                'position': getattr(item, "position", None),
                'dimensions': {
                    'length': float(item_dims[0]),
                    'width': float(item_dims[1]),
                    'height': float(item_dims[2])
                }
            })

        results.append({
            'container_name': f"Container {i + 1}",
            'utilization': f"{utilization:.2f}%",
            'container_dimensions': {
                'length': bin.depth,
                'width': bin.width,
                'height': bin.height
            },
            'packed_items_data': packed_items_data,
        })

    resp = make_response(jsonify({
        "results": results,
        "num_containers": len(packed_bins),
        "input_summary": input_summary,
        "error_message": None
    }), 200)
    return add_cors(resp)


if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=8080)
