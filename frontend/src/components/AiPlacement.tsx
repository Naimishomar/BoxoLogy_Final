// import { useState } from "react";
// import { GoogleGenAI } from "@google/genai";

// // Initialize GenAI
// const ai = new GoogleGenAI({
//   apiKey: import.meta.env.VITE_GEMINI_API_KEY,
// });

// // 🔹 Types
// type Box = {
//   id: number;
//   length: string;
//   width: string;
//   height: string;
//   weight: string;
//   quantity: string;
//   stackLimit: string;
//   stackable: boolean;
// };

// type Container = {
//   length: string;
//   width: string;
//   height: string;
//   maxWeight: string;
// };

// type Placement = {
//   boxId: number;
//   container: number;
//   x: number;
//   y: number;
//   z: number;
// };

// export default function AiPlacement() {
//   const [boxes, setBoxes] = useState<Box[]>([]);
//   const [container, setContainer] = useState<Container>({
//     length: "",
//     width: "",
//     height: "",
//     maxWeight: "",
//   });
//   const [placements, setPlacements] = useState<Placement[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [containerCount, setContainerCount] = useState(0);

//   // Add new box
//   const addBox = () => {
//     setBoxes((prev) => [
//       ...prev,
//       {
//         id: prev.length + 1,
//         length: "",
//         width: "",
//         height: "",
//         weight: "",
//         quantity: "",
//         stackLimit: "",
//         stackable: true,
//       },
//     ]);
//   };

//   // Update box field
//   const updateBox = <K extends keyof Box>(id: number, field: K, value: Box[K]) => {
//     setBoxes(
//       boxes.map((b) => (b.id === id ? { ...b, [field]: value } : b))
//     );
//   };

//   // Optimize packing using new GenAI SDK
// const handleOptimize = async () => {
//   setLoading(true);
//   setError("");
//   setPlacements([]);

//   try {
//     if(container.length === "" || container.width === "" || container.height === "" || container.maxWeight === ""){
//       setError("Please fill all the fields");
//       return;
//     }
//     const cLength = Number(container.length);
//     const cWidth = Number(container.width);
//     const cHeight = Number(container.height);
//     const cMaxWeight = Number(container.maxWeight);

//     const boxesData = boxes.map((b) => ({
//       ...b,
//       length: Number(b.length),
//       width: Number(b.width),
//       height: Number(b.height),
//       weight: Number(b.weight),
//       quantity: Number(b.quantity),
//       stackLimit: Number(b.stackLimit),
//     }));

//     const prompt = `
//       You are solving a 3D bin-packing problem.
//       Container: ${cLength} x ${cWidth} x ${cHeight}, 
//       Max Weight: ${cMaxWeight}.
      
//       Boxes:
//       ${boxesData
//         .map(
//           (b) =>
//             `Box ${b.id}: ${b.length}x${b.width}x${b.height}, weight=${b.weight}, quantity=${b.quantity}, stackLimit=${b.stackLimit}, stackable=${b.stackable}`
//         )
//         .join("\n")}

//       Return ONLY valid JSON array in format:
//       [
//         { "boxId": number, "container": number, "x": number, "y": number, "z": number }
//       ]

//       Note:
//       You are an expert in 3D container loading and box packing optimization. Your task is to arrange boxes inside one or more containers while following strict rules:
//       1.Container Filling Strategy (Axis Priority):
//         Always fill along the width (Y-axis) and height (Z-axis) first.
//         Only after Y and Z are filled should packing progress along the length (X-axis).
//       2.Stacking Constraints:
//         Stackable boxes can support other boxes on top of them.
//         Unstackable boxes must always be placed on top of stackable boxes or directly on the container floor.
//         No box can ever be placed on top of an unstackable box.
//       3.Optimization Goal:
//         Maximize container volume utilization.
//         Ensure that all boxes are packed, even if multiple containers are required.
//         If one container becomes full, start a new container and continue until all boxes are placed.
//       4.Example Requirement:
//         If there are 200 stackable boxes and 100 unstackable boxes, the system must pack all 300 boxes, distributing them across containers as needed.
//       5. Include **every box** in the output (respecting quantity).
//     `;

//     const response = await ai.models.generateContent({
//       model: "gemini-2.5-flash",
//       contents: prompt,
//     });

//     // ✅ Clean AI output: remove markdown, backticks, and extra text
//     let text = response?.text?.trim();
//     if (!text) {
//     throw new Error("AI response is empty");
//     }
//     text = text.replace(/^```json\s*/i, "");
//     text = text.replace(/```$/, "");
    
//     const parsed: Placement[] = JSON.parse(text);
//     setPlacements(parsed);

//     const maxContainer = Math.max(...parsed.map((p) => p.container));
//     setContainerCount(maxContainer);
//   } catch (err) {
//     console.error(err);
//     setError("Failed to optimize packing. Try again.");
//   } finally {
//     setLoading(false);
//   }
// };

//   return (
//     <div className="w-full min-h-screen bg-black text-white flex flex-col items-center py-10 gap-10">
//       <h1 className="text-3xl font-bold">📦 Box Packing Optimizer</h1>

//       {/* Container Input */}
//       <div className="bg-white/10 p-5 rounded-lg min-w-md flex flex-col gap-2 w-96">
//         <h2 className="text-xl font-semibold">Container</h2>
//         {(Object.keys(container) as (keyof Container)[]).map((field) => (
//           <input
//             key={field}
//             type="text"
//             placeholder={`Enter ${field}`}
//             value={container[field]}
//             onChange={(e) =>
//               setContainer({ ...container, [field]: e.target.value })
//             }
//             className="bg-gray-600 px-3 py-2 rounded-lg mt-1"
//           />
//         ))}
//       </div>

//       {/* Boxes Input */}
//       <div className="flex flex-col gap-5 w-full items-center">
//         <h2 className="text-xl font-semibold">Boxes</h2>
//         {boxes.map((box) => (
//           <div
//             key={box.id}
//             className="bg-white/10 p-5 rounded-lg w-96 flex flex-col gap-2"
//           >
//             <h3 className="font-semibold">Box {box.id}</h3>
//             {(
//               ["length", "width", "height", "weight", "quantity", "stackLimit"] as (keyof Box)[]
//             ).map((field) => (
//               <input
//                 key={field}
//                 type="text"
//                 placeholder={field}
//                 value={box[field] as number}
//                 onChange={(e) =>
//                   updateBox(box.id, field, e.target.value as any)
//                 }
//                 className="bg-gray-600 px-3 py-2 rounded-lg"
//               />
//             ))}
//             <select
//               value={box.stackable ? "stackable" : "unstackable"}
//               onChange={(e) =>
//                 updateBox(box.id, "stackable", e.target.value === "stackable")
//               }
//               className="py-2 outline-none text-white bg-gray-600 rounded-lg"
//             >
//               <option value="stackable">Stackable</option>
//               <option value="unstackable">Unstackable</option>
//             </select>
//           </div>
//         ))}
//         <button
//           onClick={addBox}
//           className="bg-green-500 px-4 py-2 rounded mt-2 hover:bg-green-600 cursor-pointer"
//         >
//           ➕ Add Box
//         </button>
//       </div>

//       {/* Optimize Button */}
//       <button
//         onClick={handleOptimize}
//         disabled={loading}
//         className="bg-blue-500 px-6 py-3 rounded-lg font-bold mt-5 hover:bg-blue-600 cursor-pointer"
//       >
//         {loading ? "Optimizing..." : "🚀 Optimize Packing"}
//       </button>

//       {containerCount > 0 && (
//         <p className="mt-3 text-green-400 font-semibold text-center">
//           Total containers required: {containerCount}
//         </p>
//       )}

//       {/* Error */}
//       {error && <p className="text-red-400">{error}</p>}

//       {/* Placements Table */}
//       {placements.length > 0 && (
//         <div className="w-3/4 mt-5">
//           <h2 className="text-xl font-semibold mb-3">Optimized Placements</h2>
//           <table className="w-full border border-gray-500 text-center">
//             <thead className="bg-gray-700">
//               <tr>
//                 <th className="border px-2 py-1">BoxId</th>
//                 <th className="border py-1">Container</th>
//                 <th className="border px-2 py-1">X</th>
//                 <th className="border px-2 py-1">Y</th>
//                 <th className="border px-2 py-1">Z</th>
//                 <th className="border px-2 py-1">Type</th>
//               </tr>
//             </thead>
//             <tbody>
//             {placements.map((p, idx) => {
//                 const box = boxes.find(b => b.id === p.boxId);
//                 return (
//                 <tr key={idx} className="hover:bg-gray-800">
//                     <td className="border px-2 py-1">{idx +1}</td>
//                     <td className="border py-1">{p.container}</td>
//                     <td className="border px-2 py-1">{p.x}</td>
//                     <td className="border px-2 py-1">{p.y}</td>
//                     <td className="border px-2 py-1">{p.z}</td>
//                     <td className="border px-2 py-1">{box?.stackable ? "stackable" : "unstackable"}</td>
//                 </tr>
//                 );
//             })}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// }


import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface BoxDimensions {
    length: string;
    width: string;
    height: string;
    weight: string;
    quantity: string;
    rotation: boolean;
    collapsed: boolean;
    unit: string;
}

interface ContainerDimensions {
    length: string;
    width: string;
    height: string;
    maxCapacity: string;
    fit: string;
    unit: string;
}

const defaultBoxes = [
    { box: "20 ft Standard", length: 5.9, width: 2.35, height: 2.39 },
    { box: "40 ft Standard", length: 12.9, width: 12.35, height: 12.39 },
    { box: "40 ft High Cube", length: 15.9, width: 22.35, height: 12.39 },
    { box: "20 ft Reefer", length: 23.9, width: 26.35, height: 20.39 },
    { box: "40 ft Reefer", length: 14.9, width: 12.35, height: 22.39 },
    { box: "32 ft Container", length: 26.9, width: 29.35, height: 12.39 },
];

function BoxUI() {
    const [boxDimensions, setBoxDimensions] = useState<BoxDimensions[]>([
        {
            length: "2",
            width: "1",
            height: "1",
            weight: "10",
            quantity: "5",
            rotation: false,
            collapsed: false,
            unit: "m",
        },
        {
            length: "1",
            width: "1",
            height: "1",
            weight: "5",
            quantity: "5",
            rotation: false,
            collapsed: false,
            unit: "m",
        },
    ]);

    const [containerDimensions, setContainerDimensions] =
        useState<ContainerDimensions>({
            length: "6",
            width: "2.5",
            height: "2.5",
            maxCapacity: "",
            fit: "",
            unit: "m",
        });

    const [containerVolume, setContainerVolume] = useState<number>(0);
    const [boxVolumes, setBoxVolumes] = useState<number[]>([]);
    const [leftSideBar, setLeftSideBar] = useState(true);
    const [rightSideBar, setRightSetBar] = useState(true);
    const [totalBoxVolume, setTotalBoxVolume] = useState<number>(0);
    const [totalBoxWeight, setTotalBoxWeight] = useState<number>(0);
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef(new THREE.Scene());
    const cameraRef = useRef<THREE.PerspectiveCamera>();
    const rendererRef = useRef<THREE.WebGLRenderer>();
    const controlsRef = useRef<OrbitControls>();

    const addBox = () => {
        setBoxDimensions([
            ...boxDimensions,
            {
                length: "",
                width: "",
                height: "",
                weight: "",
                quantity: "",
                rotation: false,
                collapsed: false,
                unit: "m",
            },
        ]);
    };

    const toggleCollapse = (index: number) => {
        setBoxDimensions((prev) =>
            prev.map((box, i) =>
                i === index ? { ...box, collapsed: !box.collapsed } : box
            )
        );
    };

    const convertToMeters = (value: number, unit: string): number => {
        switch (unit) {
            case "cm":
                return value / 100;
            case "mm":
                return value / 1000;
            case "in":
                return value * 0.0254;
            case "m":
            default:
                return value;
        }
    };

    const updateBoxField = (
        index: number,
        field: keyof BoxDimensions,
        value: string | boolean
    ) => {
        setBoxDimensions((prev) =>
            prev.map((box, i) =>
                i === index ? { ...box, [field]: value } : box
            )
        );
    };

    const updateContainerField = (
        field: keyof ContainerDimensions,
        value: string
    ) => {
        setContainerDimensions((prev) => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        const length = convertToMeters(
            Number(containerDimensions.length),
            containerDimensions.unit
        );
        const width = convertToMeters(
            Number(containerDimensions.width),
            containerDimensions.unit
        );
        const height = convertToMeters(
            Number(containerDimensions.height),
            containerDimensions.unit
        );

        const containerVolume = length * width * height;
        setContainerVolume(Number(containerVolume.toFixed(6)));
    }, [
        containerDimensions.length,
        containerDimensions.width,
        containerDimensions.height,
        containerDimensions.unit,
    ]);

    useEffect(() => {
        let totalVolume = 0;
        let totalWeight = 0;

        const volumes = boxDimensions.map((box) => {
            const length = convertToMeters(Number(box.length), box.unit);
            const width = convertToMeters(Number(box.width), box.unit);
            const height = convertToMeters(Number(box.height), box.unit);
            const volume = length * width * height;
            const boxVolume = volume * (Number(box.quantity) || 1);
            const boxWeight = (Number(box.weight) || 0) * (Number(box.quantity) || 1);
            totalVolume += boxVolume;
            totalWeight += boxWeight;
            return isNaN(volume) ? 0 : Number(volume.toFixed(6));
        });
        setBoxVolumes(volumes);
        setTotalBoxVolume(Number(totalVolume.toFixed(3)));
        setTotalBoxWeight(Number(totalWeight.toFixed(3)));
    }, [boxDimensions]);

    const setValuesInContainer = (dimension: {
        length: number;
        width: number;
        height: number;
    }) => {
        setContainerDimensions((prev) => ({
            ...prev,
            length: dimension.length.toString(),
            width: dimension.width.toString(),
            height: dimension.height.toString(),
        }));
    };

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // Scene setup
        const scene = sceneRef.current;
        scene.background = new THREE.Color(0xf0f0f0);

        // Camera setup
        cameraRef.current = new THREE.PerspectiveCamera(
            75,
            mount.clientWidth / mount.clientHeight,
            0.1,
            1000
        );
        cameraRef.current.position.set(5, 5, 5);

        // Renderer setup
        rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
        rendererRef.current.setSize(mount.clientWidth, mount.clientHeight);
        mount.appendChild(rendererRef.current.domElement);

        // Controls setup
        controlsRef.current = new OrbitControls(
            cameraRef.current,
            rendererRef.current.domElement
        );
        controlsRef.current.enableDamping = true;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 5);
        scene.add(directionalLight);

        const animate = () => {
            requestAnimationFrame(animate);
            controlsRef.current?.update();
            rendererRef.current?.render(scene, cameraRef.current as THREE.PerspectiveCamera);
        };
        animate();

        const handleResize = () => {
            if (mount && cameraRef.current && rendererRef.current) {
                cameraRef.current.aspect = mount.clientWidth / mount.clientHeight;
                cameraRef.current.updateProjectionMatrix();
                rendererRef.current.setSize(mount.clientWidth, mount.clientHeight);
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            if (mount && rendererRef.current) {
                mount.removeChild(rendererRef.current.domElement);
            }
        };
    }, []);

    useEffect(() => {
        const scene = sceneRef.current;
        // Clear previous objects
        while (scene.children.length > 2) { // Keep lights
            scene.remove(scene.children[2]);
        }

        const cl = convertToMeters(Number(containerDimensions.length), containerDimensions.unit);
        const cw = convertToMeters(Number(containerDimensions.width), containerDimensions.unit);
        const ch = convertToMeters(Number(containerDimensions.height), containerDimensions.unit);

        if (cl > 0 && cw > 0 && ch > 0) {
            // Container
            const containerGeometry = new THREE.BoxGeometry(cl, ch, cw);
            const edges = new THREE.EdgesGeometry(containerGeometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
            const containerMaterial = new THREE.MeshStandardMaterial({
                color: 0xadd8e6,
                transparent: true,
                opacity: 0.2,
            });
            const containerMesh = new THREE.Mesh(containerGeometry, containerMaterial);
            containerMesh.add(line);
            scene.add(containerMesh);


            // Boxes
            const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0x00ffff, 0xff00ff];
            let currentX = -cl / 2;
            let currentY = -ch / 2;
            let currentZ = -cw / 2;
            let rowHeight = 0;

            boxDimensions.forEach((box, index) => {
                const bl = convertToMeters(Number(box.length), box.unit);
                const bw = convertToMeters(Number(box.width), box.unit);
                const bh = convertToMeters(Number(box.height), box.unit);
                const quantity = Number(box.quantity) || 0;

                if (bl > 0 && bw > 0 && bh > 0 && quantity > 0) {
                    const boxGeometry = new THREE.BoxGeometry(bl, bh, bw);
                    const boxMaterial = new THREE.MeshStandardMaterial({ color: colors[index % colors.length] });

                    for (let i = 0; i < quantity; i++) {

                        if (currentX + bl / 2 > cl / 2) {
                            currentX = -cl / 2;
                            currentZ += bw;
                        }

                        if (currentZ + bw / 2 > cw / 2) {
                            currentX = -cl / 2;
                            currentZ = -cw / 2;
                            currentY += rowHeight;
                            rowHeight = 0;
                        }

                        if (currentY + bh / 2 > ch / 2) {
                            console.warn("Not enough space for all boxes");
                            break;
                        }


                        const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
                        boxMesh.position.set(currentX + bl / 2, currentY + bh / 2, currentZ + bw / 2);
                        scene.add(boxMesh);
                        currentX += bl;
                        rowHeight = Math.max(rowHeight, bh);
                    }
                }
            });
        }
        if (cameraRef.current) {
            const maxDim = Math.max(cl, cw, ch) || 5;
            cameraRef.current.position.set(maxDim * 1.5, maxDim * 1.5, maxDim * 1.5);
            cameraRef.current.lookAt(0, 0, 0);
            if (controlsRef.current) {
                controlsRef.current.update();
            }
        }


    }, [containerDimensions, boxDimensions]);


    return (
        <div className="h-full w-full relative flex text-black justify-between overflow-x-hidden">
            {/* Background */}
            <img
                src="./Background.png"
                alt="background"
                className="w-full h-full object-cover bg-white absolute top-0 left-0"
            />

            {/* Sidebar Left */}
            <div className={`sidebar ${leftSideBar ? "translate-x-0" : "-translate-x-64"} w-46 md:w-64 transition-all duration-300 ease-in bg-white h-screen z-10 py-5 overflow-y-auto relative`}>
                <h1 className="text-2xl font-semibold px-5">📦 BoxLogic</h1>
                <div className="flex justify-between items-center mt-5 px-5">
                    <p className="text-md">Box Dimensions</p>
                    <button
                        onClick={addBox}
                        className="text-2xl w-10 h-10 flex justify-center items-center rounded-full hover:bg-gray-100 cursor-pointer text-black"
                    >
                        +
                    </button>
                </div>

                {/* Render Each Box */}
                <div className="mt-3 mb-10 px-5">
                    {boxDimensions.map((box, index) => (
                        <div key={index} className="rounded-md py-1 bg-white">
                            {/* Header */}
                            <div className="flex justify-between items-center">
                                <p className="font-medium">BOX {index + 1}</p>
                                <p className="text-sm text-gray-400">
                                    {box.length || "L"} x {box.width || "W"} x {box.height || "H"}
                                </p>
                                {box.collapsed ? (
                                    <svg onClick={() => toggleCollapse(index)} xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                ) : (
                                    <svg onClick={() => toggleCollapse(index)} xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                    </svg>
                                )}
                            </div>

                            {/* Collapsible Content */}
                            {!box.collapsed && (
                                <div className="mt-3 space-y-3 transition-all duration-300 ease-in-out">
                                    {/* Length */}
                                    <div className="flex border border-gray-300 rounded-md px-2 py-1 text-sm">
                                        <input
                                            type="number"
                                            placeholder="L*"
                                            className="outline-none w-full"
                                            value={box.length}
                                            onChange={(e) =>
                                                updateBoxField(index, "length", e.target.value)
                                            }
                                        />
                                        <select
                                            className="ml-2 outline-none"
                                            value={box.unit}
                                            onChange={(e) =>
                                                updateBoxField(index, "unit", e.target.value)
                                            }
                                        >
                                            <option value="m">m</option>
                                            <option value="cm">cm</option>
                                            <option value="mm">mm</option>
                                            <option value="in">in</option>
                                        </select>
                                    </div>

                                    {/* Width */}
                                    <div className="flex border border-gray-300 rounded-md px-2 py-1 text-sm">
                                        <input
                                            type="number"
                                            placeholder="W*"
                                            className="outline-none w-full"
                                            value={box.width}
                                            onChange={(e) =>
                                                updateBoxField(index, "width", e.target.value)
                                            }
                                        />
                                        <select
                                            className="ml-2 outline-none"
                                            value={box.unit}
                                            onChange={(e) =>
                                                updateBoxField(index, "unit", e.target.value)
                                            }
                                        >
                                            <option value="m">m</option>
                                            <option value="cm">cm</option>
                                            <option value="mm">mm</option>
                                            <option value="in">in</option>
                                        </select>
                                    </div>

                                    {/* Height */}
                                    <div className="flex border border-gray-300 rounded-md px-2 py-1 text-sm">
                                        <input
                                            type="number"
                                            placeholder="H*"
                                            className="outline-none w-full"
                                            value={box.height}
                                            onChange={(e) =>
                                                updateBoxField(index, "height", e.target.value)
                                            }
                                        />
                                        <select
                                            className="ml-2 outline-none"
                                            value={box.unit}
                                            onChange={(e) =>
                                                updateBoxField(index, "unit", e.target.value)
                                            }
                                        >
                                            <option value="m">m</option>
                                            <option value="cm">cm</option>
                                            <option value="mm">mm</option>
                                            <option value="in">in</option>
                                        </select>
                                    </div>

                                    <input
                                        type="number"
                                        placeholder="Weight"
                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                        value={box.weight}
                                        onChange={(e) =>
                                            updateBoxField(index, "weight", e.target.value)
                                        }
                                    />
                                    <input
                                        type="number"
                                        placeholder="Quantity"
                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                        value={box.quantity}
                                        onChange={(e) =>
                                            updateBoxField(index, "quantity", e.target.value)
                                        }
                                    />
                                    <label className="flex gap-2 items-center">
                                        <input
                                            type="checkbox"
                                            checked={box.rotation}
                                            onChange={(e) =>
                                                updateBoxField(index, "rotation", e.target.checked)
                                            }
                                        />
                                        Enable Rotation
                                    </label>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="py-2 w-full px-5 sticky -bottom-5 bg-white">
                    <button className="bg-blue-400 hover:bg-blue-500 text-white cursor-pointer py-2 w-full rounded-md">
                        Update
                    </button>
                </div>
            </div>

            {/* Middle Section */}
            <div className="relative grow h-screen flex">
                {/* Left Sidebar Toggle */}
                <button
                    className={`absolute z-50 top-[50%] md:hidden -translate-y-[50%] w-10 h-40 transition-all duration-300 ease-in-out
          ${leftSideBar ? "left-0" : "-left-64"}`}
                    onClick={() => setLeftSideBar(!leftSideBar)}
                >
                    <img src="./LeftSideBar.png" alt="" className="w-[75%] object-contain" />
                </button>
                {/* Right Sidebar Toggle */}
                <button
                    className={`absolute z-50 top-[50%] md:hidden -translate-y-[50%] w-10 h-40 transition-all duration-300 ease-in-out
          ${rightSideBar ? "right-0" : "-right-64"}`}
                    onClick={() => setRightSetBar(!rightSideBar)}
                >
                    <img src="./RightSideBar.png" alt="" className="w-full h-full object-contain" />
                </button>
                {/* Main Container */}
                <div className="w-full h-full flex flex-col">
                    <div className="w-full h-40 relative">
                        <div className="w-[65%] mx-0 absolute top-5 flex flex-col gap-3 text-white font-semibold p-3 rounded-md">
                            <div className="flex overflow-x-auto sidebar">
                                {boxDimensions.map((box, i) => (
                                    <div key={i} className="text-black flex-shrink-0 flex flex-col items-center text-sm">
                                        <p className="text-sm">Total:{Number(box.length) * Number(box.width) * Number(box.height)}{box.unit}</p>
                                        <img src="./Box.png" alt="box" className="w-[40%] object-contain" />
                                        <p className="text-sm">Weight: {Number(box.weight) * Number(box.quantity) || box.weight}kg</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="min-w-56 min-h-26 bg-white border-2 flex flex-col border-gray-300 rounded-md absolute top-5 right-5 px-3 py-3 text-sm justify-center gap-2 font-semibold overflow-auto sidebar">
                            <p>Container Volume: {containerVolume} m³</p>
                            {boxVolumes.map((volume, i) => (
                                <p key={i}>Box {i + 1} Volume (pcs): {volume} m³</p>
                            ))}
                            <p>Total Container Required:</p>
                        </div>
                    </div>

                    <div ref={mountRef} className="grow">
                        {/* 3D container will be rendered here */}
                    </div>
                </div>
            </div>


            {/* Sidebar Right */}
            <div className={`sidebar ${rightSideBar ? "translate-x-0" : "translate-x-64"} w-46 md:w-64 bg-white h-screen z-10 py-5 px-3 overflow-auto`}>
                <div className="flex justify-end">
                    <button className="border border-gray-300 hover:bg-gray-100 cursor-pointer px-5 py-1 rounded-md flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export
                    </button>
                </div>

                <div className="py-2">
                    <h1 className="text-md font-semibold">Container Dimensions</h1>
                    <div className="flex flex-col justify-between items-center mt-2 gap-3">
                        {/* Length */}
                        <div className="flex bg-white w-full border border-gray-300 rounded-md px-2 py-1 text-sm">
                            <input
                                type="text"
                                placeholder="L*"
                                className="outline-none"
                                value={containerDimensions.length}
                                onChange={(e) =>
                                    updateContainerField("length", e.target.value)
                                }
                            />
                            <select
                                className="ml-3 outline-none"
                                value={containerDimensions.unit}
                                onChange={(e) => updateContainerField("unit", e.target.value)}
                            >
                                <option value="m">m</option>
                                <option value="cm">cm</option>
                                <option value="mm">mm</option>
                                <option value="in">in</option>
                            </select>
                        </div>

                        {/* Width */}
                        <div className="flex bg-white w-full border border-gray-300 rounded-md px-2 py-1 text-sm">
                            <input
                                type="text"
                                placeholder="W*"
                                className="outline-none"
                                value={containerDimensions.width}
                                onChange={(e) =>
                                    updateContainerField("width", e.target.value)
                                }
                            />
                            <select
                                className="ml-3 outline-none"
                                value={containerDimensions.unit}
                                onChange={(e) => updateContainerField("unit", e.target.value)}
                            >
                                <option value="m">m</option>
                                <option value="cm">cm</option>
                                <option value="mm">mm</option>
                                <option value="in">in</option>
                            </select>
                        </div>

                        {/* Height */}
                        <div className="flex bg-white w-full border border-gray-300 rounded-md px-2 py-1 text-sm">
                            <input
                                type="text"
                                placeholder="H*"
                                className="outline-none"
                                value={containerDimensions.height}
                                onChange={(e) =>
                                    updateContainerField("height", e.target.value)
                                }
                            />
                            <select
                                className="ml-3 outline-none"
                                value={containerDimensions.unit}
                                onChange={(e) => updateContainerField("unit", e.target.value)}
                            >
                                <option value="m">m</option>
                                <option value="cm">cm</option>
                                <option value="mm">mm</option>
                                <option value="in">in</option>
                            </select>
                        </div>

                        <input
                            type="text"
                            placeholder="Max Capacity"
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                            value={containerDimensions.maxCapacity}
                            onChange={(e) =>
                                updateContainerField("maxCapacity", e.target.value)
                            }
                        />

                        <select
                            name="fit"
                            id="fit"
                            value={containerDimensions.fit}
                            onChange={(e) => updateContainerField("fit", e.target.value)}
                            className="w-full py-1 outline-none border border-gray-300 rounded-md px-1"
                        >
                            <option value="bestFit" defaultChecked>
                                Best Fit
                            </option>
                            <option value="BiggerFirst">Bigger First</option>
                        </select>
                        <button className="bg-blue-400 hover:bg-blue-500 text-white cursor-pointer w-full py-2 rounded-md">
                            Update
                        </button>
                    </div>
                </div>

                <div className="mt-2">
                    <h1 className="font-semibold text-md">Standard Dimensions (meters)</h1>
                    <div className="py-3">
                        {defaultBoxes.map((dimension, index) => (
                            <div
                                key={index}
                                className="flex justify-between items-center text-sm mt-1 hover:bg-gray-100 py-1 rounded-md px-2 cursor-pointer"
                                onClick={() => setValuesInContainer(dimension)}
                            >
                                <p>{dimension.box}</p>
                                <p>
                                    {dimension.length}*{dimension.width}*{dimension.height}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BoxUI;

